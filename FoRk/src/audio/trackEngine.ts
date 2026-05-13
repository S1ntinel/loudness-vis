// 轨道引擎：统一管理录音和上传的音频片段 + 多轨混音播放
import { engine } from './engine';
import { audioBufferToWav } from './wavEncoder';

export interface TrackPeaks {
  min: Float32Array;
  max: Float32Array;
}

export type TrackSource = 'recording' | 'upload';

export interface Track {
  id: string;
  name: string;
  source: TrackSource;
  blob: Blob;
  duration: number;
  audioBuffer: AudioBuffer;
  peaks: TrackPeaks;
  trimStart: number;
  trimEnd: number;
  selected: boolean;
  createdAt: Date;
}

export type PlayState = 'idle' | 'playing' | 'paused';
export type PlayMode = 'preview' | 'multi';

interface PlayCtx {
  mode: PlayMode;
  trackIds: string[];
  startTime: number;        // ctx.currentTime when (re)started
  offset: number;           // 累计已播放时长（秒）
  sources: Map<string, AudioBufferSourceNode>;
}

const PEAKS_N = 600;
const MIN_TRIM_LEN = 0.05;

class TrackEngine {
  ctx: AudioContext;

  // 录音相关
  micStream: MediaStream | null = null;
  micSource: MediaStreamAudioSourceNode | null = null;
  analyser: AnalyserNode;
  scrollBuf: Float32Array;

  recorder: MediaRecorder | null = null;
  chunks: Blob[] = [];
  isRecording = false;
  isPaused = false;
  recordStart = 0;
  recordPausedAt = 0;
  permissionState: 'idle' | 'requesting' | 'granted' | 'denied' = 'idle';

  // 轨道
  tracks: Track[] = [];

  // 播放状态机
  playState: PlayState = 'idle';
  playCtx: PlayCtx | null = null;

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

  // ============ 麦克风 / 录音 ============
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
    this.recorder.start(200);

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
  }

  private async finalizeRecording(): Promise<void> {
    const blob = new Blob(this.chunks, { type: this.recorder?.mimeType || 'audio/webm' });
    this.chunks = [];
    this.isRecording = false;
    this.isPaused = false;
    this.recorder = null;
    this.notify();
    await this.addTrackFromBlob(blob, 'recording', this.suggestRecordingName());
  }

  private suggestRecordingName(): string {
    let n = 1;
    while (this.tracks.some(t => t.name === `录音 ${n}`)) n++;
    return `录音 ${n}`;
  }

  getElapsed(): number {
    if (!this.isRecording) return 0;
    if (this.isPaused) return this.recordPausedAt;
    return this.recordPausedAt + (this.ctx.currentTime - this.recordStart);
  }

  // ============ 加 Track ============
  async addTrackFromBlob(blob: Blob, source: TrackSource, suggestedName?: string): Promise<Track | null> {
    try {
      const arr = await blob.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arr.slice(0));
      const peaks = this.computePeaks(audioBuffer, PEAKS_N);
      const track: Track = {
        id: String(Date.now()) + '_' + Math.floor(Math.random() * 1000),
        name: suggestedName || (source === 'upload' ? '上传 ' + (this.tracks.length + 1) : '录音 ' + (this.tracks.length + 1)),
        source,
        blob,
        duration: audioBuffer.duration,
        audioBuffer,
        peaks,
        trimStart: 0,
        trimEnd: audioBuffer.duration,
        selected: false,
        createdAt: new Date(),
      };
      this.tracks.push(track);
      this.notify();
      return track;
    } catch (e: unknown) {
      console.error('decode failed', e);
      return null;
    }
  }

  async addTrackFromFile(file: File): Promise<Track | null> {
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return this.addTrackFromBlob(file, 'upload', baseName);
  }

  private computePeaks(buf: AudioBuffer, N: number): TrackPeaks {
    const samplesPerSlot = buf.length / N;
    const min = new Float32Array(N);
    const max = new Float32Array(N);
    const ch0 = buf.getChannelData(0);
    const ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : ch0;
    for (let i = 0; i < N; i++) {
      const s = Math.floor(i * samplesPerSlot);
      const e = Math.min(buf.length, Math.floor((i + 1) * samplesPerSlot));
      let mn = 0, mx = 0;
      for (let j = s; j < e; j++) {
        const v = (ch0[j] + ch1[j]) * 0.5;
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
      min[i] = mn; max[i] = mx;
    }
    return { min, max };
  }

  // ============ 操作 Track ============
  rename(id: string, name: string): void {
    const t = this.tracks.find(t => t.id === id);
    if (t) { t.name = name; this.notify(); }
  }

  remove(id: string): void {
    const idx = this.tracks.findIndex(t => t.id === id);
    if (idx >= 0) {
      // 如果正在播这条轨道，先停止
      if (this.playCtx?.trackIds.includes(id)) this.stopPlayback();
      this.tracks.splice(idx, 1);
      this.notify();
    }
  }

  updateTrim(id: string, trimStart: number, trimEnd: number): void {
    const t = this.tracks.find(t => t.id === id);
    if (!t) return;
    let s = Math.max(0, Math.min(t.duration - MIN_TRIM_LEN, trimStart));
    let e = Math.max(s + MIN_TRIM_LEN, Math.min(t.duration, trimEnd));
    if (s !== t.trimStart || e !== t.trimEnd) {
      t.trimStart = s;
      t.trimEnd = e;
      this.notify();
    }
  }

  resetTrim(id: string): void {
    const t = this.tracks.find(t => t.id === id);
    if (!t) return;
    t.trimStart = 0;
    t.trimEnd = t.duration;
    this.notify();
  }

  // ============ 选中 ============
  toggleSelect(id: string): void {
    const t = this.tracks.find(t => t.id === id);
    if (!t) return;
    t.selected = !t.selected;
    this.notify();
  }
  selectAll(): void {
    this.tracks.forEach(t => { t.selected = true; });
    this.notify();
  }
  clearSelection(): void {
    this.tracks.forEach(t => { t.selected = false; });
    this.notify();
  }
  invertSelection(): void {
    this.tracks.forEach(t => { t.selected = !t.selected; });
    this.notify();
  }
  getSelectedCount(): number {
    return this.tracks.reduce((n, t) => n + (t.selected ? 1 : 0), 0);
  }

  // ============ 播放状态机 ============
  /** 单轨试听 toggle：未播 → 播；正播该轨 → 暂停；暂停同轨 → 恢复；其它情况切换到该轨从头播 */
  togglePreview(track: Track): void {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const sameSingle = this.playCtx?.mode === 'preview' && this.playCtx?.trackIds[0] === track.id;
    if (sameSingle && this.playState === 'playing') {
      this.pause();
    } else if (sameSingle && this.playState === 'paused') {
      this.resume();
    } else {
      this.stopPlayback();
      this.startSources('preview', [track.id], 0);
    }
  }

  /** 多轨混音 toggle：未播 → 播放所有 selected；正播 → 暂停；暂停 → 恢复 */
  toggleMulti(): void {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.playCtx?.mode === 'multi' && this.playState === 'playing') {
      this.pause();
      return;
    }
    if (this.playCtx?.mode === 'multi' && this.playState === 'paused') {
      this.resume();
      return;
    }
    const selected = this.tracks.filter(t => t.selected).map(t => t.id);
    if (selected.length === 0) return;
    this.stopPlayback();
    this.startSources('multi', selected, 0);
  }

  pause(): void {
    if (this.playState !== 'playing' || !this.playCtx) return;
    const elapsed = this.ctx.currentTime - this.playCtx.startTime;
    this.playCtx.offset += elapsed;
    this.silenceSources();
    this.playState = 'paused';
    this.notify();
  }

  resume(): void {
    if (this.playState !== 'paused' || !this.playCtx) return;
    const { mode, trackIds, offset } = this.playCtx;
    this.startSources(mode, trackIds, offset);
  }

  stopPlayback(): void {
    this.silenceSources();
    this.playState = 'idle';
    this.playCtx = null;
    this.notify();
  }

  /** 创建新一批 source 节点开始播放（替换当前 ctx） */
  private startSources(mode: PlayMode, trackIds: string[], offset: number): void {
    this.silenceSources();
    const ctx: PlayCtx = {
      mode,
      trackIds,
      startTime: this.ctx.currentTime,
      offset,
      sources: new Map(),
    };
    let started = 0;
    for (const id of trackIds) {
      const t = this.tracks.find(t => t.id === id);
      if (!t) continue;
      const trimDur = t.trimEnd - t.trimStart;
      if (offset >= trimDur - 0.001) continue;
      const src = this.ctx.createBufferSource();
      src.buffer = t.audioBuffer;
      src.connect(this.ctx.destination);
      src.start(0, t.trimStart + offset, trimDur - offset);
      src.onended = () => this.handleSourceEnded(id, src);
      ctx.sources.set(id, src);
      started++;
    }
    if (started === 0) {
      this.playState = 'idle';
      this.playCtx = null;
      this.notify();
      return;
    }
    this.playCtx = ctx;
    this.playState = 'playing';
    this.notify();
  }

  /** 暂停 / 切换轨道时关掉所有 source（不修改 playState/ctx，由调用方处理）*/
  private silenceSources(): void {
    if (!this.playCtx) return;
    for (const src of this.playCtx.sources.values()) {
      src.onended = null;
      try { src.stop(); } catch (_) { /* noop */ }
      src.disconnect();
    }
    this.playCtx.sources.clear();
  }

  private handleSourceEnded(id: string, src: AudioBufferSourceNode): void {
    if (!this.playCtx) return;
    // 防止 stop() 触发的 onended 误删（我们 silenceSources 会先把 onended 设 null）
    if (this.playCtx.sources.get(id) !== src) return;
    src.disconnect();
    this.playCtx.sources.delete(id);
    if (this.playCtx.sources.size === 0) {
      this.playState = 'idle';
      this.playCtx = null;
      this.notify();
    }
  }

  /** 当前是否正在播某轨（含暂停状态）*/
  isInPlayCtx(id: string): boolean {
    return Boolean(this.playCtx?.trackIds.includes(id));
  }

  // ============ 导出片段 ============
  async exportTrim(track: Track): Promise<Blob> {
    const buf = track.audioBuffer;
    const sr = buf.sampleRate;
    const startSample = Math.floor(track.trimStart * sr);
    const endSample   = Math.ceil(track.trimEnd * sr);
    const length      = endSample - startSample;
    const numCh       = buf.numberOfChannels;

    const newBuf = this.ctx.createBuffer(numCh, length, sr);
    for (let c = 0; c < numCh; c++) {
      const slice = new Float32Array(length);
      slice.set(buf.getChannelData(c).subarray(startSample, endSample));
      newBuf.copyToChannel(slice, c);
    }
    return audioBufferToWav(newBuf);
  }
}

export const trackEngine = new TrackEngine();
