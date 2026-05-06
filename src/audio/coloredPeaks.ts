// 多频段染色：用 STFT 同时计算
//   - centroid（频谱重心 → 单 hue 映射，"map" 模式）
//   - low/mid/high 三频段能量（→ R/G/B 直接映射，"multiband" 模式）

import { FFT, hannWindow } from './fft';

const FFT_SIZE = 2048;

// hue 映射（map 模式）
const HUE_MIN_FREQ = 200;
const HUE_MAX_FREQ = 6000;
const HUE_AT_MIN   = 240;
const HUE_AT_MAX   = 0;

// 三频段切分（multiband 模式）
const LOW_HZ  = 250;     // < 250Hz 视为低频
const HIGH_HZ = 2500;    // > 2500Hz 视为高频；中间为中频

export interface ColoredPeaks {
  min: Float32Array;
  max: Float32Array;
  /** centroid 单 hue 染色（hsl 字符串） */
  colorsCentroid: string[];
  /** RGB 三频段叠加染色（rgb 字符串），低=蓝/中=绿/高=红 */
  colorsRgb: string[];
  centroids: Float32Array;
}

export function computeColoredPeaks(buf: AudioBuffer, N: number): ColoredPeaks {
  const sr = buf.sampleRate;
  const ch0 = buf.getChannelData(0);
  const ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : ch0;

  const mono = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) mono[i] = (ch0[i] + ch1[i]) * 0.5;

  const fft = new FFT(FFT_SIZE);
  const win = hannWindow(FFT_SIZE);
  const fftIn = new Float32Array(FFT_SIZE);
  const fftOut = new Float32Array(FFT_SIZE * 2);

  const samplesPerSlot = buf.length / N;
  const min = new Float32Array(N);
  const max = new Float32Array(N);
  const colorsCentroid: string[] = new Array(N);
  const colorsRgb: string[] = new Array(N);
  const centroids = new Float32Array(N);

  const halfFFT = FFT_SIZE >> 1;
  const lo = Math.log2(HUE_MIN_FREQ);
  const hi = Math.log2(HUE_MAX_FREQ);

  // 频段对应的 FFT bin 范围
  const lowBinMax  = Math.floor(LOW_HZ  * FFT_SIZE / sr);
  const highBinMin = Math.ceil (HIGH_HZ * FFT_SIZE / sr);

  for (let i = 0; i < N; i++) {
    const sStart = Math.floor(i * samplesPerSlot);
    const sEnd   = Math.min(buf.length, Math.floor((i + 1) * samplesPerSlot));

    let mn = 0, mx = 0;
    for (let j = sStart; j < sEnd; j++) {
      const v = mono[j];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    min[i] = mn; max[i] = mx;

    // STFT
    const center = (sStart + sEnd) >> 1;
    const fftStart = center - (FFT_SIZE >> 1);
    for (let k = 0; k < FFT_SIZE; k++) {
      const idx = fftStart + k;
      const v = (idx >= 0 && idx < buf.length) ? mono[idx] : 0;
      fftIn[k] = v * win[k];
    }
    fft.forward(fftIn, fftOut);

    // 同时计算 centroid 和 三频段能量
    let weight = 0, energy = 0;
    let lowE = 0, midE = 0, highE = 0;
    for (let k = 1; k < halfFFT; k++) {
      const re = fftOut[k * 2];
      const im = fftOut[k * 2 + 1];
      const mag2 = re * re + im * im;
      const f = k * sr / FFT_SIZE;
      weight += f * mag2;
      energy += mag2;
      if (k <= lowBinMax) lowE += mag2;
      else if (k >= highBinMin) highE += mag2;
      else midE += mag2;
    }
    const centroid = energy > 1e-12 ? weight / energy : HUE_MIN_FREQ;
    centroids[i] = centroid;

    // ===== map 模式：log2(centroid) → hue =====
    {
      const cClamp = Math.max(HUE_MIN_FREQ, Math.min(HUE_MAX_FREQ, centroid));
      const t = (Math.log2(cClamp) - lo) / (hi - lo);
      const hue = HUE_AT_MIN + (HUE_AT_MAX - HUE_AT_MIN) * t;
      const rms = Math.sqrt(energy / halfFFT) * 1e2;
      const sat = Math.round(60 + Math.min(30, rms * 8));
      colorsCentroid[i] = `hsl(${hue.toFixed(0)},${sat}%,55%)`;
    }

    // ===== multiband 模式：低/中/高 → B/G/R =====
    {
      // sqrt 转线性幅度
      const lA = Math.sqrt(lowE);
      const mA = Math.sqrt(midE);
      const hA = Math.sqrt(highE);
      const peak = Math.max(lA, mA, hA, 1e-9);
      // 归一化到 0..1，再用一个非线性曲线让低能量频段也能可见
      const lN = Math.pow(lA / peak, 0.7);
      const mN = Math.pow(mA / peak, 0.7);
      const hN = Math.pow(hA / peak, 0.7);
      // 直接映射 R/G/B（高=红、中=绿、低=蓝）
      const r = Math.round(hN * 255);
      const g = Math.round(mN * 255);
      const b = Math.round(lN * 255);
      colorsRgb[i] = `rgb(${r},${g},${b})`;
    }
  }

  return { min, max, colorsCentroid, colorsRgb, centroids };
}
