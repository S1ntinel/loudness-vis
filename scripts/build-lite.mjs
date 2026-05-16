import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const liteDir = join(rootDir, 'lite');
const liteHtmlPath = join(rootDir, 'lite.html');
const fontsDir = join(rootDir, 'public', 'fonts');

if (!existsSync(liteHtmlPath)) {
  console.error('[lite:build] lite.html not found.');
  process.exit(1);
}

if (!existsSync(fontsDir)) {
  console.error('[lite:build] public/fonts not found.');
  process.exit(1);
}

rmSync(liteDir, { force: true, recursive: true });
mkdirSync(liteDir, { recursive: true });

const liteSourceHtml = readFileSync(liteHtmlPath, 'utf8');
const liteHtml = liteSourceHtml.replaceAll('public/fonts/', './fonts/');

writeFileSync(join(liteDir, 'index.html'), liteHtml, 'utf8');
writeFileSync(join(liteDir, 'lite.html'), liteHtml, 'utf8');
writeFileSync(join(liteDir, 'legacy.html'), liteHtml, 'utf8');
cpSync(fontsDir, join(liteDir, 'fonts'), { recursive: true });
writeFileSync(join(liteDir, 'README.md'), renderReadme(), 'utf8');
writeFileSync(join(liteDir, 'start-lite.ps1'), renderPowerShellLauncher(), 'utf8');
writeFileSync(join(liteDir, 'start-lite.cmd'), renderCmdLauncher(), 'utf8');

console.log(`[lite:build] Lite bundle created in ${liteDir}`);

function renderReadme() {
  return `# LoudnessVis Lite

## 中文说明

这是 LoudnessVis 的 Lite 分发目录，使用保留下来的 \`lite.html\` 单文件页面作为轻量版 release 资产。

适用场景：

- 需要直接分发 HTML 版本
- 不依赖 Node.js、uv、Electron
- 希望用浏览器快速打开并试用音频可视化功能

目录说明：

- \`index.html\`：默认入口，建议直接打开这个文件
- \`lite.html\`：Lite HTML 主文件
- \`legacy.html\`：兼容旧链接的别名文件，内容与 \`lite.html\` 相同
- \`fonts/\`：Lite 版所需字体
- \`start-lite.cmd\`：Windows 双击启动
- \`start-lite.ps1\`：PowerShell 启动

使用方式：

1. 普通 Windows 用户：双击 \`start-lite.cmd\`
2. PowerShell 用户：执行 \`./start-lite.ps1\`
3. 也可以直接双击 \`index.html\`

建议：

- 优先使用 Edge 或 Chrome
- 从这个版本开始，Release 中统一把这份单文件页面标为 Lite HTML；\`legacy.html\` 仅保留兼容别名
- Lite 版只保留 Lite HTML 单文件页面，不包含 React 主界面、Electron 设备能力或 UV 启动器
- 如果浏览器阻止本地音频访问，请改用“选择文件”按钮手动载入音频

## English

This folder contains the Lite distribution of LoudnessVis, based on the preserved \`lite.html\` standalone page.

Use this bundle when you need:

- a shareable HTML-only Lite release
- no dependency on Node.js, uv, or Electron
- a quick browser-based preview of the audio visualization tool

Folder contents:

- \`index.html\`: default entry point
- \`lite.html\`: primary Lite HTML file
- \`legacy.html\`: compatibility alias with the same content as \`lite.html\`
- \`fonts/\`: local font assets required by the Lite page
- \`start-lite.cmd\`: one-click Windows launcher
- \`start-lite.ps1\`: PowerShell launcher

How to use:

1. Double-click \`start-lite.cmd\`
2. Or run \`./start-lite.ps1\` in PowerShell
3. Or open \`index.html\` directly in a browser

Notes:

- Edge or Chrome is recommended
- Starting with this release line, the standalone page is labeled as Lite HTML in release notes; \`legacy.html\` remains as a compatibility alias
- The Lite bundle only includes the Lite HTML single-file page
- It does not include the React app, Electron device features, or the UV launcher
`;
}

function renderPowerShellLauncher() {
  return `param(
    [ValidateSet('index', 'lite', 'legacy')]
    [string]$Page = 'index'
)

$ErrorActionPreference = 'Stop'

try {
    Set-Location -LiteralPath $PSScriptRoot

    $target = switch ($Page) {
        'lite'   { 'lite.html' }
        'legacy' { 'legacy.html' }
        default  { 'index.html' }
    }
    $filePath = Join-Path $PSScriptRoot $target

    if (-not (Test-Path -LiteralPath $filePath)) {
        throw "File not found: $target"
    }

    Start-Process -FilePath $filePath
}
catch {
    Write-Host ""
    Write-Host "[lite] Launch failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to close this window"
    exit 1
}
`;
}

function renderCmdLauncher() {
  return `@echo off
setlocal
cd /d "%~dp0"

set "PAGE=index.html"
if /i "%~1"=="lite" set "PAGE=lite.html"
if /i "%~1"=="legacy" set "PAGE=legacy.html"

if not exist "%PAGE%" (
  echo [lite] File not found: %PAGE%
  pause
  exit /b 1
)

start "" "%CD%\\%PAGE%"
exit /b 0
`;
}
