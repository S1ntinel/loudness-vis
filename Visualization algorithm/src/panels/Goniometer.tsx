import { useEffect, useRef } from 'react';
import { engine } from '../audio/engine';
import { cssVar } from '../theme';
import { useUIStore } from '../store';

export default function Goniometer({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useUIStore(s => s.theme);
  const preset = useUIStore(s => s.preset);

  // 切主题时清屏（避免上一主题的拖尾残留）
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext('2d')?.clearRect(0, 0, c.clientWidth, c.clientHeight);
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx2d = canvas.getContext('2d')!;

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
    window.addEventListener('resize', fit);
    const onVis = () => { isVisible = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', onVis);

    let raf = 0;
    let isVisible = true;
    const SQRT_HALF = 0.7071067811865475;

    // 缓存 CSS 变量
    let cssCache: { grid: string; accent: string; glow: string; text2: string } = {
      grid: cssVar('--grid-strong', 'rgba(35,50,90,0.10)'),
      accent: cssVar('--accent', '#3b6db5'),
      glow: cssVar('--accent-glow', 'rgba(59, 109, 181, 0.4)'),
      text2: cssVar('--text-2', '#5a6273'),
    };

    function draw() {
      if (!isVisible) { raf = requestAnimationFrame(draw); return; }
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const isDark = document.body.classList.contains('dark');

      // 拖尾
      ctx2d.fillStyle = isDark ? 'rgba(15, 18, 25, 0.34)' : 'rgba(255, 255, 255, 0.28)';
      ctx2d.fillRect(0, 0, w, h);

      // 网格
      ctx2d.strokeStyle = cssCache.grid;
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      ctx2d.moveTo(w / 2, 0); ctx2d.lineTo(w / 2, h);
      ctx2d.moveTo(0, h / 2); ctx2d.lineTo(w, h / 2);
      ctx2d.moveTo(0, 0); ctx2d.lineTo(w, h);
      ctx2d.moveTo(w, 0); ctx2d.lineTo(0, h);
      ctx2d.stroke();
      const cx = w / 2, cy = h / 2;
      const radius = Math.min(w, h) * 0.42;
      ctx2d.beginPath();
      ctx2d.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx2d.stroke();

      // 散点
      if (engine.isPlaying) {
        engine.lAna.getFloatTimeDomainData(engine.lBuf);
        engine.rAna.getFloatTimeDomainData(engine.rBuf);
        const L = engine.lBuf, R = engine.rBuf;
        
        // 外层发光
        ctx2d.fillStyle = cssCache.accent;
        ctx2d.globalAlpha = isDark ? 0.4 : 0.3;
        ctx2d.shadowColor = cssCache.glow;
        ctx2d.shadowBlur = isDark ? 8 : 5;
        ctx2d.beginPath();
        for (let i = 0; i < L.length; i += 2) {
          const side = (L[i] - R[i]) * SQRT_HALF;
          const mid  = (L[i] + R[i]) * SQRT_HALF;
          const x = cx + side * radius;
          const y = cy - mid * radius;
          ctx2d.rect(x - 1, y - 1, 2.5, 2.5);
        }
        ctx2d.fill();
        
        // 内层亮点
        ctx2d.globalAlpha = isDark ? 0.8 : 0.6;
        ctx2d.shadowBlur = isDark ? 4 : 2;
        ctx2d.beginPath();
        for (let i = 0; i < L.length; i += 4) {
          const side = (L[i] - R[i]) * SQRT_HALF;
          const mid  = (L[i] + R[i]) * SQRT_HALF;
          const x = cx + side * radius;
          const y = cy - mid * radius;
          ctx2d.rect(x, y, 1.4, 1.4);
        }
        ctx2d.fill();
        
        ctx2d.shadowBlur = 0;
        ctx2d.globalAlpha = 1;
      }

      // 标签
      ctx2d.fillStyle = cssCache.text2;
      ctx2d.font = '14px MiSans, "Microsoft YaHei", sans-serif';
      ctx2d.fillText('L',    10,        20);
      ctx2d.fillText('R',    w - 22,    20);
      ctx2d.fillText('Mid',  cx + 8,    18);
      ctx2d.fillText('Side', w - 50,    cy - 6);

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', fit);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [theme, preset]);

  return <canvas ref={canvasRef} className={className} />;
}
