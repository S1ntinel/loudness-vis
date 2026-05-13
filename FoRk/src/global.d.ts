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
    };
    /** 预设系统桥接：colorMode（写入由 ColorModeSwitch，读取由 usePresetStore） */
    __lvColorMode?: string;
    /** 预设系统桥接：sound field mode（写入由 Analyze，读取由 usePresetStore） */
    __lvSfMode?: string;
    /** 预设系统桥接：waveform/spectrogram split ratio（写入由 Analyze，读取由 usePresetStore） */
    __lvWaveRatio?: number;
    /** dev 调试入口 */
    __engine?: import('./audio/engine').AudioEngine;
    webkitAudioContext?: typeof AudioContext;
  }
}
