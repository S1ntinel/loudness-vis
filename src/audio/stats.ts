// 指标卡片定义 + 计算（纯函数，无副作用）
export type StatKey =
  | 'peakDb' | 'rmsDb' | 'crest' | 'dr90'
  | 'clip95' | 'corr' | 'width' | 'kurtL';

export interface StatDef {
  key: StatKey;
  cn: string;
  en: string;
  color: string;
  fmt: (v: number) => string;
  fmtRange?: (v: number) => string;
  dec: number;
  warn?: (v: number) => boolean;
  ok?: (v: number) => boolean;
}

export const STAT_DEFS: StatDef[] = [
  {
    key: 'peakDb', cn: '峰值', en: 'Peak', color: '#e85d4a', dec: 1,
    fmt: v => v.toFixed(2) + ' dBFS',
    warn: v => v > -0.3, ok: v => v < -1,
  },
  {
    key: 'rmsDb', cn: '均方根', en: 'RMS', color: '#e8a64a', dec: 1,
    fmt: v => v.toFixed(2) + ' dB',
    warn: v => v > -8, ok: v => v < -14,
  },
  {
    key: 'crest', cn: '峰值因子', en: 'Crest Factor', color: '#3b6db5', dec: 1,
    fmt: v => v.toFixed(2) + ' dB',
    warn: v => v < 8, ok: v => v > 12,
  },
  {
    key: 'dr90', cn: '动态范围', en: 'DR90 ~30s', color: '#4ac3e8', dec: 1,
    fmt: v => v.toFixed(2) + ' dB',
    warn: v => v < 6, ok: v => v > 10,
  },
  {
    key: 'clip95', cn: '削波率', en: 'Clip95%', color: '#d04ae8', dec: 1,
    fmt: v => (v * 100).toFixed(2) + ' %',
    fmtRange: v => (v * 100).toFixed(1),
    warn: v => v > 0.05, ok: v => v < 0.005,
  },
  {
    key: 'corr', cn: '声道相关', en: 'LR Correlation', color: '#4ad8a8', dec: 2,
    fmt: v => v.toFixed(3),
    warn: v => v < 0, ok: v => v > 0.2 && v < 0.85,
  },
  {
    key: 'width', cn: '声场宽度', en: 'Stereo Width', color: '#8da3e8', dec: 2,
    fmt: v => v.toFixed(3),
  },
  {
    key: 'kurtL', cn: 'L 峰度', en: 'L Kurtosis', color: '#e84a8d', dec: 2,
    fmt: v => v.toFixed(3),
    warn: v => v < -0.3, ok: v => v > 0,
  },
];

export interface StatValues {
  peakDb: number;
  rmsDb: number;
  crest: number;
  clip95: number;
  corr: number;
  width: number;
  kurtL: number;
  dr90: number;
}

const SQRT_HALF = 0.7071067811865475;

export function computeStats(L: Float32Array, R: Float32Array): Omit<StatValues, 'dr90'> {
  const N = L.length;
  let peak = 0;
  let sumL = 0, sumR = 0;
  let sumLL = 0, sumRR = 0, sumLR = 0;
  let sumMid2 = 0, sumSide2 = 0;
  let clipCount = 0;

  for (let i = 0; i < N; i++) {
    const l = L[i], r = R[i];
    const al = Math.abs(l), ar = Math.abs(r);
    if (al > peak) peak = al;
    if (ar > peak) peak = ar;
    if (al > 0.95) clipCount++;
    if (ar > 0.95) clipCount++;
    sumL += l;  sumR += r;
    sumLL += l * l;  sumRR += r * r;  sumLR += l * r;
    const m = (l + r) * SQRT_HALF;
    const s = (l - r) * SQRT_HALF;
    sumMid2  += m * m;
    sumSide2 += s * s;
  }

  const rmsL   = Math.sqrt(sumLL / N);
  const rmsR   = Math.sqrt(sumRR / N);
  const rms    = (rmsL + rmsR) / 2;
  const peakDb = 20 * Math.log10(peak + 1e-9);
  const rmsDb  = 20 * Math.log10(rms + 1e-9);
  const crest  = peakDb - rmsDb;

  const denom = Math.sqrt((N * sumLL - sumL * sumL) * (N * sumRR - sumR * sumR));
  const corr  = denom > 1e-12 ? (N * sumLR - sumL * sumR) / denom : 0;
  const width = Math.sqrt(sumSide2) / (Math.sqrt(sumMid2) + 1e-12);

  const meanL = sumL / N;
  let m2 = 0, m4 = 0;
  for (let i = 0; i < N; i++) {
    const d  = L[i] - meanL;
    const d2 = d * d;
    m2 += d2;
    m4 += d2 * d2;
  }
  m2 /= N;  m4 /= N;
  const kurtL = m2 > 1e-12 ? m4 / (m2 * m2) - 3 : 0;

  return { peakDb, rmsDb, crest, clip95: clipCount / (2 * N), corr, width, kurtL };
}

export function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(Math.floor(sorted.length * p), sorted.length - 1)];
}

export function median(arr: number[]): number {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

export function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00';
  const m  = Math.floor(s / 60);
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return m + ':' + ss;
}
