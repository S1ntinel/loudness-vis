import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const liteDir = join(rootDir, 'lite');
const legacyHtmlPath = join(rootDir, 'legacy.html');
const fontsDir = join(rootDir, 'public', 'fonts');

if (!existsSync(legacyHtmlPath)) {
  console.error('[lite:build] legacy.html not found.');
  process.exit(1);
}

if (!existsSync(fontsDir)) {
  console.error('[lite:build] public/fonts not found.');
  process.exit(1);
}

rmSync(liteDir, { force: true, recursive: true });
mkdirSync(liteDir, { recursive: true });

const legacyHtml = readFileSync(legacyHtmlPath, 'utf8');
const liteHtml = legacyHtml.replaceAll('public/fonts/', './fonts/');

writeFileSync(join(liteDir, 'index.html'), liteHtml, 'utf8');
writeFileSync(join(liteDir, 'legacy.html'), liteHtml, 'utf8');
cpSync(fontsDir, join(liteDir, 'fonts'), { recursive: true });
writeFileSync(join(liteDir, 'README.md'), renderReadme(), 'utf8');
writeFileSync(join(liteDir, 'start-lite.ps1'), renderPowerShellLauncher(), 'utf8');
writeFileSync(join(liteDir, 'start-lite.cmd'), renderCmdLauncher(), 'utf8');

console.log(`[lite:build] Lite bundle created in ${liteDir}`);

function renderReadme() {
  return `# LoudnessVis Lite

## 中文说明

这是 LoudnessVis 的 Lite 分发目录，使用保留下来的 \`legacy.html\` 单文件页面作为演示版。

适用场景：

- 需要直接分发 HTML 版本
- 不依赖 Node.js、uv、Electron
- 希望用浏览器快速打开并试用音频可视化功能

目录说明：

- \`index.html\`：默认入口，建议直接打开这个文件
- \`legacy.html\`：与 \`index.html\` 内容一致，保留旧命名
- \`fonts/\`：Lite 版所需字体
- \`start-lite.cmd\`：Windows 双击启动
- \`start-lite.ps1\`：PowerShell 启动

使用方式：

1. 普通 Windows 用户：双击 \`start-lite.cmd\`
2. PowerShell 用户：执行 \`./start-lite.ps1\`
3. 也可以直接双击 \`index.html\`

建议：

- 优先使用 Edge 或 Chrome
- Lite 版只保留 legacy HTML demo，不包含 React 主界面、Electron 设备能力或 UV 启动器
- 如果浏览器阻止本地音频访问，请改用“选择文件”按钮手动载入音频

## English

This folder contains the Lite distribution of LoudnessVis, based on the preserved \`legacy.html\` standalone demo.

Use this bundle when you need:

- a shareable HTML-only demo
- no dependency on Node.js, uv, or Electron
- a quick browser-based preview of the audio visualization tool

Folder contents:

- \`index.html\`: default entry point
- \`legacy.html\`: same content as \`index.html\`, kept for compatibility
- \`fonts/\`: local font assets required by the Lite demo
- \`start-lite.cmd\`: one-click Windows launcher
- \`start-lite.ps1\`: PowerShell launcher

How to use:

1. Double-click \`start-lite.cmd\`
2. Or run \`./start-lite.ps1\` in PowerShell
3. Or open \`index.html\` directly in a browser

Notes:

- Edge or Chrome is recommended
- The Lite bundle only includes the legacy HTML demo
- It does not include the React app, Electron device features, or the UV launcher
`;
}

function renderPowerShellLauncher() {
  return `param(
    [ValidateSet('index', 'legacy')]
    [string]$Page = 'index'
)

$ErrorActionPreference = 'Stop'

try {
    Set-Location -LiteralPath $PSScriptRoot

    $target = if ($Page -eq 'legacy') { 'legacy.html' } else { 'index.html' }
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
