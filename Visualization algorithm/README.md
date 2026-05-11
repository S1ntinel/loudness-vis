# Visualization algorithm

This directory is an open-source snapshot of the visualization-related implementation used by the LoudnessVis analysis page.

It keeps the original source layout so the algorithm code and the panel code can still be read with the same relative imports as the application.

## 中文说明

这个目录是从 LoudnessVis 分析页中单独整理出来的一份“可视化算法源码快照”，主要目的是把和可视化面板直接相关的实现抽出来，方便单独开源、阅读和复用。

它保留了原始的目录结构和相对引用关系，所以这里的代码基本就是主应用里对应实现的直接映射，而不是重新包装过的一套独立工程。

### 包含内容

- 波形概览与颜色映射
- 实时频谱与整曲平均频谱
- 声谱图生成与渲染
- 相位仪 / Mid-Side 立体声视图
- 四频段声场分析球
- LUFS、True Peak、LRA 以及动态范围相关指标

### 不包含内容

- 录音轨道管理
- Electron 桌面壳
- UV 启动包和发布脚本
- 与分析面板无关的业务界面

### 主要源码入口

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

### 使用说明

- 这不是一个可直接安装的 npm 包，而是一份源码快照。
- 如果你想看“算法本体”，优先从 `src/audio/` 开始。
- 如果你想看“算法如何被画到屏幕上”，再结合 `src/panels/` 一起看。
- 如果你想看“整页如何组织这些面板”，看 `src/tabs/Analyze/index.tsx`。

### 说明事项

- 该实现面向浏览器 Web Audio API 和 React Canvas 面板。
- 当前快照中的声谱图实现使用工作区最新版本，默认 `fftSize = 2048`，50% overlap，并基于 `spec.timeBins` 生成位图宽度。
- True Peak 采用简化的 4 倍线性插值近似，不是广播级 sinc oversampling 实现。
- 代码协议与仓库主项目一致，均为 MIT。

## Scope

The snapshot focuses on the analysis and visualization panels:

- waveform overview and color mapping
- real-time spectrum
- average spectrum comparison
- spectrogram generation and rendering
- goniometer / mid-side stereo view
- four-band sound-field view
- loudness and dynamic-range metrics
- LUFS / true-peak / LRA display

It intentionally excludes unrelated app surfaces such as recording track management, Electron shell code, UV packaging, and release scripts.

## Source Map

| Area | Files | Purpose |
| --- | --- | --- |
| FFT and DSP primitives | `src/audio/fft.ts`, `src/audio/dsp.ts` | Radix-2 FFT, Hann window, biquad filter helpers |
| Waveform color analysis | `src/audio/coloredPeaks.ts` | Slot-based waveform peaks, spectral centroid hue mapping, low/mid/high RGB mapping |
| Spectrum analysis | `src/audio/avgSpectrum.ts`, `src/panels/Spectrum.tsx`, `src/panels/SpectrumLegend.tsx` | STFT average spectrum, real-time FFT rendering, comparison-channel overlay |
| Spectrogram | `src/audio/spectrogram.ts`, `src/panels/Spectrogram.tsx` | STFT time-frequency matrix, dB normalization, magma palette, log-frequency canvas rendering |
| Stereo field | `src/audio/soundField.ts`, `src/panels/Goniometer.tsx`, `src/panels/SoundField.tsx` | Mid-side scatter view and four-band L/R RMS spatial visualization |
| Loudness metrics | `src/audio/lufs.ts`, `src/audio/stats.ts`, `src/panels/StatBar.tsx`, `src/panels/LufsDisplay.tsx` | EBU R128-style LUFS, true peak approximation, LRA, RMS, crest factor, clip ratio, correlation, width, kurtosis |
| Runtime integration | `src/audio/engine.ts`, `src/tabs/Analyze/index.tsx` | AudioContext pipeline, pre-computation orchestration, panel layout and interaction wiring |
| UI dependencies | `src/store/index.ts`, `src/theme/index.ts`, `src/theme/tokens.css`, `src/tabs/Analyze/Analyze.module.css` | Shared view state, theme tokens, and panel styling required by the visualization components |

## Important Entry Points

- `computeColoredPeaks()` in `src/audio/coloredPeaks.ts`
- `computeAverageSpectrum()` in `src/audio/avgSpectrum.ts`
- `computeSpectrogram()` and `renderSpectrogramBitmap()` in `src/audio/spectrogram.ts`
- `computeLufs()` and `shortTermLufsAt()` in `src/audio/lufs.ts`
- `computeStats()` in `src/audio/stats.ts`
- `soundFieldAnalyser.process()` in `src/audio/soundField.ts`
- `AudioEngine.loadFile()` in `src/audio/engine.ts`

## Notes

- This is a source snapshot, not a standalone npm package.
- The implementation is written for the browser Web Audio API and React canvas panels.
- The spectrogram implementation in this snapshot uses the current working-tree version: `fftSize = 2048` by default, 50% overlap, integer hop size, and bitmap width based on `spec.timeBins`.
- True Peak is a simplified 4x linear interpolation approximation, not a professional sinc oversampling implementation.
- The code is released under the same MIT license as the repository.
