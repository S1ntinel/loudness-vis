// 录音引擎：复用 engine.ctx，独立于播放引擎
import { engine } from './engine';

export interface Recording {
  id: string;
  name: string;
  blob: Blob;
  duration: number;
  createdAt: Date;
}

class RecordEngine {
  ctx: AudioContext;
  micStream: MediaStream | null = null;
  micSource: MediaStreamAudioSourceNode | null = null;

  /** 实时滚动用 analyser（独立于播放 analyser） */
  analyser: AnalyserNode;
  /** 实时分析窗口 buffer */
  scrollBuf: Float32Array<ArrayBuffer>;

  recorder: MediaRecorder | null = null;
  chunks: Blob[] = [];
  isRecording = false;
  isPaused = false;
  recordStart = 0;
  recordPausedAt = 0;       // 已累计的暂停前时长
  recordings: Recording[] = [];
  permissionState: 'idle' | 'requesting' | 'granted' | 'denied' = 'idle';

  private listeners = new Set<() => void>();

  constructor() {
    this.ctx = engine.ctx;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0;
    this.scrollBuf = new Float32Array(this.analyser.fftSize);
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }
  private notify() { this.listeners.forEach(fn => fn()); }

  async requestMic(): Promise<boolean> {
    if (this.micStream) return true;
    this.permissionState = 'requesting';
    this.notify();
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      this.micSource = this.ctx.createMediaStreamSource(this.micStream);
      this.micSource.connect(this.analyser);
      // 不连 destination，避免回声
      this.permissionState = 'granted';
      this.notify();
      return true;
    } catch (e) {
      console.error('mic denied', e);
      this.permissionState = 'denied';
      this.notify();
      return false;
    }
  }

  async startRecording(): Promise<void> {
    const ok = await this.requestMic();
    if (!ok || !this.micStream) return;

    this.chunks = [];
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    this.recorder = new MediaRecorder(this.micStream, { mimeType: mime });
    this.recorder.ondataavailable = e => { if (e.data.size > 0) this.chunks.push(e.data); };
    this.recorder.onstop = () => this.finalizeRecording();
    this.recorder.start(200);   // 每 200ms 触发一次 dataavailable

    this.isRecording = true;
    this.isPaused = false;
    this.recordStart = this.ctx.currentTime;
    this.recordPausedAt = 0;
    this.notify();
  }

  pauseRecording(): void {
    if (!this.recorder || !this.isRecording || this.isPaused) return;
    this.recorder.pause();
    this.recordPausedAt += this.ctx.currentTime - this.recordStart;
    this.isPaused = true;
    this.notify();
  }

  resumeRecording(): void {
    if (!this.recorder || !this.isRecording || !this.isPaused) return;
    this.recorder.resume();
    this.recordStart = this.ctx.currentTime;
    this.isPaused = false;
    this.notify();
  }

  stopRecording(): void {
    if (!this.recorder || !this.isRecording) return;
    this.recorder.stop();
    // finalize 在 onstop 回调里
  }

  private finalizeRecording(): void {
    const blob = new Blob(this.chunks, { type: this.recorder?.mimeType || 'audio/webm' });
    const elapsed = this.recordPausedAt + (this.isPaused ? 0 : this.ctx.currentTime - this.recordStart);
    this.recordings.push({
      id: String(Date.now()),
      name: '录音 ' + (this.recordings.length + 1),
      blob,
      duration: elapsed,
      createdAt: new Date(),
    });
    this.chunks = [];
    this.isRecording = false;
    this.isPaused = false;
    this.recorder = null;
    this.notify();
  }

  /** 当前录制时长（秒） */
  getElapsed(): number {
    if (!this.isRecording) return 0;
    if (this.isPaused) return this.recordPausedAt;
    return this.recordPausedAt + (this.ctx.currentTime - this.recordStart);
  }

  rename(id: string, name: string): void {
    const r = this.recordings.find(r => r.id === id);
    if (r) { r.name = name; this.notify(); }
  }

  remove(id: string): void {
    const idx = this.recordings.findIndex(r => r.id === id);
    if (idx >= 0) {
      this.recordings.splice(idx, 1);
      this.notify();
    }
  }

  /** 取消麦克风权限并断开 */
  release(): void {
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    this.permissionState = 'idle';
    this.notify();
  }
}

export const recordEngine = new RecordEngine();
