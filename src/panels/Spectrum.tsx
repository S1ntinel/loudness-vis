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
    let isVisible = true;

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
    const pointX = new Float32Array(engine.specBuf.length);
    const pointY = new Float32Array(engine.specBuf.length);
    let frozenBuf: Float32Array | null = null;

    let cssCache: Record<string, string> = {};
    function refreshCssCache() {
      cssCache = {
        '--vfd-green': cssVar('--vfd-green', '#6CFF9A'),
        '--vfd-cyan': cssVar('--vfd-cyan', '#60F2FF'),
        '--vfd-orange': cssVar('--vfd-orange', '#F26A2E'),
      };
    }
    refreshCssCache();

    function draw(now = performance.now()) {
      if (!isVisible) { raf = requestAnimationFrame(draw); return; }
      // 限制 30FPS 减轻压力
      if (now - lastFrameTime < 32) { raf = requestAnimationFrame(draw); return; }
      lastFrameTime = now;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx2d.clearRect(0, 0, w, h);

      const fs   = engine.ctx.sampleRate;
      const fMin = 20;
      const fMax = fs / 2;
      const fToX = (f: number) => Math.log2(f / fMin) / Math.log2(fMax / fMin) * w;
      const xToF = (x: number) => fMin * Math.pow(fMax / fMin, x / w);

      // 背景网格
      ctx2d.strokeStyle = 'rgba(96, 242, 255, 0.05)';
      ctx2d.lineWidth = 1;
      for (let db = 0; db >= -100; db -= 20) {
        const y = h * (-db / 100);
        ctx2d.beginPath(); ctx2d.moveTo(0, y); ctx2d.lineTo(w, y); ctx2d.stroke();
      }
      [100, 1000, 10000].forEach(f => {
        const x = fToX(f);
        ctx2d.beginPath(); ctx2d.moveTo(x, 0); ctx2d.lineTo(x, h); ctx2d.stroke();
      });

      if (engine.isPlaying) {
        engine.specAna.getFloatFrequencyData(engine.specBuf);
        if (!frozenBuf || frozenBuf.length !== engine.specBuf.length) {
          frozenBuf = new Float32Array(engine.specBuf.length);
        }
        frozenBuf.set(engine.specBuf);
      }
      const specDb = engine.isPlaying ? engine.specBuf : (frozenBuf ?? engine.specBuf);
      const N = specDb.length;
      
      let pointCount = 0;
      for (let i = 1; i < N; i++) {
        const f = i * fs / (2 * N);
        if (f < fMin) continue;
        if (f > fMax) break;
        pointX[pointCount] = fToX(f);
        pointY[pointCount] = h * (-Math.max(-100, Math.min(0, specDb[i])) / 100);
        pointCount++;
      }

      // 移除 shadowBlur，改用多层线叠加模拟辉光
      const traceColor = cssCache['--vfd-green'];
      ctx2d.lineJoin = 'round';
      
      // 底层宽虚影
      ctx2d.strokeStyle = traceColor;
      ctx2d.globalAlpha = 0.15;
      ctx2d.lineWidth = 4;
      ctx2d.beginPath();
      if (pointCount > 0) {
        ctx2d.moveTo(pointX[0], pointY[0]);
        for (let i = 1; i < pointCount; i++) ctx2d.lineTo(pointX[i], pointY[i]);
      }
      ctx2d.stroke();

      // 顶层亮线
      ctx2d.globalAlpha = 1.0;
      ctx2d.lineWidth = 1.2;
      ctx2d.stroke();
      
      ctx2d.globalAlpha = 1;

      // Hover Crosshair
      const { x: hx, y: hy } = hoverRef.current;
      if (hx >= 0 && hx <= w && hy >= 0 && hy <= h) {
        ctx2d.strokeStyle = cssCache['--vfd-orange'];
        ctx2d.lineWidth = 1;
        ctx2d.setLineDash([2, 4]);
        ctx2d.beginPath();
        ctx2d.moveTo(hx, 0); ctx2d.lineTo(hx, h);
        ctx2d.moveTo(0, hy); ctx2d.lineTo(w, hy);
        ctx2d.stroke();
        ctx2d.setLineDash([]);
      }

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [theme, preset]);

  return <canvas ref={canvasRef} className={className} />;
}
