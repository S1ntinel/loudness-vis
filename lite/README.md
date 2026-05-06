# LoudnessVis Lite

## 中文说明

这是 LoudnessVis 的 Lite 分发目录，使用单文件 HTML 页面作为演示版。

适用场景：

- 需要直接分发 HTML 版本
- 不依赖 Node.js、uv、Electron
- 希望用浏览器快速打开并试用音频可视化功能

目录说明：

- `index.html`：默认入口，直接打开即可
- `fonts/`：Lite 版所需字体资源

使用方式：

1. 直接双击 `index.html`
2. 或在浏览器中打开 `index.html`

建议：

- 优先使用 Edge 或 Chrome
- Lite 版只保留独立 HTML demo，不包含 React 主界面、Electron 设备能力或 UV 启动器
- 如果浏览器阻止本地音频访问，请改用“选择文件”按钮手动载入音频

## English

This folder contains the Lite distribution of LoudnessVis as a standalone HTML demo.

Use this bundle when you need:

- a shareable HTML-only demo
- no dependency on Node.js, uv, or Electron
- a quick browser-based preview of the audio visualization tool

Folder contents:

- `index.html`: default entry point
- `fonts/`: local font assets required by the Lite demo

How to use:

1. Double-click `index.html`
2. Or open `index.html` directly in a browser

Notes:

- Edge or Chrome is recommended
- The Lite bundle only includes the standalone HTML demo
- It does not include the React app, Electron device features, or the UV launcher
