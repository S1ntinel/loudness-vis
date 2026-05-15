import { useEffect, useRef } from 'react';
import { engine } from '../audio/engine';
import { soundFieldAnalyser, SOUND_FIELD_BANDS } from '../audio/soundField';
import { cssVar } from '../theme';

export default function SoundField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef(SOUND_FIELD_BANDS.map(() => ({ x: 0, y: 0, r: 0 })));

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
    const onVis = () => { isVisible = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', onVis);

    let raf = 0;
    let lastProcessTime = 0;
    const cssVfdCyan = cssVar('--vfd-cyan', '#60F2FF');
    const cssHwMetal = cssVar('--hw-metal', '#A6A49D');

    function draw(now = performance.now()) {
      if (!isVisible) { raf = requestAnimationFrame(draw); return; }
      if (now - lastProcessTime < 32) { raf = requestAnimationFrame(draw); return; }
      
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx2d.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2 + 8;
      const radius = Math.min(w, h) * 0.38;

      // 模拟雷达网格
      ctx2d.strokeStyle = 'rgba(96, 242, 255, 0.12)';
      ctx2d.lineWidth = 1;
      [0.3, 0.6, 0.9].forEach(rr => {
        ctx2d.beginPath(); ctx2d.arc(cx, cy, radius * rr, 0, Math.PI * 2); ctx2d.stroke();
      });

      if (engine.isPlaying) {
        soundFieldAnalyser.process();
        lastProcessTime = now;
      }
      const bands = soundFieldAnalyser.getBands();

      for (let bi = 0; bi < SOUND_FIELD_BANDS.length; bi++) {
        const { L, R } = bands[bi];
        const energy = (L + R) * 0.5;
        const pan = (R - L) / (L + R + 1e-9);
        const angle = -Math.PI / 2 + pan * (Math.PI / 2);
        const energyNorm = Math.min(1, energy * 12);
        const dist = energyNorm * radius * 0.9;
        const ballR = 5 + energyNorm * 12;
        const ball = ballsRef.current[bi];
        ball.x = ball.x * 0.7 + (Math.cos(angle) * dist) * 0.3;
        ball.y = ball.y * 0.7 + (Math.sin(angle) * dist) * 0.3;
        ball.r = ball.r * 0.7 + ballR * 0.3;
      }

      ctx2d.fillStyle = cssHwMetal;
      ctx2d.globalAlpha = 0.5;
      ctx2d.beginPath(); ctx2d.arc(cx, cy, 6, 0, Math.PI * 2); ctx2d.fill();
      ctx2d.globalAlpha = 1;

      // 频段球体 - 移除 shadowBlur
      for (let bi = 0; bi < SOUND_FIELD_BANDS.length; bi++) {       
        const band = SOUND_FIELD_BANDS[bi];
        const ball = ballsRef.current[bi];
        const x = cx + ball.x;
        const y = cy + ball.y;

        ctx2d.fillStyle = band.color;
        ctx2d.globalAlpha = 0.2;
        ctx2d.beginPath(); ctx2d.arc(x, y, ball.r * 1.5, 0, Math.PI * 2); ctx2d.fill();
        ctx2d.globalAlpha = 1.0;
        ctx2d.beginPath(); ctx2d.arc(x, y, ball.r, 0, Math.PI * 2); ctx2d.fill();

        ctx2d.fillStyle = '#000';
        ctx2d.font = 'bold 9px monospace';
        ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
        ctx2d.fillText(band.label.charAt(0), x, y);
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
