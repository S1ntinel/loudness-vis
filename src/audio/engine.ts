// 音频引擎单例：AudioContext + 信号链 + 播放控制
// 不绑定 React 状态。React 端通过 useAudioStore 订阅"对外可见状态"。

import { computeColoredPeaks, type ColoredPeaks } from './coloredPeaks';
import { computeLufs, shortTermLufsAt, type LufsResult } from './lufs';

export interface WaveformPeaks {
  min: Float32Array;
  max: Float32Array;
}

export type ColorMode = 'mono' | 'multiband';

type AnalyzerBuffer = Float32Array<ArrayBuffer>;

class AudioEngine {
  ctx: AudioContext;
  splitter: ChannelSplitterNode;
  lAna: AnalyserNode;
  rAna: AnalyserNode;
  specAna: AnalyserNode;
  gainNode: GainNode;

  // 实时分析的 buffer（提前分配）
  lBuf: AnalyzerBuffer;
  rBuf: AnalyzerBuffer;
  specBuf: AnalyzerBuffer;

  // 当前音频状态
  audioBuffer: AudioBuffer | null = null;
  source: AudioBufferSourceNode | null = null;
  isPlaying = false;
  pauseOffset = 0;
  startTime = 0;
  waveformPeaks: WaveformPeaks | null = null;
  coloredPeaks: ColoredPeaks | null = null;
  lufsResult: LufsResult | null = null;
  colorMode: ColorMode = 'multiband';

  // 状态变化回调（zustand store 订阅）
  private listeners: Set<() => void> = new Set();

  constructor() {
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    this.ctx = new Ctor();

    this.splitter = this.ctx.createChannelSplitter(2);
    this.lAna = this.ctx.createAnalyser();
    this.rAna = this.ctx.createAnalyser();
    this.specAna = this.ctx.createAnalyser();
    this.gainNode = this.ctx.createGain();

    this.lAna.fftSize = 2048;
    this.rAna.fftSize = 2048;
    this.specAna.fftSize = 4096;
    this.specAna.smoothingTimeConstant = 0.7;
    this.gainNode.gain.value = 0.6;

    this.splitter.connect(this.lAna, 0);
    this.splitter.connect(this.rAna, 1);
    this.splitter.connect(this.specAna, 0);
    this.gainNode.connect(this.ctx.destination);

    this.lBuf = new Float32Array(this.lAna.fftSize);
    this.rBuf = new Float32Array(this.rAna.fftSize);
    this.specBuf = new Float32Array(this.specAna.frequencyBinCount);
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private notify(): void {
    this.listeners.forEach(fn => fn());
  }

  async loadFile(file: File): Promise<{ ok: boolean; error?: string }> {
    try {
      const arr = await file.arrayBuffer();
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.audioBuffer = await this.ctx.decodeAudioData(arr);
      this.pauseOffset = 0;
      // 同步预计算（biquad 在 V8 下足够快，~200ms / 4分钟歌）
      this.coloredPeaks = computeColoredPeaks(this.audioBuffer, 2000);
      this.waveformPeaks = { min: this.coloredPeaks.min, max: this.coloredPeaks.max };
      this.lufsResult = computeLufs(this.audioBuffer);
      this.stopSource();
      this.startInternal();
      this.notify();
      return { ok: true };
    } catch (e: any) {
      this.audioBuffer = null;
      this.coloredPeaks = null;
      this.waveformPeaks = null;
      this.lufsResult = null;
      this.notify();
      return { ok: false, error: e?.message || String(e) };
    }
  }

  /** 直接注入 AudioBuffer（dev 测试用） */
  loadAudioBuffer(buf: AudioBuffer): void {
    this.audioBuffer = buf;
    this.pauseOffset = 0;
    this.coloredPeaks = computeColoredPeaks(buf, 2000);
    this.waveformPeaks = { min: this.coloredPeaks.min, max: this.coloredPeaks.max };
    this.lufsResult = computeLufs(buf);
    this.stopSource();
    this.startInternal();
    this.notify();
  }

  /** 切换波形染色模式 */
  setColorMode(m: ColorMode): void {
    this.colorMode = m;
    this.notify();
  }

  /** 当前位置的 short-term LUFS（最近 3 秒） */
  getShortTermLufs(): number {
    if (!this.lufsResult || !this.audioBuffer) return -Infinity;
    return shortTermLufsAt(this.lufsResult.blocks, this.lufsResult.hopSec, this.getCurrentTime(), 3);
  }

  private stopSource(): void {
    if (this.source) {
      this.source.onended = null;
      try { this.source.stop(); } catch (_) { /* noop */ }
      this.source.disconnect();
      this.source = null;
    }
  }

  private startInternal(): void {
    if (!this.audioBuffer) return;
    this.stopSource();
    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.splitter);
    this.source.connect(this.gainNode);
    this.source.start(0, this.pauseOffset);
    this.startTime = this.ctx.currentTime - this.pauseOffset;
    this.isPlaying = true;
    this.source.onended = () => {
      this.isPlaying = false;
      this.pauseOffset = 0;
      this.notify();
    };
  }

  play(): void {
    if (!this.audioBuffer) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.startInternal();
    this.notify();
  }

  pause(): void {
    if (!this.isPlaying) return;
    this.pauseOffset = this.ctx.currentTime - this.startTime;
    if (this.audioBuffer && this.pauseOffset >= this.audioBuffer.duration) this.pauseOffset = 0;
    this.stopSource();
    this.isPlaying = false;
    this.notify();
  }

  toggle(): void {
    if (!this.audioBuffer) return;
    if (this.isPlaying) this.pause();
    else this.play();
  }

  /** 跳到时间点。如果之前在播放，从新位置继续；否则只更新 pauseOffset。 */
  seek(timeSec: number, keepPlayingState = true): void {
    if (!this.audioBuffer) return;
    const t = Math.max(0, Math.min(this.audioBuffer.duration - 0.05, timeSec));
    const wasPlaying = this.isPlaying;
    this.pauseOffset = t;
    if (wasPlaying && keepPlayingState) {
      this.startInternal();
    } else {
      this.stopSource();
      this.isPlaying = false;
    }
    this.notify();
  }

  /** 拖动跳转：mousedown 时调用 — 暂停且记录是否本来就在播放 */
  beginScrub(): boolean {
    const wasPlaying = this.isPlaying;
    if (this.isPlaying) {
      this.pauseOffset = this.ctx.currentTime - this.startTime;
      if (this.audioBuffer && this.pauseOffset >= this.audioBuffer.duration) this.pauseOffset = 0;
      this.stopSource();
      this.isPlaying = false;
      this.notify();
    }
    return wasPlaying;
  }

  /** 拖动中：直接更新位置 */
  scrub(timeSec: number): void {
    if (!this.audioBuffer) return;
    this.pauseOffset = Math.max(0, Math.min(this.audioBuffer.duration - 0.05, timeSec));
    this.notify();
  }

  /** 拖动结束：根据起拖时是否在播放决定恢复 */
  endScrub(wasPlaying: boolean): void {
    if (wasPlaying) this.play();
    else this.notify();
  }

  setVolume(v: number): void {
    this.gainNode.gain.value = v;
  }

  /** 当前播放进度 0..1（即使暂停也能反映 pauseOffset）*/
  getProgress(): number {
    if (!this.audioBuffer) return 0;
    let t = this.pauseOffset;
    if (this.isPlaying) t = this.ctx.currentTime - this.startTime;
    return Math.max(0, Math.min(1, t / this.audioBuffer.duration));
  }

  getCurrentTime(): number {
    if (!this.audioBuffer) return 0;
    if (this.isPlaying) return this.ctx.currentTime - this.startTime;
    return this.pauseOffset;
  }
}

export const engine = new AudioEngine();

// dev 期暴露给 console，便于调试
if (import.meta.env?.DEV) {
  (window as any).__engine = engine;
}
