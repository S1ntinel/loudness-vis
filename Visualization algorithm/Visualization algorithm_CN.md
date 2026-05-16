# Visualization algorithm_CN

这个目录用于说明 LoudnessVis 的可视化算法实现。

它不再保留重复的 `src/` 镜像。权威实现统一放在仓库根目录 [`src/`](../src/) 下，避免同一份源码在两个位置维护，减少 release 时的冗余和误差。

## 源码地图

| 模块 | 源码文件 | 作用 |
| --- | --- | --- |
| FFT / DSP 基础 | [`src/audio/fft.ts`](../src/audio/fft.ts), [`src/audio/dsp.ts`](../src/audio/dsp.ts) | FFT、窗函数、滤波辅助 |
| 波形着色与统计 | [`src/audio/coloredPeaks.ts`](../src/audio/coloredPeaks.ts), [`src/audio/stats.ts`](../src/audio/stats.ts) | 波形峰值采样、频谱重心 hue 映射、低中高频 RGB 染色、动态范围统计 |
| 平均频谱与声谱图 | [`src/audio/avgSpectrum.ts`](../src/audio/avgSpectrum.ts), [`src/audio/spectrogram.ts`](../src/audio/spectrogram.ts), [`src/panels/Spectrum.tsx`](../src/panels/Spectrum.tsx), [`src/panels/Spectrogram.tsx`](../src/panels/Spectrogram.tsx) | 实时频谱、整曲平均频谱、STFT 时频热图 |
| 声场分析 | [`src/audio/soundField.ts`](../src/audio/soundField.ts), [`src/panels/Goniometer.tsx`](../src/panels/Goniometer.tsx), [`src/panels/SoundField.tsx`](../src/panels/SoundField.tsx) | 相位仪、Mid/Side 散点、四频段空间分布 |
| 响度指标 | [`src/audio/lufs.ts`](../src/audio/lufs.ts), [`src/panels/LufsDisplay.tsx`](../src/panels/LufsDisplay.tsx), [`src/panels/StatBar.tsx`](../src/panels/StatBar.tsx) | LUFS、True Peak、LRA、RMS、峰值因子、相关性等 |
| 运行时装配 | [`src/audio/engine.ts`](../src/audio/engine.ts), [`src/audio/useEngineState.ts`](../src/audio/useEngineState.ts), [`src/tabs/Analyze/index.tsx`](../src/tabs/Analyze/index.tsx) | 音频加载、预计算、分析页联动 |
| 轨道侧可视化工具 | [`src/audio/trackEngine.ts`](../src/audio/trackEngine.ts), [`src/audio/useTrackState.ts`](../src/audio/useTrackState.ts), [`src/audio/wavEncoder.ts`](../src/audio/wavEncoder.ts), [`src/panels/ScrollingWaveform.tsx`](../src/panels/ScrollingWaveform.tsx), [`src/panels/TrackItem.tsx`](../src/panels/TrackItem.tsx), [`src/panels/TrackList.tsx`](../src/panels/TrackList.tsx) | 录音波形预览、轨道裁剪、WAV 导出、多轨可视化 |

## 关键入口

- `computeColoredPeaks()`：[`src/audio/coloredPeaks.ts`](../src/audio/coloredPeaks.ts)
- `computeAverageSpectrum()`：[`src/audio/avgSpectrum.ts`](../src/audio/avgSpectrum.ts)
- `computeSpectrogram()` / `renderSpectrogramBitmap()`：[`src/audio/spectrogram.ts`](../src/audio/spectrogram.ts)
- `computeLufs()` / `shortTermLufsAt()`：[`src/audio/lufs.ts`](../src/audio/lufs.ts)
- `computeStats()`：[`src/audio/stats.ts`](../src/audio/stats.ts)
- `soundFieldAnalyser.process()`：[`src/audio/soundField.ts`](../src/audio/soundField.ts)
- `AudioEngine.loadFile()`：[`src/audio/engine.ts`](../src/audio/engine.ts)
- `TrackEngine.startRecording()` / `addTrackFromBlob()`：[`src/audio/trackEngine.ts`](../src/audio/trackEngine.ts)

## 说明事项

- 这里是算法索引，不是可直接安装的 npm 包。
- 实现面向浏览器 Web Audio API 与 React Canvas 面板。
- True Peak 采用简化的 4 倍线性插值近似，不是广播级 sinc oversampling 实现。
- 代码协议与仓库主项目一致，均为 MIT。
