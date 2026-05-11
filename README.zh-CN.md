# LoudnessVis — 响度战争可视化分析器

[English](./README.md) | [简体中文](./README.zh-CN.md)

一个开源的音频可视化工具，把母带响度、波形削顶、动态范围、频率能量和立体声声场搬上屏幕，让“听不出来”的东西可以被看见。

仓库地址：<https://github.com/S1ntinel/loudness-vis>
感谢：<https://linux.do/>

## 演示视频

[![LoudnessVis 演示预览](./assets/demo/loudnessvis-demo.gif)](./assets/demo/loudnessvis-demo.mp4)

点击上方预览图可打开 20 秒 MP4 演示片段。

## 这是什么

LoudnessVis 是一个用 React + TypeScript 搭建的音频可视化项目，主要用于观察现代音乐母带中的响度战争特征：

- 波形是否被过度压缩或削顶
- 动态范围是否塌缩
- 低频、中频、高频能量是否失衡
- 立体声声场是否过窄、偏移或相关性异常
- LUFS、True Peak、Loudness Range 等响度指标是否处在合理范围

项目当前处于 `v0.2` 阶段，源码以 MIT 协议开源。

## 功能

### 分析面板

- 整曲波形概览，支持点击 / 拖动定位播放位置
- RGB 三频段染色和频谱重心 hue 映射，用颜色观察低频 / 中频 / 高频能量分布
- 实时频谱曲线，支持多轨频响曲线叠加、独立颜色和隐藏切换
- 整曲声谱图热力图，使用 Magma 调色板展示时间 × 对数频率分布
- 声场指示器和 4 频段声场分析球，用于观察立体声宽度、Mid / Side 关系和声道平衡
- LUFS 响度显示：Momentary、Short-term、Integrated、True Peak、Loudness Range
- 统计指标：峰值、RMS、峰值因子、动态范围、削波率和声道相关性

### 录音 / 轨道编辑

- 浏览器录音和本地音频拖入
- 录音实时滚动波形
- 多轨列表和迷你波形预览
- 片段双端点裁剪、试听切换和 WAV 导出
- 多轨勾选后一键混音播放

### 交付方式

- React Web 主界面，使用 Vite 开发和构建
- 单文件 Lite HTML 独立版，一个 HTML 文件即可运行核心分析
- UV 本地启动包，适合解压后本地演示
- Electron 桌面版路线，当前已保留窗口置顶等桌面能力入口

## 可视化算法开源

可视化面板相关的核心算法已单独整理到 [`Visualization algorithm/`](./Visualization%20algorithm/)：

| 模块 | 说明 |
| --- | --- |
| `src/audio/fft.ts`、`dsp.ts` | FFT、窗函数和基础 DSP 工具 |
| `src/audio/avgSpectrum.ts` | 整曲平均频谱分析 |
| `src/audio/coloredPeaks.ts` | 波形三频段染色和频谱重心映射 |
| `src/audio/spectrogram.ts` | STFT 声谱图计算和 bitmap 渲染 |
| `src/audio/soundField.ts` | 4 频段声场分析 |
| `src/audio/lufs.ts` | 简化版 ITU-R BS.1770 / EBU R128 LUFS、True Peak、LRA |
| `src/panels/` | Canvas 可视化面板实现 |
| `src/tabs/Analyze/` | 分析面板布局和交互编排 |

该目录是从当前实现中抽出的开源快照，便于单独审阅算法和可视化逻辑。

## 技术栈

| 层面 | 选型 |
| --- | --- |
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 5 |
| 状态管理 | Zustand |
| 桌面壳 | Electron 32 |
| 音频 DSP | 手写 TypeScript：FFT / STFT / LUFS / 频谱分析 / WAV 导出 |
| 本地启动器 | Python + uv |
| 协议 | MIT |

DSP 部分没有引入第三方音频分析库。FFT、STFT、频谱分析、LUFS 计算、声场分析和 WAV 导出都在仓库源码中实现。

## 快速开始

```powershell
git clone https://github.com/S1ntinel/loudness-vis.git
cd loudness-vis
npm install
npm run dev
```

构建 React 主应用：

```powershell
npm run build
```

启动稳定的本地演示服务：

```powershell
npm run start:local
```

在 localhost 打开保留的 Lite HTML：

```powershell
npm run start:lite
```

刷新 Lite 分发目录：

```powershell
npm run lite:build
```

构建 UV 演示包：

```powershell
npm run uv:build
```

以开发模式运行 Electron：

```powershell
npm run dev:electron
```

也可以从 [Releases](https://github.com/S1ntinel/loudness-vis/releases) 下载 Lite HTML 或 UV 本地启动包。

## 仓库结构

| 路径 | 说明 |
| --- | --- |
| `src/` | React 应用、音频引擎、DSP 工具和可视化面板 |
| `assets/demo/` | README 演示资源：首页 GIF 预览图与跳转 MP4 片段 |
| `Visualization algorithm/` | 可视化面板算法和渲染逻辑的开源整理版 |
| `public/` | Web 与打包流程共用的静态资源 |
| `lite.html` | 保留下来的单文件 Lite HTML 源文件 |
| `legacy.html` | 指向 Lite HTML 的兼容别名 |
| `lite/` | 适合独立分发的 HTML Lite 包 |
| `UV/` | 基于 Python / uv 的本地演示启动包 |
| `electron/` | Electron 桌面入口 |
| `scripts/` | 构建、同步和打包脚本 |

## Release 说明

- Lite 单文件版本在 Release 中统一标注为 `lite.html`。
- `legacy.html` 是早期保留名称，目前作为兼容别名存在。
- Lite 与 UV 分发包通过 GitHub Releases 提供，不放入主分支生成目录。
- `node_modules/`、`dist/`、`lite/`、`UV/dist/`、压缩包和本地日志不会纳入版本控制。

## 路线图

- [x] React 主界面迁移
- [x] 波形多频段染色和 LUFS 指标
- [x] 录音和多轨编辑器
- [x] 声谱图和声场分析球
- [x] 多轨频响叠加对比
- [x] 可视化算法整理为 `Visualization algorithm/`
- [ ] 系统设备音量控制，基于 Electron + Windows COM
- [ ] MV 编辑器，基于 Canvas 和视频导出

## 相关链接

- GitHub：<https://github.com/S1ntinel/loudness-vis>
- Releases：<https://github.com/S1ntinel/loudness-vis/releases>
- 个人主页：<https://github.com/S1ntinel>
- 感谢：<https://linux.do/>
- 嵌入式开发 10 日学习路线：<https://github.com/S1ntinel/embedded-learning-roadmap>

## 许可证

MIT
