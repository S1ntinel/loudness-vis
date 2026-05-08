import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const uvDir = join(rootDir, 'UV');
const uvDistDir = join(uvDir, 'dist');

mkdirSync(uvDistDir, { recursive: true });

for (const entry of readdirSync(uvDistDir, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (!/^loudness_vis_demo-.*\.(whl|tar\.gz)$/i.test(entry.name)) continue;
  rmSync(join(uvDistDir, entry.name), { force: true });
}

const result = spawnSync('uv', ['build'], {
  cwd: uvDir,
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

copyFileSync(join(uvDir, 'README.md'), join(uvDistDir, 'README.md'));
copyFileSync(join(uvDir, 'start-demo.ps1'), join(uvDistDir, 'start-demo.ps1'));
copyFileSync(join(uvDir, 'start-demo.cmd'), join(uvDistDir, 'start-demo.cmd'));

console.log('[uv:build] Copied README and launcher scripts into UV/dist');
