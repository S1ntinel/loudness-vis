// 安全 IPC 桥（阶段 5 会扩展）
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 占位，后续阶段在这里挂 Windows 音频 API
});
