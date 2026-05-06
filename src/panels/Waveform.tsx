import { useEffect, useRef } from 'react';
import { engine } from '../audio/engine';
import { cssVar } from '../theme';
import { formatTime } from '../audio/stats';

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

    function xToTime(clientX: number): number {
      if (!engine.audioBuffer) return 0;
      const r = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(r.width, clientX - r.left));
      return x / r.width * engine.audioBuffer.duration;
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
    canvas.addEventListener('mousedown', onMouseDown);
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
        ctx2d.fillText('载入音频后显示整首歌的波形', 12, h / 2);
        raf = requestAnimationFrame(draw);
        return;
      }

      const progress = engine.getProgress();
      const N = peaks.min.length;
      const cy = h * 0.50;
      const half = h * 0.40;
      const playX = progress * w;
      const isDragging = dragRef.current.active;

      const useMultiband = engine.colorMode === 'multiband' && cPeaks;
      const playedColor   = '#3b6db5';
      const unplayedColor = cssVar('--wave-unplayed', '#bcc1cb');
      for (let px = 0; px < w; px++) {
        const i = Math.min(N - 1, Math.floor(px / w * N));
        const mn = peaks.min[i];
        const mx = peaks.max[i];
        const y1 = cy - mx * half;
        const y2 = cy - mn * half;
        if (useMultiband) {
          // 整首彩色，只是未播放部分降低不透明度
          ctx2d.strokeStyle = cPeaks.colors[i];
          ctx2d.globalAlpha = px <= playX ? 1 : 0.40;
        } else {
          ctx2d.strokeStyle = px <= playX ? playedColor : unplayedColor;
          ctx2d.globalAlpha = 1;
        }
        ctx2d.beginPath();
        ctx2d.moveTo(px + 0.5, y1);
        ctx2d.lineTo(px + 0.5, y2);
        ctx2d.stroke();
      }
      ctx2d.globalAlpha = 1;

      // 拖动光晕
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
      // 主播放头
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
      ctx2d.lineWidth = 1;

      // 时间码
      const cur = buf.duration * progress;
      const dur = buf.duration;
      ctx2d.fillStyle = cssVar('--text', '#3a4150');
      ctx2d.font = '14px MiSans, "Microsoft YaHei", sans-serif';
      ctx2d.fillText(formatTime(cur), 8, h - 8);
      const durStr = formatTime(dur);
      const durW = ctx2d.measureText(durStr).width;
      ctx2d.fillText(durStr, w - 8 - durW, h - 8);

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', fit);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
