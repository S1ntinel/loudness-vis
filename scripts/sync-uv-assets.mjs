import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const uvDir = join(rootDir, 'UV');
const distDir = join(rootDir, 'dist');
const assetsDir = join(uvDir, 'src', 'loudness_vis_uv', 'assets');

if (!existsSync(distDir)) {
  console.error('[uv:sync] dist directory not found. Run `npm run build` first.');
  process.exit(1);
}

mkdirSync(assetsDir, { recursive: true });
cleanDirectory(assetsDir);

cpSync(distDir, join(assetsDir, 'dist'), { recursive: true });
if (!existsSync(join(assetsDir, 'lite.html')) || !existsSync(join(assetsDir, 'legacy.html'))) {
  console.error('[uv:sync] UV Lite HTML assets not found.');
  process.exit(1);
}
writeFileSync(join(assetsDir, 'index.html'), renderHubPage(), 'utf8');

console.log(`[uv:sync] assets updated in ${assetsDir}`);

function cleanDirectory(directory) {
  rmSync(join(directory, 'dist'), { force: true, recursive: true });
  rmSync(join(directory, 'public'), { force: true, recursive: true });
  rmSync(join(directory, 'index.html'), { force: true });
}

function renderHubPage() {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LoudnessVis UV Preview</title>
    <style>
      :root {
        --bg:
          radial-gradient(circle at 12% 0%, rgba(122, 163, 238, 0.24), transparent 32%),
          radial-gradient(circle at 88% 10%, rgba(230, 180, 206, 0.25), transparent 34%),
          linear-gradient(135deg, #edf2f8 0%, #dbe3ec 100%);
        --panel: rgba(255, 255, 255, 0.76);
        --border: rgba(31, 44, 68, 0.12);
        --text: #172033;
        --muted: #5f6980;
        --accent: #2f64b5;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font: 16px/1.5 "Segoe UI", "Microsoft YaHei", sans-serif;
        color: var(--text);
        background: var(--bg);
        display: grid;
        place-items: center;
        padding: 24px;
      }
      main {
        width: min(820px, 100%);
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 18px;
        box-shadow: 0 18px 48px rgba(28, 40, 63, 0.12);
        padding: 28px;
        backdrop-filter: blur(18px);
      }
      h1 {
        margin: 0 0 10px;
        font-size: 30px;
      }
      p {
        margin: 0;
        color: var(--muted);
      }
      .grid {
        margin-top: 22px;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 16px;
      }
      .card {
        padding: 18px;
        border-radius: 14px;
        border: 1px solid var(--border);
        background: rgba(255, 255, 255, 0.84);
      }
      .card h2 {
        margin: 0 0 6px;
        font-size: 18px;
      }
      .actions {
        margin-top: 14px;
        display: flex;
        gap: 10px;
      }
      a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 108px;
        padding: 10px 14px;
        border-radius: 10px;
        color: white;
        background: var(--accent);
        text-decoration: none;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>LoudnessVis UV Preview</h1>
      <p>这是给 UV 启动器使用的静态预览包，适合当前 Web 版本的本地分发检查；Electron 桌面设备能力请使用桌面版 release。</p>
      <div class="grid">
        <section class="card">
          <h2>React Build</h2>
          <p>当前主 Web 版本。</p>
          <div class="actions">
            <a href="/dist/index.html">打开</a>
          </div>
        </section>
        <section class="card">
          <h2>Lite HTML</h2>
          <p>UV 包内保留的单文件 Lite 本体；旧的 legacy 名称继续作为兼容别名。</p>
          <div class="actions">
            <a href="/lite.html">打开</a>
          </div>
        </section>
      </div>
    </main>
  </body>
</html>`;
}
