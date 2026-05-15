// 安全 IPC 桥
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('win:set-always-on-top', flag),
  getAlwaysOnTop: () => ipcRenderer.invoke('win:get-always-on-top'),
  listAudioSessions: () => ipcRenderer.invoke('audio-sessions:list'),
  setAudioSessionMute: (sessionId, muted) => ipcRenderer.invoke('audio-sessions:set-mute', sessionId, muted),
  setAudioSessionVolume: (sessionId, volumePercent) => ipcRenderer.invoke('audio-sessions:set-volume', sessionId, volumePercent),
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  checkForUpdates: (force) => ipcRenderer.invoke('app:check-for-updates', force),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
});
