# LoudnessVis UV Demo / LoudnessVis UV Demo Launcher

## 中文说明

### 简介

`loudness-vis-demo` 是当前 LoudnessVis Web Demo 的本地启动包。

它包含两部分内容：

- React 构建版 demo
- 保留的 `lite.html` 单文件 Lite HTML

这个 UV 包的目标是方便演示、测试和内部分享。
它不是未来 Electron 设备能力的正式分发渠道。

### 目录说明

- `start-demo.cmd`
  适合双击启动，或在 `cmd.exe` 中运行
- `start-demo.ps1`
  适合在 PowerShell 中运行
- `dist/*.whl`
  可分发的 wheel 包
- `dist/*.tar.gz`
  可分发的源码包

### 快速启动

#### 方式 1：在 UV 源码目录启动

在 `D:\loudness-vis\UV` 中：

```powershell
.\start-demo.ps1
```

或：

```cmd
start-demo.cmd
```

这时脚本会自动使用：

```text
uv run loudness-vis-demo
```

#### 方式 2：在 dist 分发目录启动

如果你把 `UV\dist` 目录单独发给测试者，测试者可以直接运行：

```powershell
.\start-demo.ps1
```

或：

```cmd
start-demo.cmd
```

这时脚本会自动检测同目录下的 wheel，并使用：

```text
uv tool run --from <wheel> loudness-vis-demo
```

不需要手动安装源码目录。

### 常用参数

默认参数由 Python 入口 `loudness-vis-demo` 提供：

- 默认主机：`127.0.0.1`
- 默认端口：`4318`
- 默认页面：`hub`

可用页面：

- `hub`
- `dist`
- `lite`
- `legacy`（兼容别名）

示例：

```powershell
.\start-demo.ps1 --page dist
.\start-demo.ps1 --page lite --port 4321
.\start-demo.ps1 --no-open
```

```cmd
start-demo.cmd --page dist
start-demo.cmd --page lite --port 4321
start-demo.cmd --no-open
```

### 手动使用 uv 命令

如果你不想用启动脚本，也可以直接运行：

```powershell
uv run loudness-vis-demo
```

或运行分发 wheel：

```powershell
uv tool run --from .\loudness_vis_demo-0.2.0-py3-none-any.whl loudness-vis-demo
```

### 分发建议

面向 demo 测试分发时，建议直接发送 `UV\dist` 目录中的以下文件：

- `loudness_vis_demo-0.2.0-py3-none-any.whl`
- `loudness_vis_demo-0.2.0.tar.gz`
- `start-demo.cmd`
- `start-demo.ps1`
- `README.md`

这样测试者拿到目录后即可直接运行启动脚本。

### 依赖要求

- Windows
- 已安装 `uv`
- 已安装可用的 Python（通常由 `uv` 自动管理）

如果 `PowerShell` 执行策略拦截 `.ps1`，优先使用：

```cmd
start-demo.cmd
```

## English

### Overview

`loudness-vis-demo` is a local launcher package for the current LoudnessVis Web demos.

It contains:

- the built React demo
- the retained single-file `lite.html` Lite HTML

This UV package is intended for demos, testing, and internal sharing.
It is not the long-term distribution path for the future Electron/device features.

### Folder Layout

- `start-demo.cmd`
  Best for double-click launch or `cmd.exe`
- `start-demo.ps1`
  Best for PowerShell
- `dist/*.whl`
  Distributable wheel package
- `dist/*.tar.gz`
  Distributable source package

### Quick Start

#### Option 1: Run from the UV project folder

Inside `D:\loudness-vis\UV`:

```powershell
.\start-demo.ps1
```

or:

```cmd
start-demo.cmd
```

In this mode, the launcher uses:

```text
uv run loudness-vis-demo
```

#### Option 2: Run from the dist distribution folder

If you send only the `UV\dist` folder to a tester, they can launch:

```powershell
.\start-demo.ps1
```

or:

```cmd
start-demo.cmd
```

In this mode, the launcher auto-detects the wheel in the same folder and runs:

```text
uv tool run --from <wheel> loudness-vis-demo
```

No source checkout is required.

### Common Arguments

The Python entry point `loudness-vis-demo` provides these defaults:

- default host: `127.0.0.1`
- default port: `4318`
- default page: `hub`

Available pages:

- `hub`
- `dist`
- `lite`
- `legacy` (compatibility alias)

Examples:

```powershell
.\start-demo.ps1 --page dist
.\start-demo.ps1 --page lite --port 4321
.\start-demo.ps1 --no-open
```

```cmd
start-demo.cmd --page dist
start-demo.cmd --page lite --port 4321
start-demo.cmd --no-open
```

### Manual uv Usage

If you prefer not to use the launcher scripts:

```powershell
uv run loudness-vis-demo
```

Or run directly from a wheel:

```powershell
uv tool run --from .\loudness_vis_demo-0.2.0-py3-none-any.whl loudness-vis-demo
```

### Recommended Demo Distribution

For demo sharing, send the following files from `UV\dist`:

- `loudness_vis_demo-0.2.0-py3-none-any.whl`
- `loudness_vis_demo-0.2.0.tar.gz`
- `start-demo.cmd`
- `start-demo.ps1`
- `README.md`

This gives testers a folder they can launch immediately.

### Requirements

- Windows
- `uv` installed
- A working Python runtime available to `uv` (usually managed automatically)

If PowerShell execution policy blocks `.ps1`, use:

```cmd
start-demo.cmd
```
