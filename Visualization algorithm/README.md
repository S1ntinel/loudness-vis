# Visualization algorithm

This directory is a **source snapshot mirror** of the current LoudnessVis analysis / visualization pipeline.

It intentionally keeps the same directory structure and relative imports as the live app source, so the code can be reviewed independently without rewriting module boundaries.

Chinese notes: [`Visualization algorithm_CN.md`](./Visualization%20algorithm_CN.md)

## What is included

The snapshot currently mirrors the parts of the repository that directly support audio analysis, visualization rendering, and the analysis/track visualization workflow:

- audio DSP and metric computation
- analysis-page orchestration
- canvas visualization panels
- track / waveform visualization helpers used by the recording workflow
- minimal shared store + theme dependencies required by those panels

## Mirrored file groups

| Group | Mirrored paths |
| --- | --- |
| Audio / DSP core | `src/audio/*.ts` |
| Visualization panels | `src/panels/*.tsx`, `src/panels/Spectrogram.module.css` |
| Analyze page | `src/tabs/Analyze/*` |
| Minimal shared store | `src/store/index.ts` |
| Theme dependencies | `src/theme/index.ts`, `src/theme/tokens.css` |

## Source map

| Area | Files | Purpose |
| --- | --- | --- |
| FFT and DSP primitives | `src/audio/fft.ts`, `src/audio/dsp.ts` | Radix-2 FFT, Hann window, filter helpers |
| Waveform and color analysis | `src/audio/coloredPeaks.ts`, `src/audio/stats.ts` | Peak extraction, RGB waveform coloring, loudness / dynamics stats |
| Spectrum and spectrogram | `src/audio/avgSpectrum.ts`, `src/audio/spectrogram.ts`, `src/panels/Spectrum.tsx`, `src/panels/SpectrumLegend.tsx`, `src/panels/Spectrogram.tsx` | Real-time spectrum, full-track average spectrum, STFT heatmap rendering |
| Stereo field | `src/audio/soundField.ts`, `src/panels/Goniometer.tsx`, `src/panels/SoundField.tsx` | Mid/Side scatter and four-band spatial visualization |
| Loudness metrics | `src/audio/lufs.ts`, `src/panels/LufsDisplay.tsx`, `src/panels/StatBar.tsx` | LUFS, true peak, LRA, peak / RMS / crest / clip / correlation readouts |
| Runtime orchestration | `src/audio/engine.ts`, `src/audio/useEngineState.ts`, `src/tabs/Analyze/index.tsx` | Web Audio pipeline, precomputation, panel wiring |
| Track-side waveform utilities | `src/audio/trackEngine.ts`, `src/audio/useTrackState.ts`, `src/audio/wavEncoder.ts`, `src/panels/ScrollingWaveform.tsx`, `src/panels/TrackItem.tsx`, `src/panels/TrackList.tsx` | Recording waveform preview, track trimming, WAV export, multi-track visualization |
| UI dependencies | `src/store/index.ts`, `src/theme/index.ts`, `src/theme/tokens.css`, `src/tabs/Analyze/Analyze.module.css`, `src/panels/ColorModeSwitch.tsx`, `src/panels/Spectrogram.module.css` | Shared state, theming, and panel support UI |

## Important entry points

- `computeColoredPeaks()` in `src/audio/coloredPeaks.ts`
- `computeAverageSpectrum()` in `src/audio/avgSpectrum.ts`
- `computeSpectrogram()` and `renderSpectrogramBitmap()` in `src/audio/spectrogram.ts`
- `computeLufs()` and `shortTermLufsAt()` in `src/audio/lufs.ts`
- `computeStats()` in `src/audio/stats.ts`
- `soundFieldAnalyser.process()` in `src/audio/soundField.ts`
- `AudioEngine.loadFile()` in `src/audio/engine.ts`
- `TrackEngine.startRecording()` / `addTrackFromBlob()` in `src/audio/trackEngine.ts`

## Explicit exclusions

This snapshot still does **not** mirror the full product source tree. It excludes:

- Electron shell code in `electron/`
- device routing / Windows mixer UI in `src/tabs/Devices/`
- MV editor / exporter in `src/tabs/MV/`
- generic app UI components in `src/components/`
- packaging scripts, UV launcher code, and release assets

## Notes

- This is a source snapshot, not a standalone npm package.
- The implementation targets browser Web Audio + React canvas rendering.
- The snapshot is expected to track the current working tree and may evolve when the live analysis pipeline changes.
- True Peak here is a simplified 4x linear-interpolation approximation, not a broadcast-grade oversampling implementation.
- The code is released under the same MIT license as the repository.
