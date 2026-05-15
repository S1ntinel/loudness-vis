import { useEffect, useRef } from 'react';
import { engine } from '../audio/engine';
import { cssVar } from '../theme';
import { useUIStore } from '../store';

export default function Goniometer({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useUIStore(s => s.theme);
  const preset = useUIStore(s => s.preset);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext('2d')?.clearRect(0, 0, c.clientWidth, c.clientHeight);
  }, [theme, preset]);

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
      ctx2d.clearRect(0, 0, r.width, r.height);
    }
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    const onVis = () => { isVisible = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', onVis);

    let raf = 0;
    let lastFrameTime = 0;
    const SQRT_HALF = 0.7071067811865475;
    const cssVfdGreen = cssVar('--vfd-green', '#6CFF9A');

    function draw(now = performance.now()) {
      if (!isVisible) { raf = requestAnimationFrame(draw); return; }
      if (now - lastFrameTime < 32) { raf = requestAnimationFrame(draw); return; }
      lastFrameTime = now;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      // 拖尾效果
      ctx2d.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx2d.fillRect(0, 0, w, h);

      const cx = w / 2, cy = h / 2;
      const radius = Math.min(w, h) * 0.42;

      ctx2d.strokeStyle = 'rgba(96, 242, 255, 0.08)';
      ctx2d.beginPath(); ctx2d.moveTo(cx, 0); ctx2d.lineTo(cx, h); ctx2d.moveTo(0, cy); ctx2d.lineTo(w, cy); ctx2d.stroke();

      if (engine.isPlaying) {
        engine.lAna.getFloatTimeDomainData(engine.lBuf);
        engine.rAna.getFloatTimeDomainData(engine.rBuf);
        const L = engine.lBuf, R = engine.rBuf;

        ctx2d.fillStyle = cssVfdGreen;
        ctx2d.beginPath();
        // 降低渲染密度以提升性能
        for (let i = 0; i < L.length; i += 4) {
          const side = (L[i] - R[i]) * SQRT_HALF;
          const mid  = (L[i] + R[i]) * SQRT_HALF;
          ctx2d.rect(cx + side * radius - 0.5, cy - mid * radius - 0.5, 1.2, 1.2);
        }
        ctx2d.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, [theme, preset]);

  return <canvas ref={canvasRef} className={className} />;
}
