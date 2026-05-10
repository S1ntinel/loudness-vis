# Visualization algorithm

This directory is an open-source snapshot of the visualization-related implementation used by the LoudnessVis analysis page.

It keeps the original source layout so the algorithm code and the panel code can still be read with the same relative imports as the application.

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
