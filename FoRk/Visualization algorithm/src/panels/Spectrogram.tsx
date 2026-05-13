import { useEffect, useRef } from 'react';
import { engine } from '../audio/engine';
import { renderSpectrogramBitmap } from '../audio/spectrogram';
import { cssVar } from '../theme';
import { formatTime } from '../audio/stats';
import { useUIStore } from '../store';

export default function SpectrogramPanel({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<HTMLCanvasElement | null>(null);
  const lastSpecRef = useRef<unknown>(null);
  const lastBmSizeRef = useRef({ w: 0, h: 0 });

  const hoverRef = useRef({ x: -1, y: -1 });
  const dragRef = useRef({ active: false, wasPlaying: false });

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

    /** 屏幕 X → 全曲时间，考虑视图窗口 */
    function xToTime(clientX: number): number {
      if (!engine.audioBuffer) return 0;
      const r = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(r.width, clientX - r.left));
      const xRatio = x / r.width;
      const { viewStart, viewEnd } = useUIStore.getState();
      const globalRatio = viewStart + xRatio * (viewEnd - viewStart);
      return globalRatio * engine.audioBuffer.duration;
    }

    function onMouseDown(e: MouseEvent) {
      if (!engine.audioBuffer || e.button !== 0) return;
      dragRef.current.active = true;
      dragRef.current.wasPlaying = engine.beginScrub();
      engine.scrub(xToTime(e.clientX));
    }
    function onMouseMove(e: MouseEvent) {
      // 更新 hover
      const r = canvas.getBoundingClientRect();
      hoverRef.current.x = e.clientX - r.left;
      hoverRef.current.y = e.clientY - r.top;
      // 拖动跳转
      if (dragRef.current.active) {
        engine.scrub(xToTime(e.clientX));
      }
    }
    function onMouseUp() {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      engine.endScrub(dragRef.current.wasPlaying);
    }
    function onMouseLeave() {
      hoverRef.current.x = -1;
      hoverRef.current.y = -1;
    }
    function onDblClick() {
      useUIStore.getState().resetView();
    }
    function onWheel(e: WheelEvent) {
      if (!e.shiftKey) return;
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const xRatio = (e.clientX - r.left) / r.width;
      const { viewStart, viewEnd, zoomViewAt } = useUIStore.getState();
      const anchor = viewStart + xRatio * (viewEnd - viewStart);
      const factor = e.deltaY < 0 ? 1.25 : 1 / 1.25;
      zoomViewAt(anchor, factor);
    }
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('dblclick', onDblClick);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    let raf = 0;
    function draw() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx2d.clearRect(0, 0, w, h);

      const spec = engine.spectrogram;
      if (!spec) {
        ctx2d.fillStyle = cssVar('--text-3', '#9aa3b3');
        ctx2d.font = '14px MiSans, "Microsoft YaHei", sans-serif';
        ctx2d.fillText('载入音频后显示频谱图（时间-频率热图，Shift+滚轮缩放，双击重置）', 12, h / 2);
        raf = requestAnimationFrame(draw);
        return;
      }

      // 用预渲染位图（整曲范围、固定大尺寸），drawImage 时按视图切片
      const sizeChanged = w !== lastBmSizeRef.current.w || h !== lastBmSizeRef.current.h;
      const specChanged = spec !== lastSpecRef.current;
      if (specChanged || sizeChanged || !bitmapRef.current) {
        // bitmap 宽度 = max(timeBins, 显示宽度)，避免被拉伸出竖条纹
        const bmW = Math.max(spec.timeBins, w);
        const bmH = Math.max(200, h);
        bitmapRef.current = renderSpectrogramBitmap(spec, bmW, bmH);
        lastSpecRef.current = spec;
        lastBmSizeRef.current = { w, h };
      }

      const { viewStart, viewEnd } = useUIStore.getState();
      const viewRange = viewEnd - viewStart;
      const bmW = bitmapRef.current!.width;
      const bmH = bitmapRef.current!.height;
      ctx2d.imageSmoothingEnabled = true;
      ctx2d.drawImage(
        bitmapRef.current!,
        viewStart * bmW, 0, viewRange * bmW, bmH,
        0, 0, w, h
      );

      // 频率轴刻度
      const fMin = 20;
      const fMax = spec.sampleRate / 2;
      const logMin = Math.log2(fMin);
      const logMax = Math.log2(fMax);
      const fToY = (f: number) => h * (1 - (Math.log2(f) - logMin) / (logMax - logMin));

      ctx2d.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx2d.font = '11px MiSans, "Microsoft YaHei", sans-serif';
      ctx2d.textAlign = 'right';
      // 1-2-5 阶梯频率刻度
      [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].forEach(f => {
        if (f > fMax) return;
        const y = fToY(f);
        if (y < 8 || y > h - 4) return;
        // 短刻度线
        ctx2d.fillRect(w - 4, y, 4, 1);
        const label = f >= 1000 ? f / 1000 + 'k' : String(f);
        ctx2d.fillText(label, w - 8, y + 4);
      });
      ctx2d.textAlign = 'start';

      // 播放头
      if (engine.audioBuffer) {
        const progress = engine.getProgress();
        const playRatio = (progress - viewStart) / viewRange;
        if (playRatio >= 0 && playRatio <= 1) {
          const playX = playRatio * w;
          const isDragging = dragRef.current.active;

          if (isDragging) {
            ctx2d.strokeStyle = 'rgba(232, 93, 74, 0.30)';
            ctx2d.lineWidth = 10;
            ctx2d.beginPath();
            ctx2d.moveTo(playX, 0); ctx2d.lineTo(playX, h);
            ctx2d.stroke();
            ctx2d.strokeStyle = 'rgba(232, 93, 74, 0.55)';
            ctx2d.lineWidth = 5;
            ctx2d.beginPath();
            ctx2d.moveTo(playX, 0); ctx2d.lineTo(playX, h);
            ctx2d.stroke();
          }
          ctx2d.strokeStyle = '#e85d4a';
          ctx2d.lineWidth = isDragging ? 2.5 : 2;
          ctx2d.beginPath();
          ctx2d.moveTo(playX, 0);
          ctx2d.lineTo(playX, h);
          ctx2d.stroke();
          const tri = isDragging ? 7 : 5;
          ctx2d.fillStyle = '#e85d4a';
          ctx2d.beginPath();
          ctx2d.moveTo(playX - tri, 0);
          ctx2d.lineTo(playX + tri, 0);
          ctx2d.lineTo(playX, tri + 2);
          ctx2d.closePath();
          ctx2d.fill();
          if (isDragging) {
            ctx2d.fillStyle = 'rgba(232, 93, 74, 0.22)';
            ctx2d.beginPath();
            ctx2d.arc(playX, h / 2, 16, 0, Math.PI * 2);
            ctx2d.fill();
            ctx2d.fillStyle = '#e85d4a';
            ctx2d.beginPath();
            ctx2d.arc(playX, h / 2, 6, 0, Math.PI * 2);
            ctx2d.fill();
          }
          ctx2d.lineWidth = 1;
        }
      }

      // Hover 准星：时间 + 频率 + dB
      const { x: hx, y: hy } = hoverRef.current;
      if (hx >= 0 && hx <= w && hy >= 0 && hy <= h && engine.audioBuffer) {
        const xRatio = hx / w;
        const globalR = viewStart + xRatio * viewRange;
        const t = globalR * engine.audioBuffer.duration;
        // 频率：log 反算
        const yRatio = 1 - hy / h;
        const f = Math.pow(2, logMin + yRatio * (logMax - logMin));
        // dB：从原始 spectrogram 反查
        const tBin = Math.min(spec.timeBins - 1, Math.max(0, Math.floor(globalR * spec.timeBins)));
        const binStep = spec.sampleRate / spec.fftSize;
        const fBin = Math.min(spec.freqBins - 1, Math.max(1, Math.round(f / binStep)));
        const v = spec.data[tBin * spec.freqBins + fBin];
        const db = spec.dbFloor + (v / 255) * (spec.dbCeil - spec.dbFloor);

        // 十字线
        ctx2d.strokeStyle = cssVar('--hover-cross', 'rgba(232, 93, 74, 0.7)');
        ctx2d.lineWidth = 1;
        ctx2d.beginPath();
        ctx2d.moveTo(hx, 0); ctx2d.lineTo(hx, h);
        ctx2d.moveTo(0, hy); ctx2d.lineTo(w, hy);
        ctx2d.stroke();

        // 浮窗
        const fStr  = f >= 1000 ? (f / 1000).toFixed(2) + ' kHz' : f.toFixed(0) + ' Hz';
        const tStr  = formatTime(t);
        const dbStr = db.toFixed(1) + ' dB';
        const text = `${tStr}   ${fStr}   ${dbStr}`;
        ctx2d.font = '13px MiSans, "Microsoft YaHei", sans-serif';
        const tw = ctx2d.measureText(text).width;
        const padX = 10;
        const boxW = tw + padX * 2;
        const boxH = 24;
        let bx = hx + 10;
        let by = hy - boxH - 8;
        if (bx + boxW > w - 4) bx = hx - boxW - 10;
        if (by < 4) by = hy + 12;

        ctx2d.fillStyle = cssVar('--tooltip-bg', 'rgba(28, 33, 43, 0.95)');
        ctx2d.strokeStyle = cssVar('--tooltip-border', 'rgba(255,255,255,0.18)');
        ctx2d.lineWidth = 1;
        ctx2d.fillRect(bx, by, boxW, boxH);
        ctx2d.strokeRect(bx, by, boxW, boxH);
        ctx2d.fillStyle = cssVar('--text', '#fff');
        ctx2d.fillText(text, bx + padX, by + 16);
      }

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('dblclick', onDblClick);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
