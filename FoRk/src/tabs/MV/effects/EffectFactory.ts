import { EffectParams, MVEffect } from './MVEffect';
import { EffectType } from '../../../store/useMVStore';
import { SpectrumBarEffect } from './SpectrumBar';
import { SpectrumCircularEffect } from './SpectrumCircular';
import { ParticleBurstEffect } from './ParticleBurst';
import { BackgroundGradientEffect } from './BackgroundGradient';
import { TextOverlayEffect } from './TextOverlay';
import { VideoBackgroundEffect } from './VideoBackground';
import { ImageLayerEffect } from './ImageLayer';
import { LyricsKaraokeEffect } from './LyricsKaraoke';

export function createEffect(type: EffectType, params: EffectParams): MVEffect | null {
  switch (type) {
    case 'spectrum-bar':
      return new SpectrumBarEffect(params);
    case 'spectrum-circular':
      return new SpectrumCircularEffect(params);
    case 'particle-burst':
      return new ParticleBurstEffect(params);
    case 'background-gradient':
      return new BackgroundGradientEffect(params);
    case 'text-overlay':
      return new TextOverlayEffect(params);
    case 'video-background':
      return new VideoBackgroundEffect(params);
    case 'image-layer':
      return new ImageLayerEffect(params);
    case 'lyrics-karaoke':
      return new LyricsKaraokeEffect(params);
    case 'none':
    default:
      return null;
  }
}

export const EFFECT_LIST: { type: EffectType; name: string; description: string }[] = [
  { type: 'spectrum-bar', name: '条形频谱', description: '经典的条形频谱效果' },
  { type: 'spectrum-circular', name: '圆形频谱', description: '旋转的圆形频谱效果' },
  { type: 'particle-burst', name: '粒子爆发', description: '音频驱动的粒子爆发效果' },
  { type: 'background-gradient', name: '动态背景', description: '随音频变化的动态渐变背景' },
  { type: 'text-overlay', name: '文字层', description: '歌名与作者名文字叠加' },
  { type: 'video-background', name: '视频背景', description: '把视频素材当作动态背景层' },
  { type: 'image-layer', name: '图片层', description: '封面或装饰图片层' },
  { type: 'lyrics-karaoke', name: '卡拉OK 歌词', description: '逐字高亮的同步歌词' },
];
