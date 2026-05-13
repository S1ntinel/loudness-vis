import { AudioData, MVEffect, RenderContext } from './MVEffect';
import { useMVAssetsStore } from '../../../store/useMVAssetsStore';

type FitMode = 'cover' | 'contain' | 'stretch';

/**
 * 视频背景：把当前激活的视频素材按帧绘制到 stage canvas。
 * 视频元素已在 useMVAssetsStore.addVideo 中预创建（muted/loop/playsInline），
 * 这里只负责 play() + drawImage()。
 */
export class VideoBackgroundEffect extends MVEffect {
  readonly type = 'video-background';
  readonly name = '视频背景';
  readonly description = '把视频素材当作动态背景层';

  private lastVideoId: string | null = null;

  render(context: RenderContext, _audioData: AudioData): void {
    const assets = useMVAssetsStore.getState();
    const active = assets.getActive('video');
    if (!active || active.type !== 'video') {
      this.lastVideoId = null;
      return;
    }
    const { videoEl, width: vw, height: vh } = active;

    if (this.lastVideoId !== active.id) {
      this.lastVideoId = active.id;
      if (videoEl.paused) {
        // muted=true 允许浏览器自动播放；失败时静默忽略
        videoEl.play().catch(() => { /* noop */ });
      }
    }

    if (videoEl.readyState < 2 || !vw || !vh) return;

    const { ctx, width, height } = context;
    const opacity = this.getNumberParam('opacity', 1);
    const fit = this.getStringParam('fit', 'cover') as FitMode;
    const blur = this.getNumberParam('blur', 0);

    const { dx, dy, dw, dh, sx, sy, sw, sh } = computeFitBox(vw, vh, width, height, fit);

    ctx.save();
    ctx.globalAlpha = opacity;
    if (blur > 0) ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(videoEl, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();
  }
}

/**
 * 计算把 (srcW × srcH) 内容铺到 (dstW × dstH) 画布的 drawImage 9 参数。
 * 也被 ImageLayer 复用。
 */
export function computeFitBox(
  srcW: number, srcH: number,
  dstW: number, dstH: number,
  fit: FitMode,
) {
  if (fit === 'stretch') {
    return { sx: 0, sy: 0, sw: srcW, sh: srcH, dx: 0, dy: 0, dw: dstW, dh: dstH };
  }
  const srcRatio = srcW / srcH;
  const dstRatio = dstW / dstH;
  if (fit === 'cover') {
    if (srcRatio > dstRatio) {
      const newSw = srcH * dstRatio;
      return { sx: (srcW - newSw) / 2, sy: 0, sw: newSw, sh: srcH, dx: 0, dy: 0, dw: dstW, dh: dstH };
    }
    const newSh = srcW / dstRatio;
    return { sx: 0, sy: (srcH - newSh) / 2, sw: srcW, sh: newSh, dx: 0, dy: 0, dw: dstW, dh: dstH };
  }
  // contain
  if (srcRatio > dstRatio) {
    const newDh = dstW / srcRatio;
    return { sx: 0, sy: 0, sw: srcW, sh: srcH, dx: 0, dy: (dstH - newDh) / 2, dw: dstW, dh: newDh };
  }
  const newDw = dstH * srcRatio;
  return { sx: 0, sy: 0, sw: srcW, sh: srcH, dx: (dstW - newDw) / 2, dy: 0, dw: newDw, dh: dstH };
}

export type { FitMode };
