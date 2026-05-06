import { useEffect, useRef } from 'react';
import { trackEngine } from '../audio/trackEngine';
import { cssVar } from '../theme';

const COLUMNS = 480;   // 缓冲柱数；每柱 ~16ms（@60fps），约显示最近 8 秒
const HISTORY_FILL_COLOR = '#3b6db5';

/**
 * 实时滚动波形：从右向左流动。
 * - 每帧从 trackEngine.analyser 取一段时域样本，压缩为 (min, max)
 * - 写入环形缓冲，渲染时按"老→新（左→右）"绘制
 */
export default function ScrollingWaveform({ className, active }: { className?: string; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colMinRef = useRef(new Float32Array(COLUMNS));
  const colMaxRef = useRef(new Float32Array(COLUMNS));
  const writeIdxRef = useRef(0);
  const sampleBufRef = useRef(new Float32Array(trackEngine.analyser.fftSize));

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

    let raf = 0;
    function draw() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx2d.clearRect(0, 0, w, h);

      // 中线 + 警戒
      ctx2d.strokeStyle = cssVar('--grid', 'rgba(35,50,90,0.07)');
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      ctx2d.moveTo(0, h / 2); ctx2d.lineTo(w, h / 2);
      ctx2d.stroke();
      ctx2d.strokeStyle = 'rgba(232, 93, 74, 0.20)';
      ctx2d.beginPath();
      ctx2d.moveTo(0, h * 0.04); ctx2d.lineTo(w, h * 0.04);
      ctx2d.moveTo(0, h * 0.96); ctx2d.lineTo(w, h * 0.96);
      ctx2d.stroke();

      // 取最新一帧时域 → 写入环形缓冲
      if (active) {
        const buf = sampleBufRef.current;
        trackEngine.analyser.getFloatTimeDomainData(buf);
        let mn = 0, mx = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = buf[i];
          if (v < mn) mn = v;
          if (v > mx) mx = v;
        }
        const wi = writeIdxRef.current;
        colMinRef.current[wi] = mn;
        colMaxRef.current[wi] = mx;
        writeIdxRef.current = (wi + 1) % COLUMNS;
      }

      // 绘制：从最老到最新，最新在最右
      const cy = h * 0.5;
      const half = h * 0.45;
      const colMin = colMinRef.current;
      const colMax = colMaxRef.current;
      const start = writeIdxRef.current;   // 最老的位置
      ctx2d.strokeStyle = HISTORY_FILL_COLOR;
      ctx2d.lineWidth = Math.max(1, Math.floor(w / COLUMNS));
      ctx2d.beginPath();
      for (let c = 0; c < COLUMNS; c++) {
        const i = (start + c) % COLUMNS;
        const x = (c / (COLUMNS - 1)) * w;
        const y1 = cy - colMax[i] * half;
        const y2 = cy - colMin[i] * half;
        ctx2d.moveTo(x, y1);
        ctx2d.lineTo(x, y2);
      }
      ctx2d.stroke();

      // 右边缘指示（写入头）
      ctx2d.strokeStyle = '#e85d4a';
      ctx2d.lineWidth = 2;
      ctx2d.beginPath();
      ctx2d.moveTo(w - 1, 0); ctx2d.lineTo(w - 1, h);
      ctx2d.stroke();
      ctx2d.lineWidth = 1;

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [active]);

  return <canvas ref={canvasRef} className={className} />;
}
