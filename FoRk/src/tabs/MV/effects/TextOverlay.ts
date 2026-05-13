import { AudioData, MVEffect, RenderContext } from './MVEffect';
import { useMVAssetsStore } from '../../../store/useMVAssetsStore';

export class TextOverlayEffect extends MVEffect {
  readonly type = 'text-overlay';
  readonly name = '文字层';
  readonly description = '歌名和作者名文字层';

  render(context: RenderContext, _audioData: AudioData): void {
    if (!this.getBooleanParam('showTitle', true)) {
      return;
    }

    const songTitle = this.getStringParam('songTitle', 'Untitled Song').trim();
    const artistName = this.getStringParam('artistName', 'Unknown Artist').trim();
    if (!songTitle && !artistName) {
      return;
    }

    const { ctx, width, height } = context;
    const position = this.getStringParam('textPosition', 'bottom');
    const fontSize = this.getNumberParam('fontSize', 42);
    const textGlow = this.getNumberParam('textGlow', 0.6);
    const textColor = this.getStringParam('textColor', '#ffffff');
    const glowColor = this.getStringParam('glowColor', 'rgba(255,255,255,0.5)');

    // 字体优先级：slot 自带的 fontFamily 参数 > 用户激活的字体素材 > 默认 MiSans
    let fontFamily = this.getStringParam('fontFamily', '');
    if (!fontFamily) {
      const activeFont = useMVAssetsStore.getState().getActive('font');
      if (activeFont && activeFont.type === 'font' && activeFont.loaded) {
        fontFamily = activeFont.fontFamily;
      }
    }
    const familyChain = fontFamily ? `"${fontFamily}", ` : '';

    let centerY = height - 80;
    if (position === 'top') {
      centerY = 84;
    } else if (position === 'center') {
      centerY = height * 0.5;
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = textColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 4 + textGlow * 24;

    if (songTitle) {
      ctx.font = `700 ${fontSize}px ${familyChain}"MiSans", "Microsoft YaHei", sans-serif`;
      ctx.fillText(songTitle, width / 2, centerY);
    }

    if (artistName) {
      ctx.font = `500 ${Math.max(16, fontSize * 0.48)}px ${familyChain}"MiSans", "Microsoft YaHei", sans-serif`;
      ctx.globalAlpha = 0.92;
      ctx.fillText(artistName, width / 2, centerY + fontSize * 0.82);
    }

    ctx.restore();
  }
}
