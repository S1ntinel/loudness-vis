import { useEffect, useRef } from 'react';
import { engine } from '../audio/engine';
import { cssVar } from '../theme';

export default function Spectrum({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverRef = useRef({ x: -1, y: -1 });

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

    let raf = 0;

    function draw() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx2d.clearRect(0, 0, w, h);

      const fs   = engine.ctx.sampleRate;
      const fMin = 20;
      const fMax = fs / 2;
      const fToX = (f: number) => Math.log2(f / fMin) / Math.log2(fMax / fMin) * w;
      const xToF = (x: number) => fMin * Math.pow(fMax / fMin, x / w);

      // 网格
      ctx2d.strokeStyle = cssVar('--grid', 'rgba(35,50,90,0.07)');
      ctx2d.fillStyle   = cssVar('--text-2', '#5a6273');
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

      // 曲线
      engine.specAna.getFloatFrequencyData(engine.specBuf);
      const specDb = engine.specBuf;
      const N = specDb.length;

      ctx2d.fillStyle = 'rgba(75, 130, 200, 0.30)';
      ctx2d.beginPath();
      ctx2d.moveTo(0, h);
      let started = false;
      for (let i = 1; i < N; i++) {
        const f = i * fs / (2 * N);
        if (f < fMin) continue;
        if (f > fMax) break;
        const x = fToX(f);
        const v = Math.max(-100, Math.min(0, specDb[i]));
        const y = h * (-v / 100);
        if (!started) { ctx2d.lineTo(x, h); started = true; }
        ctx2d.lineTo(x, y);
      }
      ctx2d.lineTo(w, h);
      ctx2d.closePath();
      ctx2d.fill();

      ctx2d.strokeStyle = '#3b6db5';
      ctx2d.lineWidth   = 1.5;
      ctx2d.beginPath();
      started = false;
      for (let i = 1; i < N; i++) {
        const f = i * fs / (2 * N);
        if (f < fMin) continue;
        if (f > fMax) break;
        const x = fToX(f);
        const v = Math.max(-100, Math.min(0, specDb[i]));
        const y = h * (-v / 100);
        if (!started) { ctx2d.moveTo(x, y); started = true; }
        else ctx2d.lineTo(x, y);
      }
      ctx2d.stroke();

      // Hover：十字线 + 浮窗
      const { x: hx, y: hy } = hoverRef.current;
      if (hx >= 0 && hx <= w && hy >= 0 && hy <= h) {
        const f = xToF(hx);
        const db = -100 * (hy / h);

        ctx2d.strokeStyle = cssVar('--hover-cross', 'rgba(232,93,74,0.55)');
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

        ctx2d.fillStyle = cssVar('--tooltip-bg', 'rgba(255,255,255,0.95)');
        ctx2d.strokeStyle = cssVar('--tooltip-border', 'rgba(20,30,50,0.18)');
        ctx2d.lineWidth = 1;
        ctx2d.fillRect(bx, by, boxW, boxH);
        ctx2d.strokeRect(bx, by, boxW, boxH);
        ctx2d.fillStyle = cssVar('--text', '#1d2026');
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
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
