import { AudioData, MVEffect, RenderContext } from './MVEffect';
import { useMVAssetsStore } from '../../../store/useMVAssetsStore';
import { computeFitBox, FitMode } from './VideoBackground';

/**
 * 图片层：把当前激活的图片素材按 fit/scale/offset 绘制到 canvas。
 * 用于封面、装饰图层等。
 */
export class ImageLayerEffect extends MVEffect {
  readonly type = 'image-layer';
  readonly name = '图片层';
  readonly description = '封面或装饰图片层';

  render(context: RenderContext, _audioData: AudioData): void {
    const assets = useMVAssetsStore.getState();
    const active = assets.getActive('image');
    if (!active || active.type !== 'image') return;
    const { imageEl, width: iw, height: ih } = active;
    if (!imageEl.complete || !iw || !ih) return;

    const { ctx, width, height } = context;
    const opacity = this.getNumberParam('opacity', 1);
    const fit = this.getStringParam('fit', 'contain') as FitMode;
    const scale = this.getNumberParam('scale', 1);
    const offsetX = this.getNumberParam('offsetX', 0); // 相对画布宽度的偏移 [-0.5, 0.5]
    const offsetY = this.getNumberParam('offsetY', 0);
    const blur = this.getNumberParam('blur', 0);

    const { dx, dy, dw, dh, sx, sy, sw, sh } = computeFitBox(iw, ih, width, height, fit);
    const finalDw = dw * scale;
    const finalDh = dh * scale;
    const finalDx = dx + (dw - finalDw) / 2 + offsetX * width;
    const finalDy = dy + (dh - finalDh) / 2 + offsetY * height;

    ctx.save();
    ctx.globalAlpha = opacity;
    if (blur > 0) ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(imageEl, sx, sy, sw, sh, finalDx, finalDy, finalDw, finalDh);
    ctx.restore();
  }
}
