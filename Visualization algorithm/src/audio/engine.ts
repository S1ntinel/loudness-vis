// 音频引擎单例：AudioContext + 信号链 + 播放控制
// 不绑定 React 状态。React 端通过 useAudioStore 订阅"对外可见状态"。

import { computeColoredPeaks, type ColoredPeaks } from './coloredPeaks';
import { computeLufs, shortTermLufsAt, type LufsResult } from './lufs';
import { computeAverageSpectrum, type AvgSpectrum } from './avgSpectrum';
import { computeSpectrogram, type Spectrogram } from './spectrogram';

export interface WaveformPeaks {
  min: Float32Array;
  max: Float32Array;
}

export type ColorMode = 'mono' | 'multiband' | 'map';

export interface CompareChannel {
  id: string;
  name: string;
  color: string;
  spectrum: AvgSpectrum;
  visible: boolean;
}

const COMPARE_PALETTE = [
  '#e8a64a', // 橙
  '#4ad8a8', // 青绿
  '#d04ae8', // 紫
  '#e84a8d', // 粉
  '#4ac3e8', // 青蓝
  '#e85d4a', // 红
  '#8da3e8', // 蓝紫
];

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
  spectrogram: Spectrogram | null = null;
  colorMode: ColorMode = 'multiband';

  /** 频响面板叠加显示的对比通道（不影响主音频播放） */
  compareChannels: CompareChannel[] = [];

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
      this.spectrogram = computeSpectrogram(this.audioBuffer);
      this.stopSource();
      this.startInternal();
      this.notify();
      return { ok: true };
    } catch (e: any) {
      this.audioBuffer = null;
      this.coloredPeaks = null;
      this.waveformPeaks = null;
      this.lufsResult = null;
      this.spectrogram = null;
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
    this.spectrogram = computeSpectrogram(buf);
    this.stopSource();
    this.startInternal();
    this.notify();
  }

  /** 切换波形染色模式 */
  setColorMode(m: ColorMode): void {
    this.colorMode = m;
    this.notify();
  }

  // ========== 对比通道 ==========
  addCompareChannel(buf: AudioBuffer, name: string): CompareChannel {
    const spectrum = computeAverageSpectrum(buf, 4096);
    const id = String(Date.now()) + '_' + Math.floor(Math.random() * 1000);
    const usedColors = new Set(this.compareChannels.map(c => c.color));
    const color = COMPARE_PALETTE.find(c => !usedColors.has(c)) || COMPARE_PALETTE[this.compareChannels.length % COMPARE_PALETTE.length];
    const ch: CompareChannel = { id, name, color, spectrum, visible: true };
    this.compareChannels.push(ch);
    this.notify();
    return ch;
  }

  async addCompareFromFile(file: File): Promise<CompareChannel | null> {
    try {
      const arr = await file.arrayBuffer();
      const buf = await this.ctx.decodeAudioData(arr.slice(0));
      return this.addCompareChannel(buf, file.name.replace(/\.[^.]+$/, ''));
    } catch (e) {
      console.error('addCompareFromFile failed', e);
      return null;
    }
  }

  removeCompareChannel(id: string): void {
    const idx = this.compareChannels.findIndex(c => c.id === id);
    if (idx >= 0) {
      this.compareChannels.splice(idx, 1);
      this.notify();
    }
  }

  toggleCompareVisible(id: string): void {
    const c = this.compareChannels.find(c => c.id === id);
    if (c) { c.visible = !c.visible; this.notify(); }
  }

  clearCompareChannels(): void {
    this.compareChannels = [];
    this.notify();
  }

  /** 当前位置的 short-term LUFS（最近 3 秒） */
  getShortTermLufs(): number {
    if (!this.lufsResult || !this.audioBuffer) return -Infinity;
    return shortTermLufsAt(this.lufsResult.blocks, this.lufsResult.hopSec, this.getCurrentTime(), 3);
  }

  /** 当前位置的 momentary LUFS（最近 400ms 一个块） */
  getMomentaryLufs(): number {
    if (!this.lufsResult || !this.audioBuffer) return -Infinity;
    const blocks = this.lufsResult.blocks;
    if (blocks.length === 0) return -Infinity;
    const idx = Math.max(0, Math.min(blocks.length - 1, Math.floor(this.getCurrentTime() / this.lufsResult.hopSec)));
    const ms = blocks[idx];
    if (ms <= 0) return -Infinity;
    return -0.691 + 10 * Math.log10(ms);
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
