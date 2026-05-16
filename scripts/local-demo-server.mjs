import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const distDir = join(rootDir, 'dist');
const publicDir = join(rootDir, 'public');
const liteHtmlPath = join(rootDir, 'UV', 'src', 'loudness_vis_uv', 'assets', 'lite.html');
const fallbackPortSpan = 20;

const argMap = parseArgs(process.argv.slice(2));
const host = argMap.host || '127.0.0.1';
const hasExplicitPort = argMap.port != null;
const port = Number(argMap.port || 4317);
const page = normalizePage(argMap.open || 'hub');
const shouldBuild = Boolean(argMap.build);
const shouldOpen = !Boolean(argMap['no-open']);

if (shouldBuild) {
  runBuild();
}

if (!existsSync(join(distDir, 'index.html'))) {
  console.error('[local] dist/index.html not found. Run `npm run build` first.');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${host}:${port}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderHubPage(port));
      return;
    }

    if (pathname === '/lite.html' || pathname === '/legacy.html') {
      return streamFile(res, liteHtmlPath);
    }

    if (pathname.startsWith('/dist/')) {
      return streamFile(res, safeJoin(rootDir, pathname.slice(1)));
    }

    if (pathname.startsWith('/public/')) {
      return streamFile(res, safeJoin(rootDir, pathname.slice(1)));
    }

    if (pathname.startsWith('/fonts/')) {
      return streamFile(res, safeJoin(publicDir, pathname.slice('/fonts/'.length)));
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Internal Server Error\n${error instanceof Error ? error.message : String(error)}`);
  }
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

const activePort = await bindServer(server, host, port, hasExplicitPort);
const baseUrl = `http://${host}:${activePort}`;
const selectedUrl = `${baseUrl}${pagePath(page)}`;

console.log(`[local] LoudnessVis server ready at ${baseUrl}`);
console.log(`[local] React build : ${baseUrl}/dist/index.html`);
console.log(`[local] Lite HTML  : ${baseUrl}/lite.html`);
console.log(`[local] Legacy alias: ${baseUrl}/legacy.html`);

if (shouldOpen) {
  openBrowser(selectedUrl);
}

function parseArgs(args) {
  const parsed = {};

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('--')) continue;
    const stripped = token.slice(2);

    if (stripped.includes('=')) {
      const [key, value] = stripped.split('=', 2);
      parsed[key] = value;
      continue;
    }

    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      parsed[stripped] = next;
      i += 1;
    } else {
      parsed[stripped] = true;
    }
  }

  return parsed;
}

function normalizePage(value) {
  return value === 'dist' || value === 'lite' || value === 'legacy' ? value : 'hub';
}

function pagePath(value) {
  if (value === 'dist') return '/dist/index.html';
  if (value === 'lite') return '/lite.html';
  if (value === 'legacy') return '/legacy.html';
  return '/';
}

function safeJoin(baseDir, relativePath) {
  const resolvedBase = resolve(baseDir);
  const resolvedTarget = resolve(baseDir, relativePath);

  if (resolvedTarget !== resolvedBase && !resolvedTarget.startsWith(`${resolvedBase}\\`) && !resolvedTarget.startsWith(`${resolvedBase}/`)) {
    throw new Error(`Refused to read outside base directory: ${relativePath}`);
  }

  return resolvedTarget;
}

async function streamFile(res, filePath) {
  let fileStat;

  try {
    fileStat = await stat(filePath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    throw error;
  }

  if (!fileStat.isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }

  res.writeHead(200, {
    'Content-Type': contentType(filePath),
    'Content-Length': fileStat.size,
    'Cache-Control': 'no-store',
  });

  createReadStream(filePath).pipe(res);
}

function contentType(filePath) {
  switch (extname(filePath).toLowerCase()) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
    case '.mjs':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml';
    case '.woff2':
      return 'font/woff2';
    case '.wav':
      return 'audio/wav';
    case '.webm':
      return 'audio/webm';
    default:
      return 'application/octet-stream';
  }
}

function runBuild() {
  const result = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm run build'], {
        cwd: rootDir,
        encoding: 'utf8',
      })
    : spawnSync('npm', ['run', 'build'], {
        cwd: rootDir,
        encoding: 'utf8',
      });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    console.error(`[local] Build launch failed: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function bindServer(httpServer, listenHost, requestedPort, explicitPort) {
  if (explicitPort) {
    try {
      return await listenOnce(httpServer, listenHost, requestedPort);
    } catch (error) {
      handleListenFailure(error, requestedPort);
    }
  }

  for (let offset = 0; offset <= fallbackPortSpan; offset += 1) {
    const candidatePort = requestedPort + offset;
    try {
      const boundPort = await listenOnce(httpServer, listenHost, candidatePort);
      if (offset > 0) {
        console.warn(`[local] Port ${requestedPort} was busy. Switched to ${boundPort}.`);
      }
      return boundPort;
    } catch (error) {
      if (!isAddressInUseError(error) || offset === fallbackPortSpan) {
        handleListenFailure(error, candidatePort);
      }
    }
  }

  throw new Error(`No available port found in range ${requestedPort}-${requestedPort + fallbackPortSpan}.`);
}

function listenOnce(httpServer, listenHost, candidatePort) {
  return new Promise((resolvePromise, rejectPromise) => {
    const onError = (error) => {
      httpServer.off('listening', onListening);
      rejectPromise(error);
    };

    const onListening = () => {
      httpServer.off('error', onError);
      resolvePromise(candidatePort);
    };

    httpServer.once('error', onError);
    httpServer.once('listening', onListening);
    httpServer.listen(candidatePort, listenHost);
  });
}

function isAddressInUseError(error) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'EADDRINUSE');
}

function handleListenFailure(error, candidatePort) {
  if (isAddressInUseError(error)) {
    console.error(`[local] Port ${candidatePort} is already in use.`);
    console.error('[local] Close the existing process or retry with --port <number>.');
    process.exit(1);
  }

  console.error(`[local] Server launch failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

function openBrowser(targetUrl) {
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', targetUrl], {
      cwd: rootDir,
      detached: true,
      stdio: 'ignore',
    }).unref();
    return;
  }

  const command = process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(command, [targetUrl], {
    cwd: rootDir,
    detached: true,
    stdio: 'ignore',
  }).unref();
}

function renderHubPage(activePort) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LoudnessVis Local Hub</title>
    <style>
      :root {
        color-scheme: light;
        --bg:
          radial-gradient(circle at 15% 0%, rgba(124, 163, 230, 0.24), transparent 32%),
          radial-gradient(circle at 88% 10%, rgba(231, 187, 211, 0.25), transparent 34%),
          linear-gradient(135deg, #edf2f8 0%, #dbe3ec 100%);
        --panel: rgba(255, 255, 255, 0.72);
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
        width: min(880px, 100%);
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
        background: rgba(255, 255, 255, 0.82);
      }
      .card h2 {
        margin: 0 0 6px;
        font-size: 18px;
      }
      .card p {
        min-height: 48px;
      }
      .actions {
        margin-top: 14px;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
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
      code {
        display: inline-block;
        margin-top: 16px;
        padding: 10px 12px;
        background: rgba(24, 35, 57, 0.07);
        border-radius: 10px;
        color: #22314d;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>LoudnessVis Local Hub</h1>
      <p>本地稳定入口。React 构建版和 UV 内置 Lite HTML 都通过 HTTP 提供，避免 file:// 模式的白屏和模块加载限制。</p>
      <div class="grid">
        <section class="card">
          <h2>React Build</h2>
          <p>当前主版本，适合日常测试和后续接入 Electron 前的 Web UI 调试。</p>
          <div class="actions">
            <a href="/dist/index.html">打开</a>
          </div>
        </section>
        <section class="card">
          <h2>Lite HTML</h2>
          <p>UV 包内保留的单文件 Lite 本体；旧的 /legacy.html 路由继续作为兼容别名。</p>
          <div class="actions">
            <a href="/lite.html">打开</a>
          </div>
        </section>
      </div>
      <code>http://127.0.0.1:${activePort}/</code>
    </main>
  </body>
</html>`;
}
