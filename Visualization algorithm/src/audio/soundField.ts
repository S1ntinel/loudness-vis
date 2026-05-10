// 声场分析（按频段实时空间定位）
// - 每帧：lBuf/rBuf 过 4 个 bandpass biquad，得到 4 频段的 L/R RMS
// - pan = (R - L) / (R + L)  → 球的角度
// - energy = (R + L) / 2     → 球的大小 / 距离

import { engine } from './engine';

export interface BandConfig {
  /** 中心频率（Hz） */
  fc: number;
  /** 滤波器 Q（越大越窄） */
  q: number;
  /** 显示颜色 */
  color: string;
  /** 标签名 */
  label: string;
}

export const SOUND_FIELD_BANDS: BandConfig[] = [
  { fc: 100,  q: 1.4, color: '#4a8de8', label: 'Low'    },
  { fc: 500,  q: 1.4, color: '#4ad8a8', label: 'MidLo'  },
  { fc: 2000, q: 1.4, color: '#e8a64a', label: 'MidHi'  },
  { fc: 8000, q: 1.4, color: '#e85d4a', label: 'High'   },
];

interface BiquadCoeffs { b0: number; b1: number; b2: number; a1: number; a2: number; }

function bandpassCoeffs(sr: number, fc: number, q: number): BiquadCoeffs {
  const w0 = 2 * Math.PI * fc / sr;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  const alpha = sinw0 / (2 * q);
  const a0 = 1 + alpha;
  const b0 =  alpha / a0;
  const b1 =  0;
  const b2 = -alpha / a0;
  const a1 = -2 * cosw0 / a0;
  const a2 = (1 - alpha) / a0;
  return { b0, b1, b2, a1, a2 };
}

interface BandState {
  x1: number; x2: number; y1: number; y2: number;
  /** 当前帧 RMS 值（平滑后） */
  rms: number;
}

class SoundFieldAnalyser {
  private coeffs: BiquadCoeffs[] = [];
  /** [band][channel] = state */
  private states: BandState[][] = [];
  private sr = 44100;

  constructor() {
    this.rebuild();
  }

  private rebuild() {
    const sr = engine.ctx.sampleRate;
    this.sr = sr;
    this.coeffs = SOUND_FIELD_BANDS.map(b => bandpassCoeffs(sr, b.fc, b.q));
    this.states = SOUND_FIELD_BANDS.map(() => [
      { x1: 0, x2: 0, y1: 0, y2: 0, rms: 0 },
      { x1: 0, x2: 0, y1: 0, y2: 0, rms: 0 },
    ]);
  }

  /** 处理一帧 (lBuf / rBuf)，更新每个频段的 L/R RMS */
  process(): void {
    if (engine.ctx.sampleRate !== this.sr) this.rebuild();
    engine.lAna.getFloatTimeDomainData(engine.lBuf);
    engine.rAna.getFloatTimeDomainData(engine.rBuf);
    const L = engine.lBuf;
    const R = engine.rBuf;
    const N = L.length;

    for (let bi = 0; bi < SOUND_FIELD_BANDS.length; bi++) {
      const c = this.coeffs[bi];
      // L
      const sl = this.states[bi][0];
      let sumL = 0;
      for (let n = 0; n < N; n++) {
        const x0 = L[n];
        const y0 = c.b0 * x0 + c.b1 * sl.x1 + c.b2 * sl.x2 - c.a1 * sl.y1 - c.a2 * sl.y2;
        sl.x2 = sl.x1; sl.x1 = x0;
        sl.y2 = sl.y1; sl.y1 = y0;
        sumL += y0 * y0;
      }
      const rmsL = Math.sqrt(sumL / N);
      // 平滑（指数移动平均）
      sl.rms = sl.rms * 0.6 + rmsL * 0.4;

      // R
      const sr2 = this.states[bi][1];
      let sumR = 0;
      for (let n = 0; n < N; n++) {
        const x0 = R[n];
        const y0 = c.b0 * x0 + c.b1 * sr2.x1 + c.b2 * sr2.x2 - c.a1 * sr2.y1 - c.a2 * sr2.y2;
        sr2.x2 = sr2.x1; sr2.x1 = x0;
        sr2.y2 = sr2.y1; sr2.y1 = y0;
        sumR += y0 * y0;
      }
      const rmsR = Math.sqrt(sumR / N);
      sr2.rms = sr2.rms * 0.6 + rmsR * 0.4;
    }
  }

  /** 取每个频段的 (L_rms, R_rms) */
  getBands(): { L: number; R: number }[] {
    return SOUND_FIELD_BANDS.map((_, bi) => ({
      L: this.states[bi][0].rms,
      R: this.states[bi][1].rms,
    }));
  }
}

export const soundFieldAnalyser = new SoundFieldAnalyser();
