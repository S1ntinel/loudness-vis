// 多频段染色：用 STFT + 频谱重心（spectral centroid）映射 hue
// - 比 biquad cascade 减法更准确（无相位误差）
// - 直接对应"频谱重心"语义：声音的"亮度"
// - log2 尺度映射，让流行音乐常见 centroid (500-3000 Hz) 也能拉出全色差

import { FFT, hannWindow } from './fft';

const FFT_SIZE = 2048;

// hue 映射区间（centroid 的 log2 尺度）
const HUE_MIN_FREQ = 200;     // ≤ 200Hz → 最蓝
const HUE_MAX_FREQ = 6000;    // ≥ 6kHz → 最红
const HUE_AT_MIN   = 240;     // 蓝紫
const HUE_AT_MAX   = 0;       // 红

export interface ColoredPeaks {
  min: Float32Array;
  max: Float32Array;
  /** 每柱的色相字符串 hsl(h, s%, l%) */
  colors: string[];
  /** 调试：每柱的 centroid Hz */
  centroids: Float32Array;
}

export function computeColoredPeaks(buf: AudioBuffer, N: number): ColoredPeaks {
  const sr = buf.sampleRate;
  const ch0 = buf.getChannelData(0);
  const ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : ch0;

  // 单声道
  const mono = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) mono[i] = (ch0[i] + ch1[i]) * 0.5;

  const fft = new FFT(FFT_SIZE);
  const win = hannWindow(FFT_SIZE);
  const fftIn = new Float32Array(FFT_SIZE);
  const fftOut = new Float32Array(FFT_SIZE * 2);

  const samplesPerSlot = buf.length / N;
  const min = new Float32Array(N);
  const max = new Float32Array(N);
  const colors: string[] = new Array(N);
  const centroids = new Float32Array(N);

  const halfFFT = FFT_SIZE >> 1;
  const lo = Math.log2(HUE_MIN_FREQ);
  const hi = Math.log2(HUE_MAX_FREQ);

  for (let i = 0; i < N; i++) {
    const sStart = Math.floor(i * samplesPerSlot);
    const sEnd   = Math.min(buf.length, Math.floor((i + 1) * samplesPerSlot));

    // 时域 min/max（用于柱高）
    let mn = 0, mx = 0;
    for (let j = sStart; j < sEnd; j++) {
      const v = mono[j];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    min[i] = mn; max[i] = mx;

    // STFT 窗口：以柱中心为中心，对 FFT_SIZE 样本做 FFT
    const center = (sStart + sEnd) >> 1;
    const fftStart = center - (FFT_SIZE >> 1);
    for (let k = 0; k < FFT_SIZE; k++) {
      const idx = fftStart + k;
      const v = (idx >= 0 && idx < buf.length) ? mono[idx] : 0;
      fftIn[k] = v * win[k];
    }
    fft.forward(fftIn, fftOut);

    // 频谱重心
    let weight = 0, energy = 0;
    for (let k = 1; k < halfFFT; k++) {
      const re = fftOut[k * 2];
      const im = fftOut[k * 2 + 1];
      const mag2 = re * re + im * im;
      const f = k * sr / FFT_SIZE;
      weight += f * mag2;
      energy += mag2;
    }
    const centroid = energy > 1e-12 ? weight / energy : HUE_MIN_FREQ;
    centroids[i] = centroid;

    // log2 频率 → hue（限到 [HUE_MIN_FREQ, HUE_MAX_FREQ]）
    const cClamp = Math.max(HUE_MIN_FREQ, Math.min(HUE_MAX_FREQ, centroid));
    const t = (Math.log2(cClamp) - lo) / (hi - lo);
    const hue = HUE_AT_MIN + (HUE_AT_MAX - HUE_AT_MIN) * t;

    // 饱和度：能量足够时高，几乎静默时降低
    // 这里用每柱的 RMS 估计，归一化到 [0,1]
    const rms = Math.sqrt(energy / halfFFT) * 1e2;
    const sat = Math.round(60 + Math.min(30, rms * 8));   // 60-90%
    const lit = 55;

    colors[i] = `hsl(${hue.toFixed(0)},${sat}%,${lit}%)`;
  }

  return { min, max, colors, centroids };
}
