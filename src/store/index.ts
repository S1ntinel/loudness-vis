// 全局 UI 状态：theme、currentTab、fileName、volume、uploadModal、视图缩放、预设相关 UI 切换
import { create } from 'zustand';

export type Theme = 'light' | 'dark';
export type Tab = 'analyze' | 'record' | 'devices' | 'mv';
export type SoundFieldMode = 'goniometer' | 'sphere';
export type ColorPreset = 'default' | 'cyan' | 'pink';

interface UIState {
  theme: Theme;
  /** 色彩主题预设（独立于"功能预设" PresetBar） */
  colorPreset: ColorPreset;
  tab: Tab;
  fileName: string;
  volume: number;
  /** 增益 dB（-12..+12，独立于 volume，最终输出 = volume × 10^(gain/20)） */
  gain: number;
  /** 上传目标选择 Modal —— 待用户选「分析 / 轨道」时存放 file */
  pendingUpload: File | null;
  /** 分析 Tab 波形/频谱图共享视图（0..1） */
  viewStart: number;
  viewEnd: number;
  /** 声场指示器模式（散点 vs 频段球） */
  sfMode: SoundFieldMode;
  /** 波形面板占下半区比例（0..1） */
  waveRatio: number;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setColorPreset: (p: ColorPreset) => void;
  setTab: (t: Tab) => void;
  setFileName: (n: string) => void;
  setVolume: (v: number) => void;
  setGain: (g: number) => void;
  setPendingUpload: (f: File | null) => void;
  setSfMode: (m: SoundFieldMode) => void;
  setWaveRatio: (r: number) => void;
  /** 以 anchor (0..1) 为锚点缩放，factor>1 放大、<1 缩小 */
  zoomViewAt: (anchor: number, factor: number) => void;
  panViewBy: (deltaRatio: number) => void;
  resetView: () => void;
}

const STORAGE_KEY = 'lvTheme';
const SF_KEY = 'lvSoundFieldMode';
const WAVE_KEY = 'lvWaveRatio';
const COLOR_PRESET_KEY = 'lvColorPreset';

const initialTheme: Theme = (() => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
})();

const initialSfMode: SoundFieldMode = (() => {
  try {
    const v = localStorage.getItem(SF_KEY);
    return v === 'sphere' ? 'sphere' : 'goniometer';
  } catch {
    return 'goniometer';
  }
})();

const initialWaveRatio: number = (() => {
  try {
    const v = parseFloat(localStorage.getItem(WAVE_KEY) || '');
    if (Number.isFinite(v) && v > 0.05 && v < 0.95) return v;
  } catch { /* noop */ }
  return 0.4;
})();

const initialColorPreset: ColorPreset = (() => {
  try {
    const v = localStorage.getItem(COLOR_PRESET_KEY);
    if (v === 'cyan' || v === 'pink') return v;
  } catch { /* noop */ }
  return 'default';
})();

export const useUIStore = create<UIState>((set, get) => ({
  theme: initialTheme,
  colorPreset: initialColorPreset,
  tab: 'analyze',
  fileName: '未加载（也可直接把音频文件拖到窗口）',
  volume: 0.6,
  gain: 0,
  pendingUpload: null,
  viewStart: 0,
  viewEnd: 1,
  sfMode: initialSfMode,
  waveRatio: initialWaveRatio,
  setTheme: t => {
    document.body.classList.toggle('dark', t === 'dark');
    try { localStorage.setItem(STORAGE_KEY, t); } catch { /* noop */ }
    set({ theme: t });
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
  setColorPreset: p => {
    document.body.classList.remove('preset-cyan', 'preset-pink');
    if (p !== 'default') document.body.classList.add('preset-' + p);
    try { localStorage.setItem(COLOR_PRESET_KEY, p); } catch { /* noop */ }
    set({ colorPreset: p });
  },
  setTab: t => set({ tab: t }),
  setFileName: n => set({ fileName: n }),
  setVolume: v => set({ volume: v }),
  setGain: g => set({ gain: g }),
  setPendingUpload: f => set({ pendingUpload: f }),
  setSfMode: m => {
    try { localStorage.setItem(SF_KEY, m); } catch { /* noop */ }
    set({ sfMode: m });
  },
  setWaveRatio: r => {
    try { localStorage.setItem(WAVE_KEY, String(r)); } catch { /* noop */ }
    set({ waveRatio: r });
  },
  zoomViewAt: (anchor, factor) => {
    const { viewStart, viewEnd } = get();
    const range = viewEnd - viewStart;
    if (range <= 0) return;
    const newRange = Math.max(0.001, Math.min(1, range / factor));
    const relAnchor = (anchor - viewStart) / range; // 0..1 在窗口中的相对位置
    let s = anchor - relAnchor * newRange;
    let e = anchor + (1 - relAnchor) * newRange;
    if (s < 0) { e -= s; s = 0; }
    if (e > 1) { s -= (e - 1); e = 1; }
    if (s < 0) s = 0;
    if (e > 1) e = 1;
    if (e - s < 0.001) return;
    set({ viewStart: s, viewEnd: e });
  },
  panViewBy: delta => {
    const { viewStart, viewEnd } = get();
    const range = viewEnd - viewStart;
    let s = viewStart + delta;
    let e = viewEnd + delta;
    if (s < 0) { s = 0; e = range; }
    if (e > 1) { e = 1; s = 1 - range; }
    set({ viewStart: s, viewEnd: e });
  },
  resetView: () => set({ viewStart: 0, viewEnd: 1 }),
}));

// 应用初始主题 + 色彩预设
document.body.classList.toggle('dark', initialTheme === 'dark');
if (initialColorPreset !== 'default') {
  document.body.classList.add('preset-' + initialColorPreset);
}
