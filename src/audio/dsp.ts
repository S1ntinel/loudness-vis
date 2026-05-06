// 双二阶滤波 (Direct Form I)
//   y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2]
// 系数遵循 RBJ Audio EQ Cookbook
// https://www.w3.org/TR/audio-eq-cookbook/

export interface BiquadCoeffs {
  b0: number; b1: number; b2: number;
  a1: number; a2: number;
}

export function biquadLowpassCoeffs(sr: number, freq: number, q = 0.7071): BiquadCoeffs {
  const w0 = 2 * Math.PI * freq / sr;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  const alpha = sinw0 / (2 * q);
  const a0 = 1 + alpha;
  const b0 = (1 - cosw0) / 2 / a0;
  const b1 = (1 - cosw0) / a0;
  const b2 = b0;
  const a1 = -2 * cosw0 / a0;
  const a2 = (1 - alpha) / a0;
  return { b0, b1, b2, a1, a2 };
}

export function biquadHighpassCoeffs(sr: number, freq: number, q = 0.7071): BiquadCoeffs {
  const w0 = 2 * Math.PI * freq / sr;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  const alpha = sinw0 / (2 * q);
  const a0 = 1 + alpha;
  const b0 =  (1 + cosw0) / 2 / a0;
  const b1 = -(1 + cosw0) / a0;
  const b2 = b0;
  const a1 = -2 * cosw0 / a0;
  const a2 = (1 - alpha) / a0;
  return { b0, b1, b2, a1, a2 };
}

export function biquadHighShelfCoeffs(sr: number, freq: number, gainDb: number, q = 0.7071): BiquadCoeffs {
  const A = Math.pow(10, gainDb / 40);
  const w0 = 2 * Math.PI * freq / sr;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  const alpha = sinw0 / 2 * Math.sqrt((A + 1 / A) * (1 / q - 1) + 2);
  const sqrtA2alpha = 2 * Math.sqrt(A) * alpha;
  const a0 = (A + 1) - (A - 1) * cosw0 + sqrtA2alpha;
  const b0 =  A * ((A + 1) + (A - 1) * cosw0 + sqrtA2alpha) / a0;
  const b1 = -2 * A * ((A - 1) + (A + 1) * cosw0) / a0;
  const b2 =  A * ((A + 1) + (A - 1) * cosw0 - sqrtA2alpha) / a0;
  const a1 =  2 * ((A - 1) - (A + 1) * cosw0) / a0;
  const a2 = ((A + 1) - (A - 1) * cosw0 - sqrtA2alpha) / a0;
  return { b0, b1, b2, a1, a2 };
}

/** 双二阶滤波，返回新 Float32Array，不修改原数据 */
export function applyBiquad(input: Float32Array, c: BiquadCoeffs): Float32Array {
  const out = new Float32Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let n = 0; n < input.length; n++) {
    const x0 = input[n];
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    out[n] = y0;
    x2 = x1; x1 = x0;
    y2 = y1; y1 = y0;
  }
  return out;
}

/** 串联多个 biquad */
export function applyBiquads(input: Float32Array, coeffs: BiquadCoeffs[]): Float32Array {
  let cur = input;
  for (const c of coeffs) cur = applyBiquad(cur, c);
  return cur;
}
