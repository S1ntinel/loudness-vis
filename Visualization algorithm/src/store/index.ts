// 全局 UI 状态：theme、currentTab、fileName、volume、uploadModal、preset
import { create } from 'zustand';

export type Theme = 'light' | 'dark';
export type Tab = 'analyze' | 'record' | 'devices' | 'mv';
export type PresetTheme = 'default' | 'green' | 'pink';

interface UIState {
  theme: Theme;
  preset: PresetTheme;
  tab: Tab;
  fileName: string;
  volume: number;
  gain: number;
  /** 上传目标选择 Modal —— 待用户选「分析 / 轨道」时存放 file */
  pendingUpload: File | null;
  /** 分析 Tab 波形/频谱图共享视图（0..1） */
  viewStart: number;
  viewEnd: number;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setPreset: (p: PresetTheme) => void;
  setTab: (t: Tab) => void;
  setFileName: (n: string) => void;
  setVolume: (v: number) => void;
  setGain: (g: number) => void;
  setPendingUpload: (f: File | null) => void;
  /** 以 anchor (0..1) 为锚点缩放，factor>1 放大、<1 缩小 */
  zoomViewAt: (anchor: number, factor: number) => void;
  panViewBy: (deltaRatio: number) => void;
  resetView: () => void;
}

const THEME_KEY = 'lvTheme';
const PRESET_KEY = 'lvPreset';

const initialTheme: Theme = (() => {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
})();

const initialPreset: PresetTheme = (() => {
  try {
    const v = localStorage.getItem(PRESET_KEY);
    if (v === 'green' || v === 'pink') return v;
    if (v === 'cyan') return 'green';
  } catch { /* noop */ }
  return 'default';
})();

export const useUIStore = create<UIState>((set, get) => ({
  theme: initialTheme,
  preset: initialPreset,
  tab: 'analyze',
  fileName: '',
  volume: 0.6,
  gain: 0,
  pendingUpload: null,
  viewStart: 0,
  viewEnd: 1,
  setTheme: t => {
    document.body.classList.toggle('dark', t === 'dark');
    try { localStorage.setItem(THEME_KEY, t); } catch { /* noop */ }
    set({ theme: t });
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
  setPreset: p => {
    // 移除所有预设 class
    document.body.classList.remove('preset-cyan', 'preset-green', 'preset-pink');
    // 添加新预设 class
    if (p !== 'default') {
      document.body.classList.add(`preset-${p}`);
    }
    try { localStorage.setItem(PRESET_KEY, p); } catch { /* noop */ }
    set({ preset: p });
  },
  setTab: t => set({ tab: t }),
  setFileName: n => set({ fileName: n }),
  setVolume: v => set({ volume: v }),
  setGain: g => set({ gain: g }),
  setPendingUpload: f => set({ pendingUpload: f }),
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

// 应用初始主题和预设
document.body.classList.toggle('dark', initialTheme === 'dark');
if (initialPreset !== 'default') {
  document.body.classList.add(`preset-${initialPreset}`);
}
