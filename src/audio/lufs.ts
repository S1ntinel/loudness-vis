// ITU-R BS.1770-4 / EBU R128 LUFS 实现（简化版）
// - K-weighting：pre-filter (high-shelf) + RLB (high-pass)
// - 400ms 块，重叠 75%（即 100ms 步长）
// - 绝对门限 -70 LUFS、相对门限 -10 LU 的 gating
// 参考系数（BS.1770 Annex 1）：仅在 48kHz 采样率精确，对其它采样率会重新计算 biquad。

import {
  applyBiquad,
  biquadHighShelfCoeffs,
  biquadHighpassCoeffs,
} from './dsp';

const BLOCK_SEC = 0.4;
const HOP_SEC   = 0.1;        // 75% 重叠
const ABS_GATE  = -70;        // dB LUFS
const REL_GATE  = -10;        // LU 相对

/** 通道权重（5.1 用 1.41，立体声直接 1） */
const CHANNEL_WEIGHTS = [1, 1, 1, 1.41, 1.41];

/** K-weighting：先 high-shelf 提升高频 +4 dB @ ~1681Hz，再 high-pass 切 38Hz */
function kWeight(samples: Float32Array, sr: number): Float32Array {
  // BS.1770 stage 1: high-shelf
  const shelf = biquadHighShelfCoeffs(sr, 1681.974450955533, 3.999843853973347, 0.7071752369554196);
  // BS.1770 stage 2: high-pass
  const hp = biquadHighpassCoeffs(sr, 38.13547087602444, 0.5003270373238773);
  return applyBiquad(applyBiquad(samples, shelf), hp);
}

export interface LufsResult {
  /** Integrated（门限后） LUFS */
  integrated: number;
  /** 各 100ms 块的 mean square loudness（Σ_i G_i * z_i），用于 short-term 重建 */
  blocks: Float32Array;
  /** 块的时间步长（s） */
  hopSec: number;
}

/** 计算整段音频的 Integrated LUFS + 全部 100ms 块的 mean-square 值 */
export function computeLufs(buf: AudioBuffer): LufsResult {
  const sr = buf.sampleRate;
  const numCh = Math.min(buf.numberOfChannels, CHANNEL_WEIGHTS.length);

  // 1. 每声道 K-weighting
  const kCh: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) {
    kCh.push(kWeight(buf.getChannelData(c), sr));
  }

  // 2. 每 BLOCK_SEC 块求 mean square，hop = HOP_SEC
  const blockLen = Math.round(BLOCK_SEC * sr);
  const hopLen   = Math.round(HOP_SEC * sr);
  const total    = kCh[0].length;
  const numBlocks = Math.max(0, Math.floor((total - blockLen) / hopLen) + 1);

  const blocks = new Float32Array(numBlocks);
  for (let bi = 0; bi < numBlocks; bi++) {
    const start = bi * hopLen;
    let acc = 0;
    for (let c = 0; c < numCh; c++) {
      const ch = kCh[c];
      let s = 0;
      for (let j = start; j < start + blockLen; j++) {
        const v = ch[j];
        s += v * v;
      }
      acc += CHANNEL_WEIGHTS[c] * s / blockLen;
    }
    blocks[bi] = acc;
  }

  if (numBlocks === 0) {
    return { integrated: -Infinity, blocks, hopSec: HOP_SEC };
  }

  // 3. 绝对门限：丢弃 LUFS < -70 的块
  const absGateMs = Math.pow(10, (ABS_GATE + 0.691) / 10);
  const aboveAbs: number[] = [];
  for (let i = 0; i < numBlocks; i++) {
    if (blocks[i] >= absGateMs) aboveAbs.push(blocks[i]);
  }
  if (aboveAbs.length === 0) {
    return { integrated: -Infinity, blocks, hopSec: HOP_SEC };
  }

  // 4. 相对门限：以绝对门限后的均值再 -10 LU
  const meanAbs = aboveAbs.reduce((a, b) => a + b, 0) / aboveAbs.length;
  const relLufs = -0.691 + 10 * Math.log10(meanAbs) + REL_GATE;
  const relMs = Math.pow(10, (relLufs + 0.691) / 10);
  const aboveRel = aboveAbs.filter(v => v >= relMs);
  if (aboveRel.length === 0) {
    return { integrated: -Infinity, blocks, hopSec: HOP_SEC };
  }
  const meanRel = aboveRel.reduce((a, b) => a + b, 0) / aboveRel.length;
  const integrated = -0.691 + 10 * Math.log10(meanRel);

  return { integrated, blocks, hopSec: HOP_SEC };
}

/** 取某时刻附近 N 秒的 short-term LUFS（默认 3s 窗口） */
export function shortTermLufsAt(blocks: Float32Array, hopSec: number, timeSec: number, windowSec = 3): number {
  const center = timeSec / hopSec;
  const half = windowSec / hopSec / 2;
  const lo = Math.max(0, Math.floor(center - half));
  const hi = Math.min(blocks.length, Math.ceil(center + half));
  if (hi <= lo) return -Infinity;
  let acc = 0;
  let cnt = 0;
  for (let i = lo; i < hi; i++) {
    if (blocks[i] > 0) { acc += blocks[i]; cnt++; }
  }
  if (cnt === 0) return -Infinity;
  return -0.691 + 10 * Math.log10(acc / cnt);
}
