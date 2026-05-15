export type MVTemplateId =
  | 'classicSpectrum'
  | 'cyberPulse'
  | 'dreamStar'
  | 'fireBurst'
  | 'waveOcean';

export type MVThemeId =
  | 'cyberBlue'
  | 'dreamPurple'
  | 'fireOrange'
  | 'cleanWhiteBlue'
  | 'matrixGreen';

export type MVSpectrumStyle = 'bar' | 'mirrorBar' | 'radial';
export type MVTextPosition = 'top' | 'center' | 'bottom';
export type MVBackgroundType = 'gradient' | 'electro' | 'starlight' | 'ember' | 'ocean';

export interface MVThemeDefinition {
  id: MVThemeId;
  label: string;
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  textColor: string;
  panelColor: string;
  panelBorder: string;
  panelMuted: string;
  buttonColor: string;
  buttonHover: string;
  dividerColor: string;
  accentHue: number;
  accentSaturation: number;
  accentBrightness: number;
}

export interface MVTemplateDefinition {
  id: MVTemplateId;
  name: string;
  description: string;
  icon: string;
  theme: MVThemeId;
  backgroundType: MVBackgroundType;
  dynamicBackground: boolean;
  glow: number;
  sensitivity: number;
  smoothing: number;
  spectrumStyle: MVSpectrumStyle;
  barCount: number;
  textPosition: MVTextPosition;
  recommendedFormat: 'webm-vp9' | 'webm-vp8' | 'webm';
  recommendedFps: number;
  exportQuality: 'high' | 'medium';
  accentEffect: 'none' | 'particles';
}

export interface MVTextConfig {
  showTitle: boolean;
  songTitle: string;
  artistName: string;
  position: MVTextPosition;
  fontSize: number;
  textGlow: number;
  offsetX?: number;
  offsetY?: number;
}

export interface MVDynamicBackgroundConfig {
  enabled: boolean;
  speed: number;
  audioReactive: boolean;
  type: MVBackgroundType;
}

export interface MVProjectFile {
  version: '1.0';
  name: string;
  resolution: string;
  fps: number;
  theme: MVThemeId;
  preset: MVTemplateId;
  text: MVTextConfig;
  effects: {
    dynamicBackground: MVDynamicBackgroundConfig;
    spectrum: {
      style: MVSpectrumStyle;
      barCount: number;
      sensitivity: number;
      smoothing: number;
      glow: number;
      mirror: boolean;
      radius: number;
      barWidth: number;
      offsetX?: number;
      offsetY?: number;
      scale?: number;
      colorA?: string;
      colorB?: string;
      glowColor?: string;
      opacity?: number;
    };
  };
  export: {
    format: 'webm-vp9' | 'webm-vp8' | 'webm';
    fps: number;
    quality: 'high' | 'medium';
  };
}

// v2 项目文件：v1 + 素材引用 + 导出预设
export type MVAssetRefMode = 'path' | 'inline' | 'zip';

export interface MVAssetRef {
  name: string;
  size: number;
  mode: MVAssetRefMode;
  // mode=path: 绝对/相对路径字符串（仅同机复用）
  // mode=inline: base64 编码（自包含 JSON）
  // mode=zip: zip 内相对路径，如 "assets/audio/song.mp3"
  data: string;
  // 歌词专属：是否为翻译歌词
  isTranslation?: boolean;
}

export type MVExportPresetId =
  | 'bilibili-1080p'
  | 'youtube-1080p'
  | 'youtube-4k'
  | 'douyin-vertical'
  | 'archive'
  | 'custom';

export interface MVProjectFileV2 {
  version: '2.0';
  name: string;
  theme: MVThemeId;
  preset: MVTemplateId;
  text: MVTextConfig;
  effects: MVProjectFile['effects'];
  exportPreset: MVExportPresetId;
  assets?: {
    audio?: MVAssetRef;
    video?: MVAssetRef;
    image?: MVAssetRef;
    lyrics?: MVAssetRef;
    lyricsTranslation?: MVAssetRef;
    font?: MVAssetRef;
  };
}

export type AnyMVProjectFile = MVProjectFile | MVProjectFileV2;

export const MV_THEMES: Record<MVThemeId, MVThemeDefinition> = {
  cyberBlue: {
    id: 'cyberBlue',
    label: '青蓝科技',
    backgroundColor: '#071722',
    primaryColor: '#22d3ee',
    secondaryColor: '#60a5fa',
    glowColor: 'rgba(34, 211, 238, 0.55)',
    textColor: '#e6fbff',
    panelColor: 'rgba(8, 21, 31, 0.92)',
    panelBorder: 'rgba(61, 176, 214, 0.30)',
    panelMuted: '#7fb6c3',
    buttonColor: '#1294bb',
    buttonHover: '#0f7da0',
    dividerColor: 'rgba(82, 182, 211, 0.18)',
    accentHue: 195,
    accentSaturation: 88,
    accentBrightness: 56,
  },
  dreamPurple: {
    id: 'dreamPurple',
    label: '粉紫梦幻',
    backgroundColor: '#140a22',
    primaryColor: '#e879f9',
    secondaryColor: '#a78bfa',
    glowColor: 'rgba(232, 121, 249, 0.52)',
    textColor: '#fff1ff',
    panelColor: 'rgba(24, 12, 34, 0.92)',
    panelBorder: 'rgba(202, 113, 247, 0.28)',
    panelMuted: '#c8a7d8',
    buttonColor: '#b255dc',
    buttonHover: '#9948c0',
    dividerColor: 'rgba(206, 142, 247, 0.18)',
    accentHue: 284,
    accentSaturation: 82,
    accentBrightness: 62,
  },
  fireOrange: {
    id: 'fireOrange',
    label: '火焰橙红',
    backgroundColor: '#1d0a07',
    primaryColor: '#fb923c',
    secondaryColor: '#ef4444',
    glowColor: 'rgba(251, 146, 60, 0.52)',
    textColor: '#fff4ea',
    panelColor: 'rgba(35, 13, 8, 0.92)',
    panelBorder: 'rgba(250, 133, 61, 0.28)',
    panelMuted: '#d9ae9b',
    buttonColor: '#d96b2e',
    buttonHover: '#bf5722',
    dividerColor: 'rgba(235, 109, 61, 0.2)',
    accentHue: 18,
    accentSaturation: 90,
    accentBrightness: 56,
  },
  cleanWhiteBlue: {
    id: 'cleanWhiteBlue',
    label: '白蓝清爽',
    backgroundColor: '#eef7ff',
    primaryColor: '#2563eb',
    secondaryColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    textColor: '#0f2742',
    panelColor: 'rgba(255, 255, 255, 0.93)',
    panelBorder: 'rgba(86, 146, 230, 0.22)',
    panelMuted: '#5d7391',
    buttonColor: '#2d6cdf',
    buttonHover: '#235ac0',
    dividerColor: 'rgba(80, 145, 222, 0.16)',
    accentHue: 210,
    accentSaturation: 84,
    accentBrightness: 52,
  },
  matrixGreen: {
    id: 'matrixGreen',
    label: '矩阵绿色',
    backgroundColor: '#07160d',
    primaryColor: '#4ade80',
    secondaryColor: '#22c55e',
    glowColor: 'rgba(74, 222, 128, 0.45)',
    textColor: '#eafff1',
    panelColor: 'rgba(9, 24, 16, 0.92)',
    panelBorder: 'rgba(81, 198, 112, 0.26)',
    panelMuted: '#8db89a',
    buttonColor: '#1f9f53',
    buttonHover: '#198246',
    dividerColor: 'rgba(84, 196, 114, 0.16)',
    accentHue: 140,
    accentSaturation: 72,
    accentBrightness: 48,
  },
};

export const MV_TEMPLATES: MVTemplateDefinition[] = [
  {
    id: 'classicSpectrum',
    name: '经典频谱',
    description: '稳定耐看的经典条形频谱。',
    icon: '🎵',
    theme: 'cleanWhiteBlue',
    backgroundType: 'gradient',
    dynamicBackground: true,
    glow: 0.55,
    sensitivity: 1.1,
    smoothing: 0.72,
    spectrumStyle: 'bar',
    barCount: 96,
    textPosition: 'bottom',
    recommendedFormat: 'webm-vp9',
    recommendedFps: 60,
    exportQuality: 'high',
    accentEffect: 'none',
  },
  {
    id: 'cyberPulse',
    name: '青蓝电子',
    description: '偏电子感的镜像频谱与冷色背景。',
    icon: '🧊',
    theme: 'cyberBlue',
    backgroundType: 'electro',
    dynamicBackground: true,
    glow: 0.78,
    sensitivity: 1.28,
    smoothing: 0.68,
    spectrumStyle: 'mirrorBar',
    barCount: 84,
    textPosition: 'bottom',
    recommendedFormat: 'webm-vp9',
    recommendedFps: 60,
    exportQuality: 'high',
    accentEffect: 'particles',
  },
  {
    id: 'dreamStar',
    name: '梦幻星空',
    description: '星空背景与柔和圆形频谱。',
    icon: '✨',
    theme: 'dreamPurple',
    backgroundType: 'starlight',
    dynamicBackground: true,
    glow: 0.82,
    sensitivity: 1.05,
    smoothing: 0.82,
    spectrumStyle: 'radial',
    barCount: 72,
    textPosition: 'center',
    recommendedFormat: 'webm-vp9',
    recommendedFps: 60,
    exportQuality: 'high',
    accentEffect: 'particles',
  },
  {
    id: 'fireBurst',
    name: '火焰爆发',
    description: '热烈的高发光频谱与粒子冲击。',
    icon: '🔥',
    theme: 'fireOrange',
    backgroundType: 'ember',
    dynamicBackground: true,
    glow: 0.95,
    sensitivity: 1.5,
    smoothing: 0.58,
    spectrumStyle: 'bar',
    barCount: 88,
    textPosition: 'bottom',
    recommendedFormat: 'webm-vp8',
    recommendedFps: 60,
    exportQuality: 'high',
    accentEffect: 'particles',
  },
  {
    id: 'waveOcean',
    name: '波形海洋',
    description: '低饱和冷色动态背景与柔和镜像频谱。',
    icon: '🌊',
    theme: 'matrixGreen',
    backgroundType: 'ocean',
    dynamicBackground: true,
    glow: 0.48,
    sensitivity: 0.95,
    smoothing: 0.86,
    spectrumStyle: 'mirrorBar',
    barCount: 72,
    textPosition: 'bottom',
    recommendedFormat: 'webm',
    recommendedFps: 60,
    exportQuality: 'medium',
    accentEffect: 'none',
  },
];

export function getMVTheme(themeId: MVThemeId): MVThemeDefinition {
  return MV_THEMES[themeId];
}

export function getMVTemplate(templateId: MVTemplateId): MVTemplateDefinition {
  return MV_TEMPLATES.find(template => template.id === templateId) ?? MV_TEMPLATES[0];
}

export function createDefaultTextConfig(position: MVTextPosition = 'bottom'): MVTextConfig {
  return {
    showTitle: true,
    songTitle: 'Untitled Song',
    artistName: 'Unknown Artist',
    position,
    fontSize: 42,
    textGlow: 0.6,
    offsetX: 0,
    offsetY: 0,
  };
}

export function createDefaultDynamicBackground(type: MVBackgroundType = 'gradient'): MVDynamicBackgroundConfig {
  return {
    enabled: true,
    speed: 0.4,
    audioReactive: true,
    type,
  };
}

export function backgroundTypeToStyleIndex(type: MVBackgroundType): number {
  switch (type) {
    case 'gradient':
      return 0;
    case 'electro':
      return 2;
    case 'starlight':
      return 4;
    case 'ember':
      return 1;
    case 'ocean':
      return 3;
    default:
      return 0;
  }
}

export function spectrumStyleToSlotType(style: MVSpectrumStyle): 'spectrum-bar' | 'spectrum-circular' {
  return style === 'radial' ? 'spectrum-circular' : 'spectrum-bar';
}

export function createProjectExportName(text: MVTextConfig): string {
  const song = text.songTitle.trim() || 'Untitled Song';
  const artist = text.artistName.trim() || 'Unknown Artist';
  return `${song} - ${artist}`;
}

export function isMVThemeId(value: string): value is MVThemeId {
  return Object.prototype.hasOwnProperty.call(MV_THEMES, value);
}

export function isMVTemplateId(value: string): value is MVTemplateId {
  return MV_TEMPLATES.some(template => template.id === value);
}

export function isSpectrumStyle(value: string): value is MVSpectrumStyle {
  return value === 'bar' || value === 'mirrorBar' || value === 'radial';
}

export function isTextPosition(value: string): value is MVTextPosition {
  return value === 'top' || value === 'center' || value === 'bottom';
}

export function isBackgroundType(value: string): value is MVBackgroundType {
  return value === 'gradient' || value === 'electro' || value === 'starlight' || value === 'ember' || value === 'ocean';
}

export function createTimestampFilePart(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
