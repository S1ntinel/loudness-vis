import { useEffect, useRef } from 'react';
import { engine } from '../audio/engine';
import { cssVar } from '../theme';
import { useUIStore } from '../store';

export default function Spectrum({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverRef = useRef({ x: -1, y: -1 });
  const theme = useUIStore(s => s.theme);
  const preset = useUIStore(s => s.preset);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx2d = canvas.getContext('2d')!;

    function fit() {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(2, Math.round(r.width * dpr));
      canvas.height = Math.max(2, Math.round(r.height * dpr));
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    window.addEventListener('resize', fit);

    function onMove(e: MouseEvent) {
      const r = canvas.getBoundingClientRect();
      hoverRef.current.x = e.clientX - r.left;
      hoverRef.current.y = e.clientY - r.top;
    }
    function onLeave() {
      hoverRef.current.x = -1;
      hoverRef.current.y = -1;
    }
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    const onVis = () => { isVisible = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', onVis);

    let raf = 0;
    let lastFrameTime = 0;
    let isVisible = true;
    const pointX = new Float32Array(engine.specBuf.length);
    const pointY = new Float32Array(engine.specBuf.length);
    // 暂停时冻结最后一次有效数据
    let frozenBuf: Float32Array | null = null;

    // 缓存 CSS 变量，避免每帧 getComputedStyle 触发样式重算
    let cssCache: Record<string, string> = {};
    function refreshCssCache() {
      cssCache = {
        '--spec-bg': cssVar('--spec-bg', 'rgba(12, 15, 22, 0.85)'),
        '--spec-grid': cssVar('--spec-grid', 'rgba(100, 130, 180, 0.12)'),
        '--spec-text': cssVar('--spec-text', 'rgba(180, 200, 230, 0.7)'),
        '--spec-stroke': cssVar('--spec-stroke', '#3b6db5'),
        '--accent-glow': cssVar('--accent-glow', 'rgba(59, 109, 181, 0.5)'),
        '--hover-cross': cssVar('--hover-cross', 'rgba(232,93,74,0.55)'),
        '--tooltip-bg': cssVar('--tooltip-bg', 'rgba(255,255,255,0.95)'),
        '--tooltip-border': cssVar('--tooltip-border', 'rgba(20,30,50,0.18)'),
        '--text': cssVar('--text', '#1d2026'),
      };
    }
    refreshCssCache();

    function draw(now = performance.now()) {
      if (!isVisible) {
        raf = requestAnimationFrame(draw);
        return;
      }
      if (now - lastFrameTime < 33) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = now;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx2d.clearRect(0, 0, w, h);

      // 频谱背景
      ctx2d.fillStyle = cssCache['--spec-bg'];
      ctx2d.fillRect(0, 0, w, h);

      const fs   = engine.ctx.sampleRate;
      const fMin = 20;
      const fMax = fs / 2;
      const fToX = (f: number) => Math.log2(f / fMin) / Math.log2(fMax / fMin) * w;
      const xToF = (x: number) => fMin * Math.pow(fMax / fMin, x / w);

      // 网格
      ctx2d.strokeStyle = cssCache['--spec-grid'];
      ctx2d.fillStyle   = cssCache['--spec-text'];
      ctx2d.font        = '13px MiSans, "Microsoft YaHei", sans-serif';
      for (let db = 0; db >= -100; db -= 20) {
        const y = h * (-db / 100);
        ctx2d.beginPath();
        ctx2d.moveTo(0, y); ctx2d.lineTo(w, y);
        ctx2d.stroke();
        ctx2d.fillText(db + ' dB', 8, y + 16);
      }
      [50, 100, 500, 1000, 5000, 10000, 20000].forEach(f => {
        if (f >= fMax) return;
        const x = fToX(f);
        ctx2d.beginPath();
        ctx2d.moveTo(x, 0); ctx2d.lineTo(x, h);
        ctx2d.stroke();
        ctx2d.fillText(f >= 1000 ? f / 1000 + 'k' : String(f), x + 5, h - 7);
      });

      // 获取频谱数据：播放时读 AnalyserNode，暂停时冻结最后数据
      if (engine.isPlaying) {
        engine.specAna.getFloatFrequencyData(engine.specBuf);
        // 复制到冻结缓冲区
        if (!frozenBuf || frozenBuf.length !== engine.specBuf.length) {
          frozenBuf = new Float32Array(engine.specBuf.length);
        }
        frozenBuf.set(engine.specBuf);
      }
      const specDb = engine.isPlaying ? engine.specBuf : (frozenBuf ?? engine.specBuf);
      const N = specDb.length;
      const isDark = document.body.classList.contains('dark');
      let pointCount = 0;
      for (let i = 1; i < N; i++) {
        const f = i * fs / (2 * N);
        if (f < fMin) continue;
        if (f > fMax) break;
        const v = Math.max(-100, Math.min(0, specDb[i]));
        pointX[pointCount] = fToX(f);
        pointY[pointCount] = h * (-v / 100);
        pointCount++;
      }

      ctx2d.strokeStyle = cssCache['--spec-stroke'];
      ctx2d.shadowColor = cssCache['--accent-glow'];
      const glowLayers = [
        { width: isDark ? 5 : 4, alpha: isDark ? 0.5 : 0.4, blur: isDark ? 20 : 14 },
        { width: isDark ? 2.5 : 2, alpha: isDark ? 0.7 : 0.6, blur: isDark ? 10 : 6 },
        { width: isDark ? 1.5 : 1.2, alpha: isDark ? 1.0 : 0.9, blur: isDark ? 6 : 4 },
      ];
      for (const layer of glowLayers) {
        ctx2d.lineWidth = layer.width;
        ctx2d.globalAlpha = layer.alpha;
        ctx2d.shadowBlur = layer.blur;
        ctx2d.beginPath();
        if (pointCount > 0) {
          ctx2d.moveTo(pointX[0], pointY[0]);
          for (let i = 1; i < pointCount; i++) {
            ctx2d.lineTo(pointX[i], pointY[i]);
          }
          if (pointX[pointCount - 1] < w - 1) {
            ctx2d.lineTo(w, pointY[pointCount - 1]);
          }
        }
        ctx2d.stroke();
      }
      ctx2d.shadowBlur = 0;
      ctx2d.globalAlpha = 1;

      // ===== 对比通道叠加 =====
      for (const ch of engine.compareChannels) {
        if (!ch.visible) continue;
        const sp = ch.spectrum;
        const halfBin = sp.fftSize >> 1;
        ctx2d.strokeStyle = ch.color;
        ctx2d.globalAlpha = 0.85;
        ctx2d.lineWidth = 1.4;
        ctx2d.beginPath();
        let s2 = false;
        for (let i = 1; i < halfBin; i++) {
          const f = i * sp.sampleRate / sp.fftSize;
          if (f < fMin) continue;
          if (f > fMax) break;
          const x = fToX(f);
          const v = Math.max(-100, Math.min(0, sp.db[i]));
          const y = h * (-v / 100);
          if (!s2) { ctx2d.moveTo(x, y); s2 = true; }
          else ctx2d.lineTo(x, y);
        }
        ctx2d.stroke();
      }
      ctx2d.globalAlpha = 1;
      ctx2d.lineWidth = 1;

      // Hover：十字线 + 浮窗
      const { x: hx, y: hy } = hoverRef.current;
      if (hx >= 0 && hx <= w && hy >= 0 && hy <= h) {
        const f = xToF(hx);
        const db = -100 * (hy / h);

        ctx2d.strokeStyle = cssCache['--hover-cross'];
        ctx2d.lineWidth = 1;
        ctx2d.beginPath();
        ctx2d.moveTo(hx, 0); ctx2d.lineTo(hx, h);
        ctx2d.moveTo(0, hy); ctx2d.lineTo(w, hy);
        ctx2d.stroke();

        const fStr  = f >= 1000 ? (f / 1000).toFixed(2) + ' kHz' : f.toFixed(0) + ' Hz';
        const dbStr = db.toFixed(1) + ' dBFS';
        ctx2d.font = '13px MiSans, "Microsoft YaHei", sans-serif';
        const text = fStr + '   ' + dbStr;
        const tw = ctx2d.measureText(text).width;
        const padX = 10;
        const boxW = tw + padX * 2;
        const boxH = 24;
        let bx = hx + 10;
        let by = hy - boxH - 8;
        if (bx + boxW > w - 4) bx = hx - boxW - 10;
        if (by < 4) by = hy + 12;

        ctx2d.fillStyle = cssCache['--tooltip-bg'];
        ctx2d.strokeStyle = cssCache['--tooltip-border'];
        ctx2d.lineWidth = 1;
        ctx2d.fillRect(bx, by, boxW, boxH);
        ctx2d.strokeRect(bx, by, boxW, boxH);
        ctx2d.fillStyle = cssCache['--text'];
        ctx2d.fillText(text, bx + padX, by + 16);
      }

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', fit);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [theme, preset]);

  return <canvas ref={canvasRef} className={className} />;
}
