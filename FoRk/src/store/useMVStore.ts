import { create } from 'zustand';
import {
  backgroundTypeToStyleIndex,
  createDefaultDynamicBackground,
  createDefaultTextConfig,
  createProjectExportName,
  getMVTemplate,
  getMVTheme,
  isMVTemplateId,
  isMVThemeId,
  isSpectrumStyle,
  isBackgroundType,
  isTextPosition,
  MVProjectFile,
  MVTemplateDefinition,
  MVTemplateId,
  MVTextConfig,
  MVThemeDefinition,
  MVThemeId,
  MVSpectrumStyle,
  MVTextPosition,
  MVBackgroundType,
  MV_TEMPLATES,
  spectrumStyleToSlotType,
  createTimestampFilePart,
} from '../tabs/MV/mvProject';

export type EffectType =
  | 'spectrum-bar'
  | 'spectrum-circular'
  | 'particle-burst'
  | 'background-gradient'
  | 'text-overlay'
  | 'video-background'
  | 'image-layer'
  | 'lyrics-karaoke'
  | 'none';

export type MVRecordingFormatId = 'mp4' | 'webm-vp9' | 'webm-vp8' | 'webm';

export type EffectParamValue = string | number | boolean;
export type EffectParams = Record<string, EffectParamValue>;

export interface EffectSlot {
  id: number;
  type: EffectType;
  enabled: boolean;
  params: EffectParams;
}

export interface MVGlobalParams {
  hue: number;
  saturation: number;
  brightness: number;
  sensitivity: number;
  smoothing: number;
  glow: number;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  textColor: string;
  backgroundColor: string;
}

interface MVState {
  isPlaying: boolean;
  isRecording: boolean;
  slots: EffectSlot[];
  global: MVGlobalParams;
  selectedSlot: number | null;
  templates: MVTemplateDefinition[];
  currentTemplateId: MVTemplateId;
  currentThemeId: MVThemeId;
  currentSpectrumStyle: MVSpectrumStyle;
  currentTheme: MVThemeDefinition;
  recordingFormat: MVRecordingFormatId;
  text: MVTextConfig;
  dynamicBackground: {
    enabled: boolean;
    speed: number;
    audioReactive: boolean;
    type: MVBackgroundType;
  };
  spectrumSettings: {
    barCount: number;
    radius: number;
    barWidth: number;
    mirror: boolean;
  };

  setPlaying: (playing: boolean) => void;
  setRecording: (recording: boolean) => void;
  setRecordingFormat: (format: MVRecordingFormatId) => void;
  setSlotType: (slotId: number, type: EffectType) => void;
  toggleSlot: (slotId: number) => void;
  updateSlotParams: (slotId: number, params: EffectParams) => void;
  updateGlobal: (params: Partial<MVGlobalParams>) => void;
  setSelectedSlot: (slotId: number | null) => void;
  applyTemplate: (templateId: MVTemplateId) => void;
  applyTheme: (themeId: MVThemeId) => void;
  setSpectrumStyle: (style: MVSpectrumStyle) => void;
  updateText: (params: Partial<MVTextConfig>) => void;
  updateDynamicBackground: (params: Partial<MVState['dynamicBackground']>) => void;
  updateSpectrumSettings: (params: Partial<MVState['spectrumSettings']>) => void;
  exportProject: () => MVProjectFile;
  importProject: (project: MVProjectFile) => void;
  resetProject: () => void;
}

const SUPPORTED_EFFECTS: EffectType[] = [
  'background-gradient',
  'spectrum-bar',
  'spectrum-circular',
  'particle-burst',
  'text-overlay',
  'video-background',
  'image-layer',
  'lyrics-karaoke',
  'none',
];

const DEFAULT_TEMPLATE_ID: MVTemplateId = 'classicSpectrum';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getDefaultSlotParams(
  type: EffectType,
  global: MVGlobalParams,
  spectrum: { barCount: number; radius: number; barWidth: number; mirror: boolean },
): EffectParams {
  switch (type) {
    case 'background-gradient':
      return {
        style: 0,
        speed: 10,
        audioReactive: true,
        backgroundColor: global.backgroundColor,
        primaryColor: global.primaryColor,
        secondaryColor: global.secondaryColor,
        glowColor: global.glowColor,
        hue: global.hue,
        saturation: global.saturation,
        brightness: global.brightness,
      };
    case 'spectrum-bar':
      return {
        count: spectrum.barCount,
        width: spectrum.barWidth,
        gap: 2,
        radius: 3,
        direction: spectrum.mirror ? 2 : 0,
        fitWidth: 1,
        fillHeight: 0.92,
        sensitivity: global.sensitivity,
        smoothing: global.smoothing,
        glow: global.glow,
        colorA: global.primaryColor,
        colorB: global.secondaryColor,
        glowColor: global.glowColor,
      };
    case 'spectrum-circular':
      return {
        count: spectrum.barCount,
        radius: spectrum.radius,
        innerRadius: Math.max(28, spectrum.radius * 0.42),
        rotation: 0.25,
        sensitivity: global.sensitivity,
        smoothing: global.smoothing,
        glow: global.glow,
        colorA: global.primaryColor,
        colorB: global.secondaryColor,
        glowColor: global.glowColor,
      };
    case 'particle-burst':
      return {
        density: 26 + global.sensitivity * 18,
        speed: 40 + global.glow * 30,
        size: 1.8 + global.glow * 2.2,
        gravity: 12,
        colorA: global.primaryColor,
        colorB: global.secondaryColor,
        glowColor: global.glowColor,
        hue: global.hue,
      };
    case 'text-overlay':
      return {
        showTitle: true,
        songTitle: 'Untitled Song',
        artistName: 'Unknown Artist',
        textPosition: 'bottom',
        fontSize: 42,
        textGlow: 0.6,
        textColor: global.textColor,
        glowColor: global.glowColor,
        fontFamily: '',
      };
    case 'video-background':
      return {
        opacity: 1,
        fit: 'cover',
        blur: 0,
      };
    case 'image-layer':
      return {
        opacity: 1,
        fit: 'contain',
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        blur: 0,
      };
    case 'lyrics-karaoke':
      return {
        fontSize: 38,
        position: 'bottom',
        showTranslation: true,
        translationScale: 0.7,
        activeColor: global.primaryColor,
        inactiveColor: global.textColor,
        glowColor: global.glowColor,
        glow: 0.6,
        fontFamily: '',
      };
    default:
      return {};
  }
}

function createGlobalFromTheme(themeId: MVThemeId, templateId: MVTemplateId): MVGlobalParams {
  const theme = getMVTheme(themeId);
  const template = getMVTemplate(templateId);
  return {
    hue: theme.accentHue,
    saturation: theme.accentSaturation,
    brightness: theme.accentBrightness,
    sensitivity: template.sensitivity,
    smoothing: template.smoothing,
    glow: template.glow,
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    glowColor: theme.glowColor,
    textColor: theme.textColor,
    backgroundColor: theme.backgroundColor,
  };
}

function createSlotsFromState(state: {
  currentThemeId: MVThemeId;
  currentSpectrumStyle: MVSpectrumStyle;
  dynamicBackground: MVState['dynamicBackground'];
  text: MVTextConfig;
  global: MVGlobalParams;
  spectrumSettings: MVState['spectrumSettings'];
  currentTemplateId: MVTemplateId;
}): EffectSlot[] {
  const template = getMVTemplate(state.currentTemplateId);
  const spectrumType = spectrumStyleToSlotType(state.currentSpectrumStyle);
  const mirror = state.currentSpectrumStyle === 'mirrorBar' || state.spectrumSettings.mirror;
  const backgroundStyle = backgroundTypeToStyleIndex(state.dynamicBackground.type);

  const slots: EffectSlot[] = [
    {
      id: 0,
      type: 'background-gradient',
      enabled: state.dynamicBackground.enabled,
      params: {
        style: backgroundStyle,
        speed: state.dynamicBackground.speed * 100,
        audioReactive: state.dynamicBackground.audioReactive,
        backgroundColor: state.global.backgroundColor,
        primaryColor: state.global.primaryColor,
        secondaryColor: state.global.secondaryColor,
        glowColor: state.global.glowColor,
        hue: state.global.hue,
        saturation: state.global.saturation,
        brightness: state.global.brightness,
      },
    },
    {
      id: 1,
      type: spectrumType,
      enabled: true,
      params: spectrumType === 'spectrum-bar'
        ? {
            count: state.spectrumSettings.barCount,
            width: state.spectrumSettings.barWidth,
            gap: 2,
            radius: 3,
            direction: mirror ? 2 : 0,
            fitWidth: 1,
            fillHeight: 0.92,
            sensitivity: state.global.sensitivity,
            smoothing: state.global.smoothing,
            glow: state.global.glow,
            colorA: state.global.primaryColor,
            colorB: state.global.secondaryColor,
            glowColor: state.global.glowColor,
          }
        : {
            count: state.spectrumSettings.barCount,
            radius: state.spectrumSettings.radius,
            innerRadius: Math.max(28, state.spectrumSettings.radius * 0.42),
            rotation: 0.25,
            sensitivity: state.global.sensitivity,
            smoothing: state.global.smoothing,
            glow: state.global.glow,
            colorA: state.global.primaryColor,
            colorB: state.global.secondaryColor,
            glowColor: state.global.glowColor,
          },
    },
    {
      id: 2,
      type: template.accentEffect === 'particles' ? 'particle-burst' : 'none',
      enabled: template.accentEffect === 'particles',
      params: {
        density: 26 + state.global.sensitivity * 18,
        speed: 40 + state.global.glow * 30,
        size: 1.8 + state.global.glow * 2.2,
        gravity: 12,
        colorA: state.global.primaryColor,
        colorB: state.global.secondaryColor,
        glowColor: state.global.glowColor,
      },
    },
    {
      id: 3,
      type: 'text-overlay',
      enabled: state.text.showTitle,
      params: {
        showTitle: state.text.showTitle,
        songTitle: state.text.songTitle,
        artistName: state.text.artistName,
        textPosition: state.text.position,
        fontSize: state.text.fontSize,
        textGlow: state.text.textGlow,
        textColor: state.global.textColor,
        glowColor: state.global.glowColor,
      },
    },
  ];

  return slots;
}

function createRuntimeState(config: {
  currentTemplateId: MVTemplateId;
  currentThemeId: MVThemeId;
  currentSpectrumStyle: MVSpectrumStyle;
  dynamicBackground: MVState['dynamicBackground'];
  text: MVTextConfig;
  spectrumSettings: MVState['spectrumSettings'];
}): Pick<MVState, 'currentTheme' | 'global' | 'slots'> {
  const currentTheme = getMVTheme(config.currentThemeId);
  const global = createGlobalFromTheme(config.currentThemeId, config.currentTemplateId);
  const slots = createSlotsFromState({ ...config, global });
  return { currentTheme, global, slots };
}

function createInitialState() {
  const template = getMVTemplate(DEFAULT_TEMPLATE_ID);
  const text = createDefaultTextConfig(template.textPosition);
  const dynamicBackground = createDefaultDynamicBackground(template.backgroundType);
  const spectrumSettings = {
    barCount: template.barCount,
    radius: 124,
    barWidth: 8,
    mirror: template.spectrumStyle === 'mirrorBar',
  };
  const base = {
    currentTemplateId: template.id,
    currentThemeId: template.theme,
    currentSpectrumStyle: template.spectrumStyle,
    dynamicBackground,
    text,
    spectrumSettings,
  };
  return {
    ...base,
    ...createRuntimeState(base),
  };
}

function createExportProject(state: Pick<MVState,
  'currentTemplateId' |
  'currentThemeId' |
  'currentSpectrumStyle' |
  'text' |
  'dynamicBackground' |
  'spectrumSettings' |
  'recordingFormat' |
  'global'
>): MVProjectFile {
  return {
    version: '1.0',
    name: createProjectExportName(state.text),
    resolution: '1920x1080',
    fps: 60,
    theme: state.currentThemeId,
    preset: state.currentTemplateId,
    text: { ...state.text },
    effects: {
      dynamicBackground: { ...state.dynamicBackground },
      spectrum: {
        style: state.currentSpectrumStyle,
        barCount: state.spectrumSettings.barCount,
        sensitivity: state.global.sensitivity,
        smoothing: state.global.smoothing,
        glow: state.global.glow,
        mirror: state.currentSpectrumStyle === 'mirrorBar',
        radius: state.spectrumSettings.radius,
        barWidth: state.spectrumSettings.barWidth,
      },
    },
    export: {
      format: state.recordingFormat === 'mp4' ? 'webm-vp9' : state.recordingFormat,
      fps: 60,
      quality: state.global.glow > 0.75 ? 'high' : 'medium',
    },
  };
}

export const EFFECT_LIST: { type: EffectType; name: string; description: string }[] = [
  { type: 'background-gradient', name: '动态背景', description: '可流动、可跟随低频变化的背景层。' },
  { type: 'spectrum-bar', name: '条形频谱', description: '经典或镜像条形频谱。' },
  { type: 'spectrum-circular', name: '环形频谱', description: '圆形 / 环形的中心频谱。' },
  { type: 'particle-burst', name: '粒子增强', description: '节拍触发的粒子点缀层。' },
  { type: 'text-overlay', name: '文字层', description: '歌名 / 作者名文字叠加层。' },
  { type: 'video-background', name: '视频背景', description: '把视频素材当作动态背景层。' },
  { type: 'image-layer', name: '图片层', description: '封面或装饰图片层。' },
  { type: 'lyrics-karaoke', name: '卡拉OK 歌词', description: '逐字高亮的同步歌词。' },
];

export { MV_TEMPLATES as BUILT_IN_PRESETS };

export const useMVStore = create<MVState>((set, get) => {
  const initial = createInitialState();

  return {
    isPlaying: false,
    isRecording: false,
    slots: initial.slots,
    global: initial.global,
    selectedSlot: 1,
    templates: MV_TEMPLATES,
    currentTemplateId: initial.currentTemplateId,
    currentThemeId: initial.currentThemeId,
    currentSpectrumStyle: initial.currentSpectrumStyle,
    currentTheme: initial.currentTheme,
    recordingFormat: getMVTemplate(DEFAULT_TEMPLATE_ID).recommendedFormat,
    text: initial.text,
    dynamicBackground: initial.dynamicBackground,
    spectrumSettings: initial.spectrumSettings,

    setPlaying: (playing) => set({ isPlaying: playing }),
    setRecording: (recording) => set({ isRecording: recording }),
    setRecordingFormat: (format) => set({ recordingFormat: format }),

    setSlotType: (slotId, type) => {
      if (!SUPPORTED_EFFECTS.includes(type)) return;
      const state = get();
      const defaultParams = getDefaultSlotParams(type, state.global, state.spectrumSettings);
      set(state2 => ({
        slots: state2.slots.map(slot =>
          slot.id === slotId ? { ...slot, type, params: defaultParams } : slot
        ),
      }));
    },

    toggleSlot: (slotId) => {
      set(state => ({
        slots: state.slots.map(slot =>
          slot.id === slotId ? { ...slot, enabled: !slot.enabled } : slot
        ),
      }));
    },

    updateSlotParams: (slotId, params) => {
      set(state => ({
        slots: state.slots.map(slot =>
          slot.id === slotId ? { ...slot, params: { ...slot.params, ...params } } : slot
        ),
      }));
    },

    updateGlobal: (params) => {
      set(state => {
        const nextGlobal = {
          ...state.global,
          ...params,
          sensitivity: clamp(params.sensitivity ?? state.global.sensitivity, 0.2, 3),
          smoothing: clamp(params.smoothing ?? state.global.smoothing, 0, 1),
          glow: clamp(params.glow ?? state.global.glow, 0, 1),
        };
        const nextState = {
          currentTemplateId: state.currentTemplateId,
          currentThemeId: state.currentThemeId,
          currentSpectrumStyle: state.currentSpectrumStyle,
          dynamicBackground: state.dynamicBackground,
          text: state.text,
          spectrumSettings: state.spectrumSettings,
          currentTheme: state.currentTheme,
          global: nextGlobal,
        };
        return {
          global: nextGlobal,
          slots: createSlotsFromState(nextState),
        };
      });
    },

    setSelectedSlot: (slotId) => set({ selectedSlot: slotId }),

    applyTemplate: (templateId) => {
      const template = getMVTemplate(templateId);
      const nextText = createDefaultTextConfig(template.textPosition);
      const nextBackground = createDefaultDynamicBackground(template.backgroundType);
      const nextSpectrumSettings = {
        barCount: template.barCount,
        radius: 124,
        barWidth: 8,
        mirror: template.spectrumStyle === 'mirrorBar',
      };
      const runtimeSeed = {
        currentTemplateId: template.id,
        currentThemeId: template.theme,
        currentSpectrumStyle: template.spectrumStyle,
        dynamicBackground: nextBackground,
        text: nextText,
        spectrumSettings: nextSpectrumSettings,
      };
      const runtime = createRuntimeState(runtimeSeed);
      set({
        currentTemplateId: template.id,
        currentThemeId: template.theme,
        currentSpectrumStyle: template.spectrumStyle,
        dynamicBackground: nextBackground,
        text: nextText,
        spectrumSettings: nextSpectrumSettings,
        currentTheme: runtime.currentTheme,
        global: {
          ...runtime.global,
          sensitivity: template.sensitivity,
          smoothing: template.smoothing,
          glow: template.glow,
        },
        slots: createSlotsFromState({
          ...runtimeSeed,
          global: {
            ...runtime.global,
            sensitivity: template.sensitivity,
            smoothing: template.smoothing,
            glow: template.glow,
          },
        }),
        recordingFormat: template.recommendedFormat,
      });
    },

    applyTheme: (themeId) => {
      set(state => {
        const runtimeSeed = {
          currentTemplateId: state.currentTemplateId,
          currentThemeId: themeId,
          currentSpectrumStyle: state.currentSpectrumStyle,
          dynamicBackground: state.dynamicBackground,
          text: state.text,
          spectrumSettings: state.spectrumSettings,
        };
        const runtime = createRuntimeState(runtimeSeed);
        return {
          currentThemeId: themeId,
          currentTheme: runtime.currentTheme,
          global: {
            ...runtime.global,
            sensitivity: state.global.sensitivity,
            smoothing: state.global.smoothing,
            glow: state.global.glow,
          },
          slots: createSlotsFromState({
            ...runtimeSeed,
            global: {
              ...runtime.global,
              sensitivity: state.global.sensitivity,
              smoothing: state.global.smoothing,
              glow: state.global.glow,
            },
          }),
        };
      });
    },

    setSpectrumStyle: (style) => {
      set(state => ({
        currentSpectrumStyle: style,
        spectrumSettings: {
          ...state.spectrumSettings,
          mirror: style === 'mirrorBar',
        },
        slots: createSlotsFromState({
          currentTemplateId: state.currentTemplateId,
          currentThemeId: state.currentThemeId,
          currentSpectrumStyle: style,
          dynamicBackground: state.dynamicBackground,
          text: state.text,
          global: state.global,
          spectrumSettings: {
            ...state.spectrumSettings,
            mirror: style === 'mirrorBar',
          },
        }),
      }));
    },

    updateText: (params) => {
      set(state => {
        const nextText = {
          ...state.text,
          ...params,
          position: isTextPosition(String(params.position ?? state.text.position))
            ? (params.position ?? state.text.position)
            : state.text.position,
        };
        return {
          text: nextText,
          slots: createSlotsFromState({
            currentTemplateId: state.currentTemplateId,
            currentThemeId: state.currentThemeId,
            currentSpectrumStyle: state.currentSpectrumStyle,
            dynamicBackground: state.dynamicBackground,
            text: nextText,
            global: state.global,
            spectrumSettings: state.spectrumSettings,
          }),
        };
      });
    },

    updateDynamicBackground: (params) => {
      set(state => {
        const nextDynamicBackground = {
          ...state.dynamicBackground,
          ...params,
        };
        return {
          dynamicBackground: nextDynamicBackground,
          slots: createSlotsFromState({
            currentTemplateId: state.currentTemplateId,
            currentThemeId: state.currentThemeId,
            currentSpectrumStyle: state.currentSpectrumStyle,
            dynamicBackground: nextDynamicBackground,
            text: state.text,
            global: state.global,
            spectrumSettings: state.spectrumSettings,
          }),
        };
      });
    },

    updateSpectrumSettings: (params) => {
      set(state => {
        const nextSpectrumSettings = {
          ...state.spectrumSettings,
          ...params,
        };
        return {
          spectrumSettings: nextSpectrumSettings,
          slots: createSlotsFromState({
            currentTemplateId: state.currentTemplateId,
            currentThemeId: state.currentThemeId,
            currentSpectrumStyle: state.currentSpectrumStyle,
            dynamicBackground: state.dynamicBackground,
            text: state.text,
            global: state.global,
            spectrumSettings: nextSpectrumSettings,
          }),
        };
      });
    },

    exportProject: () => {
      const state = get();
      return createExportProject(state);
    },

    importProject: (project) => {
      if (project.version !== '1.0') {
        throw new Error(`不支持的 MV 配置版本：${project.version}`);
      }
      const templateId = isMVTemplateId(project.preset) ? project.preset : DEFAULT_TEMPLATE_ID;
      const themeId = isMVThemeId(project.theme) ? project.theme : getMVTemplate(templateId).theme;
      const spectrumStyle = isSpectrumStyle(project.effects.spectrum.style)
        ? project.effects.spectrum.style
        : getMVTemplate(templateId).spectrumStyle;
      const text: MVTextConfig = {
        showTitle: Boolean(project.text.showTitle),
        songTitle: project.text.songTitle || 'Untitled Song',
        artistName: project.text.artistName || 'Unknown Artist',
        position: isTextPosition(project.text.position) ? project.text.position : 'bottom',
        fontSize: clamp(project.text.fontSize, 16, 96),
        textGlow: clamp(project.text.textGlow, 0, 1),
      };
      const dynamicBackground = {
        enabled: Boolean(project.effects.dynamicBackground.enabled),
        speed: clamp(project.effects.dynamicBackground.speed, 0.05, 1.5),
        audioReactive: Boolean(project.effects.dynamicBackground.audioReactive),
        type: isBackgroundType(project.effects.dynamicBackground.type)
          ? project.effects.dynamicBackground.type
          : getMVTemplate(templateId).backgroundType,
      };
      const spectrumSettings = {
        barCount: clamp(project.effects.spectrum.barCount, 24, 160),
        radius: clamp(project.effects.spectrum.radius, 48, 220),
        barWidth: clamp(project.effects.spectrum.barWidth, 2, 18),
        mirror: Boolean(project.effects.spectrum.mirror),
      };
      const runtimeSeed = {
        currentTemplateId: templateId,
        currentThemeId: themeId,
        currentSpectrumStyle: spectrumStyle,
        dynamicBackground,
        text,
        spectrumSettings,
      };
      const runtime = createRuntimeState(runtimeSeed);
      const global = {
        ...runtime.global,
        sensitivity: clamp(project.effects.spectrum.sensitivity, 0.2, 3),
        smoothing: clamp(project.effects.spectrum.smoothing, 0, 1),
        glow: clamp(project.effects.spectrum.glow, 0, 1),
      };
      set({
        currentTemplateId: templateId,
        currentThemeId: themeId,
        currentSpectrumStyle: spectrumStyle,
        text,
        dynamicBackground,
        spectrumSettings,
        currentTheme: runtime.currentTheme,
        global,
        slots: createSlotsFromState({
          ...runtimeSeed,
          global,
        }),
        recordingFormat: project.export.format,
      });
    },

    resetProject: () => {
      const initialState = createInitialState();
      set({
        slots: initialState.slots,
        global: initialState.global,
        currentTemplateId: initialState.currentTemplateId,
        currentThemeId: initialState.currentThemeId,
        currentSpectrumStyle: initialState.currentSpectrumStyle,
        currentTheme: initialState.currentTheme,
        text: initialState.text,
        dynamicBackground: initialState.dynamicBackground,
        spectrumSettings: initialState.spectrumSettings,
        recordingFormat: getMVTemplate(DEFAULT_TEMPLATE_ID).recommendedFormat,
      });
    },
  };
});

export function createMVRecordingFileName(text: MVTextConfig, format: MVRecordingFormatId): string {
  const suffix = createTimestampFilePart();
  const safeTitle = createProjectExportName(text).replace(/[<>:"/\\|?*]+/g, '-');
  const extension = format === 'mp4' ? 'mp4' : 'webm';
  return `${safeTitle}-${suffix}.${extension}`;
}
