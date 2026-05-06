// 安全 IPC 桥
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /** 设置窗口是否始终置顶 */
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('win:set-always-on-top', flag),
  /** 查询窗口当前置顶状态 */
  getAlwaysOnTop: () => ipcRenderer.invoke('win:get-always-on-top'),
});
