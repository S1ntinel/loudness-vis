// 全局类型声明：electron preload 暴露的 API
export {};

declare global {
  interface Window {
    electronAPI?: {
      setAlwaysOnTop: (flag: boolean) => Promise<boolean>;
      getAlwaysOnTop: () => Promise<boolean>;
    };
  }
}
