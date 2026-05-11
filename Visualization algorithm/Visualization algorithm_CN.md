# Visualization algorithm_CN

这个目录是从 LoudnessVis 分析页中单独整理出来的一份“可视化算法源码快照”，主要目的是把和可视化面板直接相关的实现抽出来，方便单独开源、阅读和复用。

它保留了原始的目录结构和相对引用关系，所以这里的代码基本就是主应用里对应实现的直接映射，而不是重新包装过的一套独立工程。

## 包含内容

- 波形概览与颜色映射
- 实时频谱与整曲平均频谱
- 声谱图生成与渲染
- 相位仪 / Mid-Side 立体声视图
- 四频段声场分析球
- LUFS、True Peak、LRA 以及动态范围相关指标

## 不包含内容

- 录音轨道管理
- Electron 桌面壳
- UV 启动包和发布脚本
- 与分析面板无关的业务界面

## 主要源码入口

| 模块 | 文件 | 作用 |
| --- | --- | --- |
| FFT / DSP 基础 | `src/audio/fft.ts`, `src/audio/dsp.ts` | FFT、窗函数、滤波辅助 |
| 波形着色 | `src/audio/coloredPeaks.ts` | 波形峰值采样、频谱重心 hue 映射、低中高频 RGB 染色 |
| 平均频谱 | `src/audio/avgSpectrum.ts` | 整曲频响统计 |
| 声谱图 | `src/audio/spectrogram.ts` | STFT、时频矩阵、dB 归一化、位图渲染 |
| 声场分析 | `src/audio/soundField.ts` | 四频段左右声道空间分布计算 |
| 响度指标 | `src/audio/lufs.ts`, `src/audio/stats.ts` | LUFS、True Peak、LRA、RMS、峰值因子等 |
| 面板渲染 | `src/panels/` | React Canvas 面板实现 |
| 运行时装配 | `src/audio/engine.ts`, `src/tabs/Analyze/index.tsx` | 音频加载、预计算、面板联动 |

## 使用说明

- 这不是一个可直接安装的 npm 包，而是一份源码快照。
- 如果你想看“算法本体”，优先从 `src/audio/` 开始。
- 如果你想看“算法如何被画到屏幕上”，再结合 `src/panels/` 一起看。
- 如果你想看“整页如何组织这些面板”，看 `src/tabs/Analyze/index.tsx`。

## 说明事项

- 该实现面向浏览器 Web Audio API 和 React Canvas 面板。
- 当前快照中的声谱图实现使用工作区最新版本，默认 `fftSize = 2048`，50% overlap，并基于 `spec.timeBins` 生成位图宽度。
- True Peak 采用简化的 4 倍线性插值近似，不是广播级 sinc oversampling 实现。
- 代码协议与仓库主项目一致，均为 MIT。
