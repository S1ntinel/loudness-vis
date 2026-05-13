import { useEffect, useRef } from 'react';
import { engine } from '../audio/engine';
import { cssVar } from '../theme';
import { useUIStore } from '../store';

export default function Goniometer({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useUIStore(s => s.theme);

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

    let raf = 0;
    const SQRT_HALF = 0.7071067811865475;

    function draw() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      // 拖尾
      ctx2d.fillStyle = cssVar('--canvas-trail') || 'rgba(255, 255, 255, 0.16)';
      ctx2d.fillRect(0, 0, w, h);

      // 网格
      ctx2d.strokeStyle = cssVar('--grid-strong', 'rgba(35,50,90,0.10)');
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

      // 散点（仅在播放时取数据）— 单层荧光（避免双层 shadowBlur 在 2048 fillRect 上累加）
      if (engine.isPlaying) {
        engine.lAna.getFloatTimeDomainData(engine.lBuf);
        engine.rAna.getFloatTimeDomainData(engine.rBuf);
        const L = engine.lBuf, R = engine.rBuf;
        const isDark = document.body.classList.contains('dark');
        const accentColor = cssVar('--accent', '#3b6db5');
        const glowColor = cssVar('--accent-glow', 'rgba(59, 109, 181, 0.4)');

        ctx2d.fillStyle = accentColor;
        ctx2d.globalAlpha = isDark ? 0.85 : 0.65;
        ctx2d.shadowColor = glowColor;
        ctx2d.shadowBlur = isDark ? 4 : 2;
        for (let i = 0; i < L.length; i++) {
          const side = (L[i] - R[i]) * SQRT_HALF;
          const mid  = (L[i] + R[i]) * SQRT_HALF;
          const x = cx + side * radius;
          const y = cy - mid * radius;
          ctx2d.fillRect(x, y, 1.5, 1.5);
        }
        ctx2d.shadowBlur = 0;
        ctx2d.globalAlpha = 1;
      }

      // 标签
      ctx2d.fillStyle = cssVar('--text-2', '#5a6273');
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
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
