// 安全 IPC 桥
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /** 设置窗口是否始终置顶 */
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('win:set-always-on-top', flag),
  /** 查询窗口当前置顶状态 */
  getAlwaysOnTop: () => ipcRenderer.invoke('win:get-always-on-top'),
  /** 枚举当前 Windows 音频会话 */
  listAudioSessions: () => ipcRenderer.invoke('audio-sessions:list'),
  /** 设置指定音频会话静音状态 */
  setAudioSessionMute: (sessionId, muted) => ipcRenderer.invoke('audio-sessions:set-mute', sessionId, muted),
  /** 设置指定音频会话音量百分比 */
  setAudioSessionVolume: (sessionId, volumePercent) => ipcRenderer.invoke('audio-sessions:set-volume', sessionId, volumePercent),
});
