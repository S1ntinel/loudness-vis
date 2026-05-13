// 预设系统：保存/加载界面状态快照
import { create } from 'zustand';
import { engine, type ColorMode } from '../audio/engine';
import { useUIStore, type SoundFieldMode, type Theme } from './index';

export interface PresetSnapshot {
  theme: Theme;
  colorMode: ColorMode;
  sfMode: SoundFieldMode;
  waveRatio: number;
}

export interface Preset {
  id: string;
  name: string;
  snapshot: PresetSnapshot;
  builtIn?: boolean;
}

const STORAGE_KEY = 'lvPresets';
const CURRENT_KEY = 'lvCurrentPreset';

const DEFAULT_PRESETS: Preset[] = [
  {
    id: 'default',
    name: 'Default',
    builtIn: true,
    snapshot: { theme: 'dark', colorMode: 'multiband', sfMode: 'goniometer', waveRatio: 0.4 },
  },
  {
    id: 'mastering',
    name: 'Mastering',
    builtIn: true,
    snapshot: { theme: 'dark', colorMode: 'map', sfMode: 'sphere', waveRatio: 0.30 },
  },
  {
    id: 'mixing',
    name: 'Mixing',
    builtIn: true,
    snapshot: { theme: 'dark', colorMode: 'multiband', sfMode: 'sphere', waveRatio: 0.50 },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    builtIn: true,
    snapshot: { theme: 'light', colorMode: 'mono', sfMode: 'goniometer', waveRatio: 0.45 },
  },
];

interface PresetState {
  presets: Preset[];
  currentId: string;
  /** 是否当前快照与已选预设有差异（"未保存修改"指示） */
  dirty: boolean;
  current: () => Preset | undefined;
  applyPreset: (id: string) => void;
  saveAs: (name: string) => string;
  overwriteCurrent: () => void;
  deletePreset: (id: string) => void;
  rename: (id: string, name: string) => void;
  next: () => void;
  prev: () => void;
  /** 当 UI 状态变化后调用，更新 dirty 标记 */
  recheckDirty: () => void;
}

function captureSnapshot(): PresetSnapshot {
  const ui = useUIStore.getState();
  return {
    theme: ui.theme,
    colorMode: engine.colorMode,
    sfMode: ui.sfMode,
    waveRatio: ui.waveRatio,
  };
}

function applySnapshot(s: PresetSnapshot): void {
  const ui = useUIStore.getState();
  ui.setTheme(s.theme);
  engine.setColorMode(s.colorMode);
  ui.setSfMode(s.sfMode);
  ui.setWaveRatio(s.waveRatio);
}

function snapshotsEqual(a: PresetSnapshot, b: PresetSnapshot): boolean {
  return a.theme === b.theme
    && a.colorMode === b.colorMode
    && a.sfMode === b.sfMode
    && Math.abs(a.waveRatio - b.waveRatio) < 0.005;
}

function loadFromStorage(): { presets: Preset[]; currentId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as Preset[];
      const cid = localStorage.getItem(CURRENT_KEY) || 'default';
      // 合并内置（如果用户清掉了又重启，仍能用内置）
      const userIds = new Set(arr.map(p => p.id));
      const missingBuiltins = DEFAULT_PRESETS.filter(p => !userIds.has(p.id));
      return { presets: [...missingBuiltins, ...arr], currentId: cid };
    }
  } catch { /* noop */ }
  return { presets: DEFAULT_PRESETS.slice(), currentId: 'default' };
}

function saveToStorage(presets: Preset[], currentId: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    localStorage.setItem(CURRENT_KEY, currentId);
  } catch { /* noop */ }
}

const init = loadFromStorage();

export const usePresetStore = create<PresetState>((set, get) => ({
  presets: init.presets,
  currentId: init.currentId,
  dirty: false,

  current: () => get().presets.find(p => p.id === get().currentId),

  applyPreset: (id) => {
    const p = get().presets.find(p => p.id === id);
    if (!p) return;
    set({ currentId: id, dirty: false });
    saveToStorage(get().presets, id);
    applySnapshot(p.snapshot);
  },

  saveAs: (name) => {
    const id = String(Date.now()) + '_' + Math.floor(Math.random() * 1000);
    const np: Preset = { id, name: name.trim() || 'Untitled', snapshot: captureSnapshot() };
    const presets = [...get().presets, np];
    set({ presets, currentId: id, dirty: false });
    saveToStorage(presets, id);
    return id;
  },

  overwriteCurrent: () => {
    const id = get().currentId;
    const p = get().presets.find(p => p.id === id);
    if (!p) return;
    if (p.builtIn) return;   // 内置预设不可覆盖
    const presets = get().presets.map(p =>
      p.id === id ? { ...p, snapshot: captureSnapshot() } : p
    );
    set({ presets, dirty: false });
    saveToStorage(presets, id);
  },

  deletePreset: (id) => {
    const target = get().presets.find(p => p.id === id);
    if (!target || target.builtIn) return;   // 内置不可删
    const presets = get().presets.filter(p => p.id !== id);
    let cid = get().currentId;
    if (cid === id) cid = 'default';
    set({ presets, currentId: cid });
    saveToStorage(presets, cid);
    if (cid !== get().currentId) get().applyPreset(cid);
  },

  rename: (id, name) => {
    const presets = get().presets.map(p => p.id === id ? { ...p, name: name.trim() || p.name } : p);
    set({ presets });
    saveToStorage(presets, get().currentId);
  },

  next: () => {
    const ps = get().presets;
    const idx = ps.findIndex(p => p.id === get().currentId);
    const np = ps[(idx + 1) % ps.length];
    if (np) get().applyPreset(np.id);
  },

  prev: () => {
    const ps = get().presets;
    const idx = ps.findIndex(p => p.id === get().currentId);
    const np = ps[(idx - 1 + ps.length) % ps.length];
    if (np) get().applyPreset(np.id);
  },

  recheckDirty: () => {
    const cur = get().presets.find(p => p.id === get().currentId);
    if (!cur) { set({ dirty: false }); return; }
    set({ dirty: !snapshotsEqual(cur.snapshot, captureSnapshot()) });
  },
}));

// 监听 UI 状态变化自动 recheckDirty
useUIStore.subscribe((state, prev) => {
  if (state.theme !== prev.theme
      || state.sfMode !== prev.sfMode
      || Math.abs(state.waveRatio - prev.waveRatio) > 0.005) {
    usePresetStore.getState().recheckDirty();
  }
});
// engine.colorMode 变化也要监听（engine 自己有 subscribe）
engine.subscribe(() => usePresetStore.getState().recheckDirty());
