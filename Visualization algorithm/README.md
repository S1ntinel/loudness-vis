# Visualization algorithm

This directory documents the visualization algorithms used by LoudnessVis.

It no longer carries a duplicated `src/` mirror. The authoritative implementation lives in the repository root [`src/`](../src/) tree, so there is only one source of truth for maintenance and releases.

Chinese notes: [`Visualization algorithm_CN.md`](./Visualization%20algorithm_CN.md)

## Source Map

| Area | Source files | Purpose |
| --- | --- | --- |
| FFT and DSP primitives | [`src/audio/fft.ts`](../src/audio/fft.ts), [`src/audio/dsp.ts`](../src/audio/dsp.ts) | Radix-2 FFT, Hann window, filter helpers |
| Waveform and color analysis | [`src/audio/coloredPeaks.ts`](../src/audio/coloredPeaks.ts), [`src/audio/stats.ts`](../src/audio/stats.ts) | Peak extraction, RGB waveform coloring, loudness / dynamics stats |
| Spectrum and spectrogram | [`src/audio/avgSpectrum.ts`](../src/audio/avgSpectrum.ts), [`src/audio/spectrogram.ts`](../src/audio/spectrogram.ts), [`src/panels/Spectrum.tsx`](../src/panels/Spectrum.tsx), [`src/panels/Spectrogram.tsx`](../src/panels/Spectrogram.tsx) | Real-time spectrum, full-track average spectrum, STFT heatmap rendering |
| Stereo field | [`src/audio/soundField.ts`](../src/audio/soundField.ts), [`src/panels/Goniometer.tsx`](../src/panels/Goniometer.tsx), [`src/panels/SoundField.tsx`](../src/panels/SoundField.tsx) | Mid/Side scatter and four-band spatial visualization |
| Loudness metrics | [`src/audio/lufs.ts`](../src/audio/lufs.ts), [`src/panels/LufsDisplay.tsx`](../src/panels/LufsDisplay.tsx), [`src/panels/StatBar.tsx`](../src/panels/StatBar.tsx) | LUFS, true peak, LRA, peak / RMS / crest / clip / correlation readouts |
| Runtime orchestration | [`src/audio/engine.ts`](../src/audio/engine.ts), [`src/audio/useEngineState.ts`](../src/audio/useEngineState.ts), [`src/tabs/Analyze/index.tsx`](../src/tabs/Analyze/index.tsx) | Web Audio pipeline, precomputation, panel wiring |
| Track-side waveform utilities | [`src/audio/trackEngine.ts`](../src/audio/trackEngine.ts), [`src/audio/useTrackState.ts`](../src/audio/useTrackState.ts), [`src/audio/wavEncoder.ts`](../src/audio/wavEncoder.ts), [`src/panels/ScrollingWaveform.tsx`](../src/panels/ScrollingWaveform.tsx), [`src/panels/TrackItem.tsx`](../src/panels/TrackItem.tsx), [`src/panels/TrackList.tsx`](../src/panels/TrackList.tsx) | Recording waveform preview, track trimming, WAV export, multi-track visualization |

## Important Entry Points

- `computeColoredPeaks()` in [`src/audio/coloredPeaks.ts`](../src/audio/coloredPeaks.ts)
- `computeAverageSpectrum()` in [`src/audio/avgSpectrum.ts`](../src/audio/avgSpectrum.ts)
- `computeSpectrogram()` and `renderSpectrogramBitmap()` in [`src/audio/spectrogram.ts`](../src/audio/spectrogram.ts)
- `computeLufs()` and `shortTermLufsAt()` in [`src/audio/lufs.ts`](../src/audio/lufs.ts)
- `computeStats()` in [`src/audio/stats.ts`](../src/audio/stats.ts)
- `soundFieldAnalyser.process()` in [`src/audio/soundField.ts`](../src/audio/soundField.ts)
- `AudioEngine.loadFile()` in [`src/audio/engine.ts`](../src/audio/engine.ts)
- `TrackEngine.startRecording()` / `addTrackFromBlob()` in [`src/audio/trackEngine.ts`](../src/audio/trackEngine.ts)

## Notes

- This is an algorithm index, not a standalone npm package.
- The implementation targets browser Web Audio + React canvas rendering.
- True Peak here is a simplified 4x linear-interpolation approximation, not a broadcast-grade oversampling implementation.
- The code is released under the same MIT license as the repository.
