# LoudnessVis

Audio visualization toolkit for inspecting loudness-war traits in music, with a React web app, a standalone Lite HTML demo, a UV-based local launcher, and an Electron path for future device integration.

一个面向响度战争分析的音频可视化工具，当前包含 React Web 主界面、Lite HTML 演示版、UV 本地启动包，并预留 Electron 桌面化路线。

## Overview

LoudnessVis focuses on making mastering-side characteristics easier to inspect visually:

- waveform and seekable overview
- real-time spectrum display
- goniometer and stereo image cues
- loudness-oriented metrics such as peak, RMS, crest factor, DR-style range, clip ratio, and channel correlation
- multiple delivery modes for demo, testing, and future desktop packaging

## Preview

| React UI | Legacy / Lite Demo |
| --- | --- |
| ![React preview](./preview-react.png) | ![Lite preview](./preview.png) |

| Recording / analysis view | Alternate theme |
| --- | --- |
| ![Record preview](./preview-record.png) | ![Dark preview](./preview-dark2.png) |

## Delivery Modes

| Mode | Purpose | Entry |
| --- | --- | --- |
| React Web | Main development UI built with Vite + React | `npm run dev` |
| Local demo server | Stable localhost launcher for testing | `npm run start:local` |
| Legacy server route | Serve the retained single-file HTML demo on localhost | `npm run start:legacy` |
| Lite bundle | Shareable standalone HTML distribution | [`lite/index.html`](./lite/index.html) |
| UV launcher | Distributable local web launcher for demos | [`UV/README.md`](./UV/README.md) |
| Electron | Future desktop/device integration path | `npm run dev:electron` / `npm run build:exe` |

## Quick Start

### Web development

```powershell
npm install
npm run dev
```

### Build the React app

```powershell
npm run build
```

### Start a stable local demo server

```powershell
npm run start:local
```

### Refresh the Lite bundle

```powershell
npm run lite:build
```

### Build the UV demo package

```powershell
npm run uv:build
```

### Run Electron in development

```powershell
npm run dev:electron
```

## Repository Layout

| Path | Purpose |
| --- | --- |
| `src/` | React application, audio engine, DSP helpers, and panels |
| `public/` | static assets shared by web and packaging flows |
| `legacy.html` | preserved single-file HTML demo |
| `lite/` | standalone distribution-friendly HTML Lite bundle |
| `UV/` | Python/uv launcher package for local demo delivery |
| `electron/` | Electron entry points for future desktop builds |
| `scripts/` | build and packaging scripts |

## Public Repo Notes

- The codebase is published under the MIT license in [`LICENSE`](./LICENSE).
- Bundled font files are third-party assets. See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).
- Generated folders such as `node_modules/`, `dist/`, `UV/dist/`, archives, and local logs are intentionally excluded from version control.

## Roadmap

- Stabilize the React analysis workflow
- Keep the Lite HTML demo shareable as a lightweight fallback
- Maintain the UV launcher for internal demo distribution
- Expand Electron support for device-facing workflows

## Related Docs

- Lite bundle: [`lite/README.md`](./lite/README.md)
- UV launcher package: [`UV/README.md`](./UV/README.md)

## License

MIT
