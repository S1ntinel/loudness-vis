# LoudnessVis — 音频可视化工作台

[English](./README.md) | [简体中文](./README.zh-CN.md)

一个开源的音频可视化工作台，覆盖音频分析、录音与多轨整理、设备路由、MV 画布和可视化导出。LoudnessVis 把母带响度、波形削顶、动态范围、频率能量和立体声声场搬上屏幕，让“听不出来”的东西可以被看见。

仓库地址：<https://github.com/S1ntinel/loudness-vis>
感谢：<https://linux.do/>

## 预览视频

[![LoudnessVis 预览](./assets/demo/loudnessvis-demo.gif)](./assets/demo/loudnessvis-demo.mp4)

点击上方预览图可打开完整 MP4 产品视频。

## 界面截图

1.0 分析面板（已载入音频）：

![LoudnessVis 1.0 分析面板](./assets/screenshots/analysis-active-1.0.png)

录音与多轨编辑：

![LoudnessVis 1.0 录音与多轨编辑](./assets/screenshots/record-tracks-1.0.png)

MV 可视化编辑与导出：

![LoudnessVis 1.0 MV 可视化编辑](./assets/screenshots/mv-editor-1.0.png)

分析面板（未载入音频）：

![LoudnessVis 1.0 分析面板空状态](./assets/screenshots/analysis-empty-1.0.png)

## 这是什么

LoudnessVis 是一个用 React + TypeScript 搭建的音频可视化工作台。当前 `1.0` 版本已经不只是早期的响度战争主题原型，而是围绕四个主板块组织：分析、录音 / 多轨整理、设备控制和 MV 可视化导出。分析面板仍然适合观察现代音乐母带中的这些特征：

- 波形是否被过度压缩或削顶
- 动态范围是否塌缩
- 低频、中频、高频能量是否失衡
- 立体声声场是否过窄、偏移或相关性异常
- LUFS、True Peak、Loudness Range 等响度指标是否处在合理范围

当前仓库已进入 `1.0` 正式版阶段，源码以 MIT 协议开源。

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

### 设备 / 系统音量控制

- 输入 / 输出设备选择与输入电平监控
- 当前应用输出路由切换与默认输出回退
- Windows 音量合成器：单应用静音、音量调节、系统会话状态查看
- 系统音频录制前提示，避免只录到画面或空白音频

### MV 编辑 / 导出

- 模板、主题、频谱样式、动态背景与粒子特效
- 音频 / 视频 / 图片 / 歌词 / 字体素材库
- 项目导入 / 导出（含 zip / inline / path 模式）
- MV 录制导出预设与录制前音频配置提示

## 四个板块的使用说明

### 1. 分析（Analyze）

- 先点击“选择文件”导入一首音频。
- 通过波形面板定位播放位置；通过频谱、频谱图、声场和 LUFS 面板观察音频特征。
- `Shift + 滚轮` 可缩放波形/频谱图时间轴，双击可重置视图。
- 适合检查响度战争特征、削波、动态范围塌缩、频率能量失衡与立体声异常。

### 2. 录音（Record）

- 可录制麦克风，也可导入本地音频形成多轨列表。
- 若要录制系统播放声音，请先配置回环设备（如 Stereo Mix / 立体声混音），程序会在开始前给出提示。
- 每条轨道支持裁剪、试听、重命名、导出片段，以及多轨勾选后混音播放。
- 适合做片段整理、对比试听、临时采样与 WAV 导出。

### 3. 设备（Devices）

- 选择输入 / 输出设备，并查看输入电平变化。
- 可切换当前应用的播放输出设备，或回退到系统默认输出。
- Windows 桌面版下可查看系统音量合成器中的应用会话，并对会话执行静音 / 音量调节。
- 适合在展示、采集和系统路由场景下快速检查设备状态。

### 4. MV

- 导入音频、视频背景、图片层、歌词和字体后，可通过模板与效果机架快速组合画面。
- 可调整频谱样式、动态背景、粒子类型、文字层与素材显隐。
- 项目支持导入 / 导出，便于复用配置。
- 开始录制前请确认音频来源配置；程序会提醒你当前导出是否可能只有画面。

### 交付方式

- React Web 主界面，使用 Vite 开发和构建
- 单文件 Lite HTML 独立版，一个 HTML 文件即可运行核心分析
- UV 本地预览启动包，适合解压后本地运行与分发检查
- Electron 桌面版路线，当前已保留窗口置顶等桌面能力入口

## 可视化算法开源

可视化面板相关的核心算法已单独整理到 [`Visualization algorithm/`](./Visualization%20algorithm/) 作为说明索引。为避免重复源码快照，该目录不再保存 `src/` 镜像，权威实现以主目录 `src/` 为准：

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

该目录是算法索引和源码地图，便于单独审阅算法和可视化逻辑；它不是重复的源码树。

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

启动稳定的本地预览服务：

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

构建 UV 预览包：

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
| `assets/demo/` | README 预览媒体：首页 GIF 预览图与跳转 MP4 片段 |
| `assets/icons/` | 应用窗口与安装包图标 |
| `assets/screenshots/` | README 产品截图：分析面板、录音流程和上传目标弹窗 |
| `Visualization algorithm/` | 可视化面板算法和渲染逻辑的说明索引 |
| `public/` | Web 与打包流程共用的静态资源 |
| `UV/src/loudness_vis_uv/assets/lite.html` | 本地预览和 release 打包使用的 Lite HTML 保留资产 |
| `UV/src/loudness_vis_uv/assets/legacy.html` | 指向 Lite HTML 保留资产的兼容别名 |
| `UV/` | 基于 Python / uv 的本地预览启动包 |
| `electron/` | Electron 桌面入口 |
| `scripts/` | 构建、同步和打包脚本 |
| `docs/` | 开发日志与发布说明 |

## Release 说明

- Lite 单文件版本从 `UV/src/loudness_vis_uv/assets/lite.html` 打包，并在 Release 中统一标注为 `lite.html`。
- `legacy.html` 是早期保留名称，目前作为 UV / Lite 打包流程中的兼容别名存在。
- Lite 与 UV 分发包通过 GitHub Releases 提供，不放入主分支生成目录。
- `node_modules/`、`dist/`、`lite/`、`UV/dist/`、压缩包和本地日志不会纳入版本控制。

## 路线图

- [x] React 主界面迁移
- [x] 波形多频段染色和 LUFS 指标
- [x] 录音和多轨编辑器
- [x] 声谱图和声场分析球
- [x] 多轨频响叠加对比
- [x] 可视化算法整理为 `Visualization algorithm/`
- [x] 系统设备音量控制，基于 Electron + Windows COM
- [x] MV 编辑器，基于 Canvas 和视频导出

## 相关链接

- GitHub：<https://github.com/S1ntinel/loudness-vis>
- Releases：<https://github.com/S1ntinel/loudness-vis/releases>
- 个人主页：<https://github.com/S1ntinel>
- 感谢：<https://linux.do/>
- 嵌入式开发 10 日学习路线：<https://github.com/S1ntinel/embedded-learning-roadmap>

## 贡献者

- Claude
- Codex

## 许可证

MIT
