// 全局类型声明：electron preload 暴露的 API + 预设系统全局桥接变量
export {};

declare global {
  interface Window {
    electronAPI?: {
      setAlwaysOnTop: (flag: boolean) => Promise<boolean>;
      getAlwaysOnTop: () => Promise<boolean>;
      listAudioSessions: () => Promise<Array<{
        sessionId: string;
        displayName: string;
        processName: string;
        processId: number;
        isSystemSession: boolean;
        active: boolean;
        muted: boolean;
        volumePercent: number;
        exePath: string;
        iconDataUrl: string;
      }>>;
      setAudioSessionMute: (sessionId: string, muted: boolean) => Promise<{
        sessionId: string;
        displayName: string;
        processName: string;
        processId: number;
        isSystemSession: boolean;
        active: boolean;
        muted: boolean;
        volumePercent: number;
        exePath: string;
        iconDataUrl: string;
      } | null>;
      setAudioSessionVolume: (sessionId: string, volumePercent: number) => Promise<{
        sessionId: string;
        displayName: string;
        processName: string;
        processId: number;
        isSystemSession: boolean;
        active: boolean;
        muted: boolean;
        volumePercent: number;
        exePath: string;
        iconDataUrl: string;
      } | null>;
      getAppVersion: () => Promise<string>;
      checkForUpdates: (force?: boolean) => Promise<{
        currentVersion: string;
        latestVersion: string;
        updateAvailable: boolean;
        url: string;
        checkedAt: number;
      }>;
      openExternal: (url: string) => Promise<boolean>;
    };
    __lvColorMode?: string;
    __lvSfMode?: string;
    __lvWaveRatio?: number;
    __engine?: import('./audio/engine').AudioEngine;
    webkitAudioContext?: typeof AudioContext;
  }
}
