// 预设系统：保存 / 加载 / 管理界面预设
import { create } from 'zustand';
import { useUIStore } from './index';

export interface Preset {
  id: string;
  name: string;
  createdAt: number;
  /** 快照 */
  snapshot: PresetSnapshot;
}

export interface PresetSnapshot {
  theme: 'light' | 'dark';
  colorMode: string;
  sfMode: string;
  waveRatio: number;
  viewStart: number;
  viewEnd: number;
}

const STORAGE_KEY = 'lvPresets';
const MAX_PRESETS = 20;

/** 从当前 UI 状态抓取快照 */
export function captureSnapshot(): PresetSnapshot {
  const ui = useUIStore.getState();
  // colorMode 和 sfMode 从 window 全局变量读取（避免引入循环依赖）
  const colorMode = window.__lvColorMode ?? 'multiband';
  const sfMode = window.__lvSfMode ?? 'goniometer';
  const waveRatio = window.__lvWaveRatio ?? 0.5;
  return {
    theme: ui.theme,
    colorMode,
    sfMode,
    waveRatio,
    viewStart: ui.viewStart,
    viewEnd: ui.viewEnd,
  };
}

/** 应用快照到 UI */
export function applySnapshot(snap: PresetSnapshot) {
  const ui = useUIStore.getState();
  ui.setTheme(snap.theme);
  ui.viewStart !== snap.viewStart && useUIStore.setState({ viewStart: snap.viewStart });
  ui.viewEnd !== snap.viewEnd && useUIStore.setState({ viewEnd: snap.viewEnd });
  // colorMode / sfMode / waveRatio 需要写回 window 全局变量
  window.__lvColorMode = snap.colorMode;
  window.__lvSfMode = snap.sfMode;
  window.__lvWaveRatio = snap.waveRatio;
}

function loadFromStorage(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Preset[];
  } catch {
    return [];
  }
}

function saveToStorage(presets: Preset[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch { /* noop */ }
}

interface PresetState {
  presets: Preset[];
  currentIndex: number;
  /** 加载预设列表 */
  load: () => void;
  /** 保存新预设 */
  save: (name: string) => void;
  /** 删除预设 */
  remove: (id: string) => void;
  /** 重命名预设 */
  rename: (id: string, name: string) => void;
  /** 切换到指定索引 */
  select: (index: number) => void;
  /** 上一个 */
  prev: () => void;
  /** 下一个 */
  next: () => void;
}

export const usePresetStore = create<PresetState>((set, get) => ({
  presets: loadFromStorage(),
  currentIndex: -1,

  load: () => {
    set({ presets: loadFromStorage() });
  },

  save: (name) => {
    const { presets } = get();
    if (presets.length >= MAX_PRESETS) return;
    const snapshot = captureSnapshot();
    const preset: Preset = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      createdAt: Date.now(),
      snapshot,
    };
    const next = [...presets, preset];
    saveToStorage(next);
    set({ presets: next, currentIndex: next.length - 1 });
  },

  remove: (id) => {
    const { presets, currentIndex } = get();
    const next = presets.filter(p => p.id !== id);
    saveToStorage(next);
    set({
      presets: next,
      currentIndex: currentIndex >= next.length ? next.length - 1 : currentIndex,
    });
  },

  rename: (id, name) => {
    const { presets } = get();
    const next = presets.map(p => p.id === id ? { ...p, name } : p);
    saveToStorage(next);
    set({ presets: next });
  },

  select: (index) => {
    const { presets } = get();
    if (index < 0 || index >= presets.length) return;
    applySnapshot(presets[index].snapshot);
    set({ currentIndex: index });
  },

  prev: () => {
    const { currentIndex, presets } = get();
    if (presets.length === 0) return;
    const next = currentIndex <= 0 ? presets.length - 1 : currentIndex - 1;
    get().select(next);
  },

  next: () => {
    const { currentIndex, presets } = get();
    if (presets.length === 0) return;
    const next = currentIndex >= presets.length - 1 ? 0 : currentIndex + 1;
    get().select(next);
  },
}));
