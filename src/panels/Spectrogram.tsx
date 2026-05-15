import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { engine } from '../audio/engine';
import { renderSpectrogramBitmap, type ColorMap } from '../audio/spectrogram';
import { cssVar } from '../theme';
import { formatTime } from '../audio/stats';
import { useUIStore } from '../store';
import s from './Spectrogram.module.css';

const COLOR_MAPS: { value: ColorMap; label: string }[] = [
  { value: 'magma', label: 'Magma' },
  { value: 'viridis', label: 'Viridis' },
  { value: 'plasma', label: 'Plasma' },
  { value: 'inferno', label: 'Inferno' },
  { value: 'cool', label: 'Cool' },
];

export default function SpectrogramPanel({ className }: { className?: string }) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<HTMLCanvasElement | null>(null);
  const lastSpecRef = useRef<unknown>(null);
  const [colorMap, setColorMap] = useState<ColorMap>('magma');
  const colorMapRef = useRef<ColorMap>('magma');
  const hoverRef = useRef({ x: -1, y: -1 });

  useEffect(() => { colorMapRef.current = colorMap; }, [colorMap]);

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

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      hoverRef.current.x = e.clientX - r.left;
      hoverRef.current.y = e.clientY - r.top;
    };
    const onLeave = () => { hoverRef.current.x = -1; hoverRef.current.y = -1; };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    let raf = 0;
    function draw() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx2d.clearRect(0, 0, w, h);

      const spec = engine.spectrogram;
      if (!spec) {
        ctx2d.fillStyle = cssVar('--hw-metal', '#9aa3b3');
        ctx2d.font = '10px monospace';
        ctx2d.fillText('READY FOR SPECTRAL SCAN...', 12, h / 2);
        raf = requestAnimationFrame(draw);
        return;
      }

      // 优化：仅当 spec 或颜色改变时重绘大型位图
      // 且限制位图高度以平衡性能
      if (spec !== lastSpecRef.current || !bitmapRef.current) {
        const bmW = Math.min(spec.timeBins, 4000); // 限制宽度上限
        const bmH = 256; // 固定高度，绘制时拉伸
        bitmapRef.current = renderSpectrogramBitmap(spec, bmW, bmH, colorMapRef.current);
        lastSpecRef.current = spec;
      }

      const { viewStart, viewEnd } = useUIStore.getState();
      const viewRange = viewEnd - viewStart;
      const bmW = bitmapRef.current!.width;
      const bmH = bitmapRef.current!.height;

      ctx2d.imageSmoothingEnabled = true;
      ctx2d.drawImage(
        bitmapRef.current!,
        viewStart * bmW, 0, Math.max(1, viewRange * bmW), bmH,
        0, 0, w, h
      );

      // 刻度 & 播放头 (移除 shadowBlur)
      const fMax = spec.sampleRate / 2;
      const logMin = Math.log2(20);
      const logMax = Math.log2(fMax);
      const fToY = (f: number) => h * (1 - (Math.log2(f) - logMin) / (logMax - logMin));

      ctx2d.fillStyle = 'rgba(96, 242, 255, 0.6)';
      ctx2d.font = '9px monospace';
      [100, 1000, 5000, 10000].forEach(f => {
        const y = fToY(f);
        if (y > 10 && y < h - 10) ctx2d.fillText(f >= 1000 ? f / 1000 + 'k' : String(f), w - 25, y + 3);
      });

      if (engine.audioBuffer) {
        const playX = ((engine.getProgress() - viewStart) / viewRange) * w;
        if (playX >= 0 && playX <= w) {
          ctx2d.strokeStyle = cssVar('--vfd-red', '#E64B3A');
          ctx2d.lineWidth = 1.5;
          ctx2d.beginPath(); ctx2d.moveTo(playX, 0); ctx2d.lineTo(playX, h); ctx2d.stroke();
          ctx2d.lineWidth = 1;
        }
      }

      // Hover Crosshair
      const { x: hx, y: hy } = hoverRef.current;
      if (hx >= 0 && hx <= w && hy >= 0 && hy <= h && engine.audioBuffer) {
        ctx2d.strokeStyle = cssVar('--vfd-orange', '#F26A2E');
        ctx2d.setLineDash([2, 4]);
        ctx2d.beginPath(); ctx2d.moveTo(hx, 0); ctx2d.lineTo(hx, h); ctx2d.moveTo(0, hy); ctx2d.lineTo(w, hy); ctx2d.stroke();
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
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
      <canvas ref={canvasRef} className={className} />
      <div className={s.colorMapPanel}>
        {COLOR_MAPS.map(cm => (
          <button
            key={cm.value}
            className={`${s.colorMapBtn} ${colorMap === cm.value ? s.colorMapBtnActive : ''}`}
            onClick={() => { setColorMap(cm.value); bitmapRef.current = null; }}
          >{cm.label}</button>
        ))}
      </div>
    </div>
  );
}
