// 全局 UI 状态：theme、currentTab、fileName、volume
import { create } from 'zustand';

export type Theme = 'light' | 'dark';
export type Tab = 'analyze' | 'record' | 'devices' | 'mv';

interface UIState {
  theme: Theme;
  tab: Tab;
  fileName: string;
  volume: number;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setTab: (t: Tab) => void;
  setFileName: (n: string) => void;
  setVolume: (v: number) => void;
}

const STORAGE_KEY = 'lvTheme';

const initialTheme: Theme = (() => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
})();

export const useUIStore = create<UIState>((set, get) => ({
  theme: initialTheme,
  tab: 'analyze',
  fileName: '未加载（也可直接把音频文件拖到窗口）',
  volume: 0.6,
  setTheme: t => {
    document.body.classList.toggle('dark', t === 'dark');
    try { localStorage.setItem(STORAGE_KEY, t); } catch { /* noop */ }
    set({ theme: t });
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
  setTab: t => set({ tab: t }),
  setFileName: n => set({ fileName: n }),
  setVolume: v => set({ volume: v }),
}));

// 应用初始主题
document.body.classList.toggle('dark', initialTheme === 'dark');
