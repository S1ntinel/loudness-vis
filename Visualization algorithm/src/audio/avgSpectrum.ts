// 计算整段音频的平均频谱（dB）。
// - 使用 STFT，hop 50%，hann 窗
// - 跨帧 dB 平均（避免大动态范围被平均吞掉）

import { FFT, hannWindow } from './fft';

export interface AvgSpectrum {
  /** 长度 = fftSize/2，每个 bin 的 dB */
  db: Float32Array;
  fftSize: number;
  sampleRate: number;
}

export function computeAverageSpectrum(buf: AudioBuffer, fftSize = 4096): AvgSpectrum {
  const half = fftSize >> 1;
  const fft = new FFT(fftSize);
  const win = hannWindow(fftSize);
  const ch0 = buf.getChannelData(0);
  const ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : ch0;

  const fftIn = new Float32Array(fftSize);
  const fftOut = new Float32Array(fftSize * 2);
  const sumDb = new Float32Array(half);

  const hop = fftSize >> 1;
  let frames = 0;

  for (let pos = 0; pos + fftSize <= buf.length; pos += hop) {
    for (let i = 0; i < fftSize; i++) {
      fftIn[i] = (ch0[pos + i] + ch1[pos + i]) * 0.5 * win[i];
    }
    fft.forward(fftIn, fftOut);
    for (let k = 0; k < half; k++) {
      const re = fftOut[k * 2];
      const im = fftOut[k * 2 + 1];
      const mag = Math.sqrt(re * re + im * im) / (fftSize / 2);
      sumDb[k] += 20 * Math.log10(mag + 1e-9);
    }
    frames++;
  }

  if (frames > 0) {
    for (let k = 0; k < half; k++) sumDb[k] /= frames;
  } else {
    sumDb.fill(-100);
  }

  return { db: sumDb, fftSize, sampleRate: buf.sampleRate };
}
