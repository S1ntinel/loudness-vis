import { create } from 'zustand';

export type Theme = 'light' | 'dark';
export type Tab = 'analyze' | 'record' | 'devices' | 'mv';
export type PresetTheme = 'default' | 'green' | 'pink' | 'cyan';
export type ColorPreset = PresetTheme;
export type SoundFieldMode = 'goniometer' | 'sphere';

interface UIState {
  theme: Theme;
  preset: PresetTheme;
  colorPreset: ColorPreset;
  tab: Tab;
  fileName: string;
  volume: number;
  gain: number;
  sfMode: SoundFieldMode;
  waveRatio: number;
  pendingUpload: File | null;
  viewStart: number;
  viewEnd: number;
  
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setPreset: (p: PresetTheme) => void;
  setColorPreset: (p: ColorPreset) => void;
  setTab: (t: Tab) => void;
  setFileName: (n: string) => void;
  setVolume: (v: number) => void;
  setGain: (g: number) => void;
  setSfMode: (m: SoundFieldMode) => void;
  setWaveRatio: (r: number) => void;
  setPendingUpload: (f: File | null) => void;
  zoomViewAt: (anchor: number, factor: number) => void;
  panViewBy: (delta: number) => void;
  resetView: () => void;
}

const THEME_KEY = 'lvTheme';
const PRESET_KEY = 'lvPreset';

const initialTheme: Theme = (() => {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'dark' ? 'dark' : 'light';
  } catch { return 'light'; }
})();

const initialPreset: PresetTheme = (() => {
  try {
    const v = localStorage.getItem(PRESET_KEY);
    if (v === 'green' || v === 'pink' || v === 'cyan') return v as PresetTheme;
  } catch { }
  return 'default';
})();

export const useUIStore = create<UIState>((set, get) => ({
  theme: initialTheme,
  preset: initialPreset,
  colorPreset: initialPreset,
  tab: 'analyze',
  fileName: '',
  volume: 0.6,
  gain: 0,
  sfMode: 'goniometer',
  waveRatio: 0.4,
  pendingUpload: null,
  viewStart: 0,
  viewEnd: 1,

  setTheme: t => {
    document.body.classList.toggle('dark', t === 'dark');
    try { localStorage.setItem(THEME_KEY, t); } catch { }
    set({ theme: t });
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
  setPreset: p => {
    document.body.classList.remove('preset-cyan', 'preset-green', 'preset-pink');
    if (p !== 'default') document.body.classList.add(`preset-${p}`);
    try { localStorage.setItem(PRESET_KEY, p); } catch { }
    set({ preset: p, colorPreset: p });
  },
  setColorPreset: p => get().setPreset(p),
  setTab: t => set({ tab: t }),
  setFileName: n => set({ fileName: n }),
  setVolume: v => set({ volume: v }),
  setGain: g => set({ gain: g }),
  setSfMode: m => set({ sfMode: m }),
  setWaveRatio: r => set({ waveRatio: r }),
  setPendingUpload: f => set({ pendingUpload: f }),
  zoomViewAt: (anchor, factor) => {
    const { viewStart, viewEnd } = get();
    const range = viewEnd - viewStart;
    if (range <= 0) return;
    const newRange = Math.max(0.001, Math.min(1, range / factor));
    const relAnchor = (anchor - viewStart) / range;
    let s = anchor - relAnchor * newRange;
    let e = anchor + (1 - relAnchor) * newRange;
    if (s < 0) { e -= s; s = 0; }
    if (e > 1) { s -= (e - 1); e = 1; }
    if (s < 0) s = 0;
    if (e > 1) e = 1;
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

document.body.classList.toggle('dark', initialTheme === 'dark');
if (initialPreset !== 'default') document.body.classList.add(`preset-${initialPreset}`);
