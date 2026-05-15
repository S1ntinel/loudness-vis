import { useEffect, useRef } from 'react';
import { engine } from '../audio/engine';
import { cssVar } from '../theme';
import { formatTime } from '../audio/stats';
import { useUIStore } from '../store';

export default function Waveform({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef({ active: false, wasPlaying: false });
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
    function onDblClick() { useUIStore.getState().resetView(); }
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
    const onVis = () => { isVisible = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', onVis);

    let raf = 0;
    let lastFrameTime = 0;
    
    // 硬件风格颜色
    const cssAccent = cssVar('--vfd-cyan', '#60F2FF');
    const cssWaveUnplayed = 'rgba(166, 164, 157, 0.25)';
    const cssText = cssVar('--vfd-green', '#6CFF9A');
    const cssRed = cssVar('--vfd-red', '#E64B3A');

    function draw(now = performance.now()) {
      if (!isVisible) { raf = requestAnimationFrame(draw); return; }
      if (now - lastFrameTime < 32) { raf = requestAnimationFrame(draw); return; }
      lastFrameTime = now;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx2d.clearRect(0, 0, w, h);

      const peaks = engine.waveformPeaks;
      const buf = engine.audioBuffer;
      if (!peaks || !buf) {
        ctx2d.fillStyle = cssVar('--hw-metal', '#A6A49D');
        ctx2d.font = '10px monospace';
        ctx2d.fillText('WAITING FOR SIGNAL...', 12, h / 2);
        raf = requestAnimationFrame(draw);
        return;
      }

      const { viewStart, viewEnd } = useUIStore.getState();
      const viewRange = viewEnd - viewStart;
      const progress = engine.getProgress();
      const peakMin = peaks.min;
      const peakMax = peaks.max;
      const N = peakMin.length;
      const cy = h * 0.50;
      const half = h * 0.40;

      const playRatio = (progress - viewStart) / viewRange;
      const playX = playRatio * w;
      const playHeadVisible = playRatio >= 0 && playRatio <= 1;

      function appendColumns(fromPx: number, toPx: number) {
        const start = Math.max(0, Math.floor(fromPx));
        const end = Math.min(w, Math.ceil(toPx));
        for (let px = start; px < end; px++) {
          const globalR = viewStart + (px / w) * viewRange;
          const i = Math.min(N - 1, Math.max(0, Math.floor(globalR * N)));      
          const x = px + 0.5;
          ctx2d.moveTo(x, cy - peakMax[i] * half);
          ctx2d.lineTo(x, cy - peakMin[i] * half);
        }
      }

      const playedEnd = playHeadVisible ? Math.min(w, playX) : progress >= viewEnd ? w : 0;
      if (playedEnd > 0) {
        ctx2d.strokeStyle = cssAccent;
        ctx2d.beginPath();
        appendColumns(0, playedEnd);
        ctx2d.stroke();
      }
      if (playedEnd < w) {
        ctx2d.strokeStyle = cssWaveUnplayed;
        ctx2d.beginPath();
        appendColumns(playedEnd, w);
        ctx2d.stroke();
      }

      if (playHeadVisible) {
        ctx2d.strokeStyle = cssRed;
        ctx2d.lineWidth = 1.5;
        ctx2d.beginPath(); ctx2d.moveTo(playX, 0); ctx2d.lineTo(playX, h); ctx2d.stroke();
        ctx2d.lineWidth = 1;
      }

      const dur = buf.duration;
      const cur = dur * progress;
      ctx2d.fillStyle = cssText;
      ctx2d.font = '10px monospace';
      ctx2d.fillText(`T: ${formatTime(cur)} / DUR: ${formatTime(dur)}`, 8, h - 8);

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [theme, preset]);

  return <canvas ref={canvasRef} className={className} />;
}
