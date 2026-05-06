import { useEffect, useRef } from 'react';
import { engine } from '../audio/engine';
import { cssVar } from '../theme';
import { formatTime } from '../audio/stats';
import { useUIStore } from '../store';

export default function Waveform({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    window.addEventListener('resize', fit);

    /** 屏幕 X → 全曲时间（秒），考虑视图窗口 */
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
      if (!dragRef.current.active) return;
      engine.scrub(xToTime(e.clientX));
    }
    function onMouseUp() {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      engine.endScrub(dragRef.current.wasPlaying);
    }
    function onDblClick() {
      useUIStore.getState().resetView();
    }
    /** Shift+滚轮：以鼠标 X 为锚点缩放 */
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
    canvas.addEventListener('dblclick', onDblClick);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    let raf = 0;
    function draw() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx2d.clearRect(0, 0, w, h);

      const peaks = engine.waveformPeaks;
      const cPeaks = engine.coloredPeaks;
      const buf = engine.audioBuffer;
      if (!peaks || !buf) {
        ctx2d.fillStyle = cssVar('--text-3', '#9aa3b3');
        ctx2d.font = '14px MiSans, "Microsoft YaHei", sans-serif';
        ctx2d.fillText('载入音频后显示整首歌的波形（Shift+滚轮缩放，双击重置）', 12, h / 2);
        raf = requestAnimationFrame(draw);
        return;
      }

      const { viewStart, viewEnd } = useUIStore.getState();
      const viewRange = viewEnd - viewStart;
      const progress = engine.getProgress();
      const N = peaks.min.length;
      const cy = h * 0.50;
      const half = h * 0.40;
      const isDragging = dragRef.current.active;

      // 把全曲 progress 映射到当前视图内的 X
      const playRatio = (progress - viewStart) / viewRange;
      const playX = playRatio * w;
      const playHeadVisible = playRatio >= 0 && playRatio <= 1;

      const useColored = engine.colorMode !== 'mono' && cPeaks;
      const colors = engine.colorMode === 'multiband' ? cPeaks?.colorsRgb : cPeaks?.colorsCentroid;
      const playedColor   = '#3b6db5';
      const unplayedColor = cssVar('--wave-unplayed', '#bcc1cb');

      for (let px = 0; px < w; px++) {
        // 当前像素对应的全曲 ratio → bin index
        const globalR = viewStart + (px / w) * viewRange;
        const i = Math.min(N - 1, Math.max(0, Math.floor(globalR * N)));
        const mn = peaks.min[i];
        const mx = peaks.max[i];
        const y1 = cy - mx * half;
        const y2 = cy - mn * half;
        if (useColored && colors) {
          ctx2d.strokeStyle = colors[i];
          ctx2d.globalAlpha = (playHeadVisible && px <= playX) || (progress >= viewEnd) ? 1 : 0.40;
          if (!playHeadVisible && progress < viewStart) ctx2d.globalAlpha = 0.40;
        } else {
          const beforePlay = playHeadVisible ? px <= playX : progress >= viewEnd;
          ctx2d.strokeStyle = beforePlay ? playedColor : unplayedColor;
          ctx2d.globalAlpha = 1;
        }
        ctx2d.beginPath();
        ctx2d.moveTo(px + 0.5, y1);
        ctx2d.lineTo(px + 0.5, y2);
        ctx2d.stroke();
      }
      ctx2d.globalAlpha = 1;

      // 播放头（在视图内才画）
      if (playHeadVisible) {
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
          ctx2d.arc(playX, cy, 16, 0, Math.PI * 2);
          ctx2d.fill();
          ctx2d.fillStyle = '#e85d4a';
          ctx2d.beginPath();
          ctx2d.arc(playX, cy, 6, 0, Math.PI * 2);
          ctx2d.fill();
        }
      }
      ctx2d.lineWidth = 1;

      // 时间码：当前视图开始 / 当前播放 / 视图结束
      const dur = buf.duration;
      const cur = dur * progress;
      const tStart = dur * viewStart;
      const tEnd   = dur * viewEnd;
      ctx2d.fillStyle = cssVar('--text', '#3a4150');
      ctx2d.font = '14px MiSans, "Microsoft YaHei", sans-serif';
      const isZoomed = viewRange < 0.999;
      const leftStr  = isZoomed ? `${formatTime(tStart)} · ${formatTime(cur)}` : formatTime(cur);
      const rightStr = isZoomed ? `${formatTime(tEnd)} · ${formatTime(dur)}` : formatTime(dur);
      ctx2d.fillText(leftStr, 8, h - 8);
      const rightW = ctx2d.measureText(rightStr).width;
      ctx2d.fillText(rightStr, w - 8 - rightW, h - 8);

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', fit);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('dblclick', onDblClick);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
