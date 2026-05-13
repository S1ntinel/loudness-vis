import { AudioData, MVEffect, RenderContext } from './MVEffect';
import { useMVAssetsStore } from '../../../store/useMVAssetsStore';
import { engine } from '../../../audio/engine';
import { LyricLine, mergeTranslation } from '../lyrics/parser';

/**
 * 卡拉OK 歌词层：按 engine.getCurrentTime() 显示当前 3 行歌词，
 * 当前行按字级时间戳做横向渐变高亮。无字级数据时整行渐变。
 */
export class LyricsKaraokeEffect extends MVEffect {
  readonly type = 'lyrics-karaoke';
  readonly name = '卡拉OK 歌词';
  readonly description = '逐字高亮的同步歌词';

  private mergedCache: LyricLine[] | null = null;
  private mainKey = '';
  private translationKey = '';

  private getMergedLines(): LyricLine[] | null {
    const assets = useMVAssetsStore.getState();
    const main = assets.getActive('lyrics');
    if (!main || main.type !== 'lyrics' || !main.parsedLines) {
      this.mergedCache = null;
      this.mainKey = '';
      this.translationKey = '';
      return null;
    }
    const trId = assets.activeLyricsTranslationId;
    const tr = trId ? assets.assets.find(a => a.id === trId) : null;
    const trLines = tr && tr.type === 'lyrics' && tr.parsedLines ? tr.parsedLines : null;

    const mainKey = main.id;
    const trKey = trLines ? trId ?? '' : '';
    if (this.mergedCache && this.mainKey === mainKey && this.translationKey === trKey) {
      return this.mergedCache;
    }
    this.mergedCache = trLines ? mergeTranslation(main.parsedLines, trLines) : main.parsedLines;
    this.mainKey = mainKey;
    this.translationKey = trKey;
    return this.mergedCache;
  }

  render(context: RenderContext, _audioData: AudioData): void {
    const lines = this.getMergedLines();
    if (!lines || lines.length === 0) return;

    const nowMs = engine.getCurrentTime() * 1000;
    const idx = findActiveLineIndex(lines, nowMs);

    const { ctx, width, height } = context;
    const fontSize = this.getNumberParam('fontSize', 38);
    const position = this.getStringParam('position', 'bottom');
    const showTranslation = this.getBooleanParam('showTranslation', true);
    const translationScale = this.getNumberParam('translationScale', 0.7);
    const activeColor = this.getStringParam('activeColor', '#ffffff');
    const inactiveColor = this.getStringParam('inactiveColor', 'rgba(255,255,255,0.55)');
    const glowColor = this.getStringParam('glowColor', 'rgba(255,255,255,0.5)');
    const glow = this.getNumberParam('glow', 0.6);
    let fontFamily = this.getStringParam('fontFamily', '');
    // 字体优先级：slot 参数 > 激活的字体素材 > 默认 MiSans
    if (!fontFamily) {
      const activeFont = useMVAssetsStore.getState().getActive('font');
      if (activeFont && activeFont.type === 'font' && activeFont.loaded) {
        fontFamily = activeFont.fontFamily;
      }
    }

    const baseFont = `700 ${fontSize}px ${fontFamily ? `"${fontFamily}", ` : ''}"MiSans", "Microsoft YaHei", sans-serif`;
    const trFont = `500 ${Math.max(14, Math.round(fontSize * translationScale))}px ${fontFamily ? `"${fontFamily}", ` : ''}"MiSans", "Microsoft YaHei", sans-serif`;

    const lineGap = fontSize * 0.5;
    const trGap = fontSize * 0.32;
    // 行高：主歌词 + 翻译（如果显示）
    const lineH = fontSize + (showTranslation ? Math.max(14, fontSize * translationScale) + trGap : 0) + lineGap;

    // 当前行 y 位置
    let centerY = height - 120;
    if (position === 'top') centerY = 120;
    else if (position === 'center') centerY = height / 2;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 4 + glow * 24;

    // 渲染 3 行：上一行（半透明）/ 当前 / 下一行（半透明）
    for (let offset = -1; offset <= 1; offset++) {
      const lineIdx = idx + offset;
      if (lineIdx < 0 || lineIdx >= lines.length) continue;
      const line = lines[lineIdx];
      const y = centerY + offset * lineH;
      const isCurrent = offset === 0;

      ctx.font = baseFont;

      if (isCurrent && line.words && line.words.length > 0) {
        renderWordsLine(ctx, line, nowMs, width / 2, y, activeColor, inactiveColor);
      } else if (isCurrent) {
        // 行级渐变：按行进度从左到右
        const progress = clamp01((nowMs - line.startMs) / Math.max(1, line.endMs - line.startMs));
        renderSweepingLine(ctx, line.text, width / 2, y, activeColor, inactiveColor, progress);
      } else {
        // 上/下行：纯灰色
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = inactiveColor;
        ctx.fillText(line.text, width / 2, y);
        ctx.globalAlpha = 1;
      }

      // 翻译
      if (showTranslation && line.translation) {
        ctx.font = trFont;
        ctx.globalAlpha = isCurrent ? 0.9 : 0.45;
        ctx.fillStyle = isCurrent ? activeColor : inactiveColor;
        ctx.fillText(line.translation, width / 2, y + fontSize * 0.42 + Math.max(14, fontSize * translationScale) * 0.85);
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore();
  }
}

function findActiveLineIndex(lines: LyricLine[], nowMs: number): number {
  // 二分查找
  let lo = 0, hi = lines.length - 1, result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].startMs <= nowMs) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return Math.max(0, result);
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** 字级渲染：未唱灰、正在唱按字内 progress mask、已唱主色 */
function renderWordsLine(
  ctx: CanvasRenderingContext2D,
  line: LyricLine,
  nowMs: number,
  cx: number,
  y: number,
  activeColor: string,
  inactiveColor: string,
) {
  if (!line.words) return;
  const fullText = line.words.map(w => w.text).join('');
  const fullWidth = ctx.measureText(fullText).width;
  let x = cx - fullWidth / 2;

  // 第一遍：用未唱色画完整背景行
  ctx.textAlign = 'left';
  ctx.fillStyle = inactiveColor;
  ctx.fillText(fullText, x, y);

  // 第二遍：逐字按状态画主色覆盖
  ctx.fillStyle = activeColor;
  for (const w of line.words) {
    const wWidth = ctx.measureText(w.text).width;
    if (nowMs >= w.endMs) {
      ctx.fillText(w.text, x, y);
    } else if (nowMs >= w.startMs) {
      const progress = clamp01((nowMs - w.startMs) / Math.max(1, w.endMs - w.startMs));
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y - 40, wWidth * progress, 60);
      ctx.clip();
      ctx.fillText(w.text, x, y);
      ctx.restore();
    }
    // 未唱：底色已经画过，不动
    x += wWidth;
  }
  ctx.textAlign = 'center';
}

/** 行级渐变：整行从左到右按 progress 切割 */
function renderSweepingLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  activeColor: string,
  inactiveColor: string,
  progress: number,
) {
  const width = ctx.measureText(text).width;
  const left = cx - width / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = inactiveColor;
  ctx.fillText(text, left, y);

  if (progress > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, y - 40, width * progress, 60);
    ctx.clip();
    ctx.fillStyle = activeColor;
    ctx.fillText(text, left, y);
    ctx.restore();
  }
  ctx.textAlign = 'center';
}
