# Visualization algorithm_CN

这个目录是当前 LoudnessVis **分析 / 可视化链路的源码快照镜像**。

它保留了主项目中的目录结构和相对引用关系，因此这里不是重新整理后的独立工程，而是面向阅读、开源和归档用途的一份“按原结构镜像”的源码副本。

## 当前包含范围

这份快照当前覆盖的是与音频分析、画面可视化以及分析/轨道可视化流程直接相关的代码，包括：

- 音频 DSP 与指标计算
- 分析页装配与交互
- Canvas 可视化面板
- 录音页里与波形/轨道可视化直接相关的工具代码
- 为这些模块服务的最小 store / theme 依赖

## 已镜像的文件组

| 分组 | 镜像路径 |
| --- | --- |
| 音频 / DSP 核心 | `src/audio/*.ts` |
| 可视化面板 | `src/panels/*.tsx`, `src/panels/Spectrogram.module.css` |
| 分析页 | `src/tabs/Analyze/*` |
| 最小共享状态 | `src/store/index.ts` |
| 主题依赖 | `src/theme/index.ts`, `src/theme/tokens.css` |

## 主要源码入口

| 模块 | 文件 | 作用 |
| --- | --- | --- |
| FFT / DSP 基础 | `src/audio/fft.ts`, `src/audio/dsp.ts` | FFT、窗函数、滤波辅助 |
| 波形着色与统计 | `src/audio/coloredPeaks.ts`, `src/audio/stats.ts` | 波形峰值采样、频谱重心 hue 映射、低中高频 RGB 染色、动态范围统计 |
| 平均频谱与声谱图 | `src/audio/avgSpectrum.ts`, `src/audio/spectrogram.ts`, `src/panels/Spectrum.tsx`, `src/panels/SpectrumLegend.tsx`, `src/panels/Spectrogram.tsx` | 实时频谱、整曲平均频谱、STFT 时频热图 |
| 声场分析 | `src/audio/soundField.ts`, `src/panels/Goniometer.tsx`, `src/panels/SoundField.tsx` | 相位仪、Mid/Side 散点、四频段空间分布 |
| 响度指标 | `src/audio/lufs.ts`, `src/panels/LufsDisplay.tsx`, `src/panels/StatBar.tsx` | LUFS、True Peak、LRA、RMS、峰值因子、相关性等 |
| 运行时装配 | `src/audio/engine.ts`, `src/audio/useEngineState.ts`, `src/tabs/Analyze/index.tsx` | 音频加载、预计算、分析页联动 |
| 轨道侧可视化工具 | `src/audio/trackEngine.ts`, `src/audio/useTrackState.ts`, `src/audio/wavEncoder.ts`, `src/panels/ScrollingWaveform.tsx`, `src/panels/TrackItem.tsx`, `src/panels/TrackList.tsx` | 录音波形预览、轨道裁剪、WAV 导出、多轨可视化 |
| UI 依赖 | `src/store/index.ts`, `src/theme/index.ts`, `src/theme/tokens.css`, `src/tabs/Analyze/Analyze.module.css`, `src/panels/ColorModeSwitch.tsx`, `src/panels/Spectrogram.module.css` | 面板状态、主题变量、配色切换、样式依赖 |

## 明确不包含的内容

这份快照依然**不等于整个产品源码**。以下内容仍被排除：

- `electron/` 下的桌面壳与 IPC 代码
- `src/tabs/Devices/` 中的设备路由 / Windows 音量合成器 UI
- `src/tabs/MV/` 中的 MV 编辑器 / 导出器
- `src/components/` 下的通用业务组件
- 打包脚本、UV 启动包、发布产物

## 使用说明

- 这不是一个可直接安装的 npm 包，而是一份源码快照。
- 如果你想看“算法本体”，优先从 `src/audio/` 开始。
- 如果你想看“算法如何绘制到屏幕上”，继续看 `src/panels/`。
- 如果你想看“整页如何组织这些面板”，看 `src/tabs/Analyze/index.tsx`。
- 如果你想看“录音页里与波形/轨道可视化相关的算法辅助”，看 `trackEngine.ts`、`ScrollingWaveform.tsx`、`TrackItem.tsx`、`TrackList.tsx`。

## 说明事项

- 该实现面向浏览器 Web Audio API 与 React Canvas 面板。
- 这份快照应尽量跟随主工作区同步更新；它不是分叉实现，而是镜像副本。
- 当前快照中的声谱图实现使用工作区最新版本，默认 `fftSize = 2048`，50% overlap，并基于 `spec.timeBins` 生成位图宽度。
- True Peak 采用简化的 4 倍线性插值近似，不是广播级 sinc oversampling 实现。
- 代码协议与仓库主项目一致，均为 MIT。
