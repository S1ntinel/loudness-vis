// 基 2 Cooley-Tukey 实数 FFT
// 输入：实数数组（length = size）
// 输出：交错的 [re0, im0, re1, im1, ...]（length = size * 2）

export class FFT {
  size: number;
  private cosTable: Float32Array;
  private sinTable: Float32Array;

  constructor(size: number) {
    if ((size & (size - 1)) !== 0) throw new Error('FFT size must be power of 2');
    this.size = size;
    const half = size >> 1;
    this.cosTable = new Float32Array(half);
    this.sinTable = new Float32Array(half);
    for (let i = 0; i < half; i++) {
      this.cosTable[i] = Math.cos(-2 * Math.PI * i / size);
      this.sinTable[i] = Math.sin(-2 * Math.PI * i / size);
    }
  }

  /** 把 real（长度 size）变换到 out（长度 size*2，交错存复数） */
  forward(real: Float32Array, out: Float32Array): void {
    const N = this.size;

    // 位反转重排
    let j = 0;
    for (let i = 0; i < N; i++) {
      out[i * 2]     = real[j];
      out[i * 2 + 1] = 0;
      let m = N >> 1;
      while (m && j >= m) { j -= m; m >>= 1; }
      j += m;
    }

    // butterfly（迭代基-2）
    for (let s = 1; s < N; s <<= 1) {
      const m = s << 1;
      const step = N / m;
      for (let k = 0; k < N; k += m) {
        for (let l = 0; l < s; l++) {
          const ti = l * step;
          const cos = this.cosTable[ti];
          const sin = this.sinTable[ti];
          const i1 = (k + l) * 2;
          const i2 = (k + l + s) * 2;
          const re2 = out[i2];
          const im2 = out[i2 + 1];
          const tre = cos * re2 - sin * im2;
          const tim = cos * im2 + sin * re2;
          out[i2]     = out[i1]     - tre;
          out[i2 + 1] = out[i1 + 1] - tim;
          out[i1]     = out[i1]     + tre;
          out[i1 + 1] = out[i1 + 1] + tim;
        }
      }
    }
  }
}

/** 生成 Hann 窗 */
export function hannWindow(size: number): Float32Array {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (size - 1));
  return w;
}
