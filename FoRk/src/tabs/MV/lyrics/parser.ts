// LRC / enhanced LRC / .t.lrc 解析器
//
// 支持：
// - 标准行级 LRC：[mm:ss.xx]歌词文本
// - Enhanced LRC 字级：[mm:ss.xx]<mm:ss.xx>字<mm:ss.xx>字
// - 多时间戳同行：[00:12.34][00:24.56]重复歌词
// - 元数据行：[ti:..] / [ar:..] / [al:..] / [by:..] / [offset:..]（跳过）
// - .t.lrc 翻译：与主歌词同结构，通过 startMs 匹配

export interface LyricWord {
  startMs: number;
  endMs: number;
  text: string;
}

export interface LyricLine {
  startMs: number;
  endMs: number;
  text: string;
  translation?: string;
  words?: LyricWord[];
}

const TIME_TAG = /\[(\d+):(\d+)(?:[.:](\d+))?\]/g;
const WORD_TAG = /<(\d+):(\d+)(?:[.:](\d+))?>/g;
const META_TAG = /^\s*\[(ti|ar|al|by|offset|length|re|ve|hash):/i;

function fracToMs(frac: string | undefined): number {
  if (!frac) return 0;
  const n = parseInt(frac, 10);
  if (frac.length === 1) return n * 100;
  if (frac.length === 2) return n * 10;
  return n; // length >= 3，当作毫秒
}

function timeToMs(min: string, sec: string, frac?: string): number {
  return parseInt(min, 10) * 60_000 + parseInt(sec, 10) * 1000 + fracToMs(frac);
}

interface RawLine {
  startMs: number;
  text: string;
  words?: LyricWord[];
}

function parseRawLines(raw: string): RawLine[] {
  const result: RawLine[] = [];
  const lines = raw.split(/\r?\n/);

  for (const rawLine of lines) {
    if (!rawLine.trim() || META_TAG.test(rawLine)) continue;

    const timestamps: number[] = [];
    let m: RegExpExecArray | null;
    TIME_TAG.lastIndex = 0;
    while ((m = TIME_TAG.exec(rawLine)) !== null) {
      timestamps.push(timeToMs(m[1], m[2], m[3]));
    }
    if (timestamps.length === 0) continue;

    const body = rawLine.replace(TIME_TAG, '');

    // 检查是否含字级标记
    WORD_TAG.lastIndex = 0;
    const hasWordTags = WORD_TAG.test(body);

    if (!hasWordTags) {
      const plain = body.trim();
      for (const ts of timestamps) {
        result.push({ startMs: ts, text: plain });
      }
      continue;
    }

    // 解析字级
    const segments: { time?: number; text: string }[] = [];
    let lastIndex = 0;
    WORD_TAG.lastIndex = 0;
    while ((m = WORD_TAG.exec(body)) !== null) {
      if (m.index > lastIndex) {
        segments.push({ text: body.slice(lastIndex, m.index) });
      }
      segments.push({ time: timeToMs(m[1], m[2], m[3]), text: '' });
      lastIndex = m.index + m[0].length;
    }
    if (lastIndex < body.length) {
      segments.push({ text: body.slice(lastIndex) });
    }

    const words: LyricWord[] = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.time === undefined) continue;
      let textBuf = '';
      let j = i + 1;
      while (j < segments.length && segments[j].time === undefined) {
        textBuf += segments[j].text;
        j++;
      }
      const nextTime = j < segments.length ? segments[j].time! : seg.time + 800;
      if (textBuf) words.push({ startMs: seg.time, endMs: nextTime, text: textBuf });
      i = j - 1;
    }

    const plainText = words.map(w => w.text).join('').trim();

    for (const ts of timestamps) {
      // 多时间戳复用同一句时，将字级时间整体平移对齐到行起始
      const baseOffset = words.length > 0 ? ts - words[0].startMs : 0;
      const shifted = words.map(w => ({
        startMs: w.startMs + baseOffset,
        endMs: w.endMs + baseOffset,
        text: w.text,
      }));
      result.push({ startMs: ts, text: plainText, words: shifted });
    }
  }

  result.sort((a, b) => a.startMs - b.startMs);
  return result;
}

/**
 * 把原始 LRC 文本解析为 LyricLine 数组。endMs 用下一行的 startMs 推导（最后一行默认 +5s）。
 */
export function parseLrc(raw: string): LyricLine[] {
  const parsed = parseRawLines(raw);
  return parsed.map((line, i) => {
    const next = parsed[i + 1];
    const endMs = next ? next.startMs : line.startMs + 5000;
    return {
      startMs: line.startMs,
      endMs,
      text: line.text,
      words: line.words,
    };
  });
}

/**
 * 把翻译歌词合并到主歌词的 translation 字段。
 * 匹配规则：startMs 差距 < 200ms 视为同一句。
 */
export function mergeTranslation(main: LyricLine[], translation: LyricLine[]): LyricLine[] {
  return main.map(line => {
    const tr = translation.find(t => Math.abs(t.startMs - line.startMs) < 200);
    return tr ? { ...line, translation: tr.text } : line;
  });
}
