import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 在 Electron 打包后用 file:// 加载，需要相对路径
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
