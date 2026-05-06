// 整曲 STFT 频谱图（Spectrogram）预计算
// 输出 timeBins × freqBins 的 dB 矩阵 → 0..255 灰度，便于 ImageData 渲染

import { FFT, hannWindow } from './fft';

export interface Spectrogram {
  /** 扁平 2D：[t * freqBins + f]，0..255（灰度） */
  data: Uint8ClampedArray;
  timeBins: number;
  freqBins: number;
  fftSize: number;
  sampleRate: number;
  /** 用于绘制颜色映射的 dB 范围下限 */
  dbFloor: number;
  /** 用于绘制颜色映射的 dB 范围上限 */
  dbCeil: number;
}

const DB_FLOOR = -85;
const DB_CEIL  = -10;

export function computeSpectrogram(buf: AudioBuffer, fftSize = 1024, timeBins = 1500): Spectrogram {
  const half = fftSize >> 1;
  const fft = new FFT(fftSize);
  const win = hannWindow(fftSize);
  const ch0 = buf.getChannelData(0);
  const ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : ch0;

  const fftIn  = new Float32Array(fftSize);
  const fftOut = new Float32Array(fftSize * 2);
  const data   = new Uint8ClampedArray(timeBins * half);

  // 时间维度按 timeBins 切（每帧覆盖一段，相邻帧有重叠）
  const stepF = Math.max(1, (buf.length - fftSize) / Math.max(1, timeBins - 1));

  for (let t = 0; t < timeBins; t++) {
    const start = Math.floor(t * stepF);
    for (let i = 0; i < fftSize; i++) {
      const idx = start + i;
      const v = (idx >= 0 && idx < buf.length) ? (ch0[idx] + ch1[idx]) * 0.5 : 0;
      fftIn[i] = v * win[i];
    }
    fft.forward(fftIn, fftOut);
    for (let f = 0; f < half; f++) {
      const re = fftOut[f * 2];
      const im = fftOut[f * 2 + 1];
      const mag = Math.sqrt(re * re + im * im) / half;
      const db = 20 * Math.log10(mag + 1e-9);
      const c = Math.max(0, Math.min(1, (db - DB_FLOOR) / (DB_CEIL - DB_FLOOR)));
      data[t * half + f] = Math.round(c * 255);
    }
  }

  return {
    data,
    timeBins,
    freqBins: half,
    fftSize,
    sampleRate: buf.sampleRate,
    dbFloor: DB_FLOOR,
    dbCeil: DB_CEIL,
  };
}

/** Magma 调色板（简化版，6 段线性插值）→ 输入 0..255 灰度 → RGB */
export function magmaRGB(v: number): { r: number; g: number; b: number } {
  // 6 个关键控制点（参考 matplotlib magma）
  const stops: [number, number, number, number][] = [
    [0,   0,   0,   3  ],   // 黑
    [50,  20,  10,  60 ],   // 深紫
    [100, 80,  20,  90 ],   // 紫红
    [150, 180, 50,  60 ],   // 红
    [200, 240, 130, 30 ],   // 橙
    [255, 252, 230, 200],   // 浅黄
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ar, ag, ab] = stops[i];
    const [b, br, bg, bb] = stops[i + 1];
    if (v <= b) {
      const t = (v - a) / Math.max(1, b - a);
      return {
        r: Math.round(ar + (br - ar) * t),
        g: Math.round(ag + (bg - ag) * t),
        b: Math.round(ab + (bb - ab) * t),
      };
    }
  }
  return { r: 252, g: 230, b: 200 };
}

/** 把 spectrogram 渲染到一个内存 canvas（log 频率轴），返回该 canvas 用于 drawImage */
export function renderSpectrogramBitmap(spec: Spectrogram, width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(width, height);

  const fMin = 20;
  const fMax = spec.sampleRate / 2;
  const logMin = Math.log2(fMin);
  const logMax = Math.log2(fMax);
  const binStep = spec.sampleRate / spec.fftSize;

  for (let py = 0; py < height; py++) {
    // 顶=高频，底=低频；用 log 频率轴
    const ratio = 1 - py / (height - 1);
    const f = Math.pow(2, logMin + ratio * (logMax - logMin));
    const fb = Math.min(spec.freqBins - 1, Math.max(1, Math.round(f / binStep)));
    for (let px = 0; px < width; px++) {
      const t = Math.min(spec.timeBins - 1, Math.floor(px / width * spec.timeBins));
      const v = spec.data[t * spec.freqBins + fb];
      const { r, g, b } = magmaRGB(v);
      const idx = (py * width + px) * 4;
      img.data[idx]     = r;
      img.data[idx + 1] = g;
      img.data[idx + 2] = b;
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
