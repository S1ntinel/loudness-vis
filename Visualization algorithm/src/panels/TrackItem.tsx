import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { trackEngine, type Track } from '../audio/trackEngine';
import { engine } from '../audio/engine';
import { useUIStore } from '../store';
import { useTrackState } from '../audio/useTrackState';
import { formatTime } from '../audio/stats';
import { cssVar } from '../theme';
import s from '../tabs/Record/Record.module.css';

const HANDLE_HIT = 12;

type DragMode = null | 'start' | 'end' | 'middle';

export default function TrackItem({ track }: { track: Track }) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(track.name);
  const setTab = useUIStore(st => st.setTab);
  const setFileName = useUIStore(st => st.setFileName);
  const { playState, playMode, playingIds } = useTrackState();

  const isSelfPlaying =
    playMode === 'preview' &&
    playingIds.length === 1 &&
    playingIds[0] === track.id;
  const previewBtnText = !isSelfPlaying
    ? t('record.previewBtn')
    : playState === 'playing' ? t('record.pauseBtn') : t('record.resumeBtn');

  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    initStart: number;
    initEnd: number;
  }>({ mode: null, startX: 0, initStart: 0, initEnd: 0 });

  // 画布
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx2d = canvas.getContext('2d')!;
    let needsRedraw = true;
    let isVisible = document.visibilityState === 'visible';
    let lastWidth = 0;
    let lastHeight = 0;
    let lastTrimStart = -1;
    let lastTrimEnd = -1;

    function fit() {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(2, Math.round(r.width * dpr));
      canvas.height = Math.max(2, Math.round(r.height * dpr));
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      needsRedraw = true;
    }
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    const onVisibilityChange = () => {
      isVisible = document.visibilityState === 'visible';
      if (isVisible) needsRedraw = true;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    let raf = 0;
    function paint(w: number, h: number) {
      lastWidth = w;
      lastHeight = h;
      lastTrimStart = track.trimStart;
      lastTrimEnd = track.trimEnd;
      ctx2d.clearRect(0, 0, w, h);

      const peaks = track.peaks;
      const N = peaks.min.length;
      const cy = h * 0.5;
      const half = h * 0.40;
      const dur = track.duration;
      const startX = (track.trimStart / dur) * w;
      const endX   = (track.trimEnd   / dur) * w;

      const playedColor = cssVar('--accent', '#3b6db5');
      const dimColor    = cssVar('--wave-unplayed', '#bcc1cb');

      // 画波形（外部柔灰、中间饱和蓝）
      for (let px = 0; px < w; px++) {
        const i = Math.min(N - 1, Math.floor(px / w * N));
        const mn = peaks.min[i];
        const mx = peaks.max[i];
        const y1 = cy - mx * half;
        const y2 = cy - mn * half;
        const inside = px >= startX && px <= endX;
        ctx2d.strokeStyle = inside ? playedColor : dimColor;
        ctx2d.globalAlpha = inside ? 1 : 0.45;
        ctx2d.beginPath();
        ctx2d.moveTo(px + 0.5, y1);
        ctx2d.lineTo(px + 0.5, y2);
        ctx2d.stroke();
      }
      ctx2d.globalAlpha = 1;

      // 两端竖线 + 把手
      const drawHandle = (x: number) => {
        ctx2d.strokeStyle = '#e8a64a';
        ctx2d.lineWidth = 2;
        ctx2d.beginPath();
        ctx2d.moveTo(x, 0); ctx2d.lineTo(x, h);
        ctx2d.stroke();
        // 三角把手
        ctx2d.fillStyle = '#e8a64a';
        ctx2d.beginPath();
        ctx2d.moveTo(x - 5, 0); ctx2d.lineTo(x + 5, 0); ctx2d.lineTo(x, 6);
        ctx2d.closePath();
        ctx2d.fill();
        ctx2d.beginPath();
        ctx2d.moveTo(x - 5, h); ctx2d.lineTo(x + 5, h); ctx2d.lineTo(x, h - 6);
        ctx2d.closePath();
        ctx2d.fill();
      };
      drawHandle(startX);
      drawHandle(endX);
      ctx2d.lineWidth = 1;

      // 时间码（小字，紧贴端点）
      ctx2d.fillStyle = cssVar('--text-2', '#5a6273');
      ctx2d.font = '11px MiSans, "Microsoft YaHei", sans-serif';
      const startStr = formatTime(track.trimStart);
      const endStr   = formatTime(track.trimEnd);
      const startW = ctx2d.measureText(startStr).width;
      const endW   = ctx2d.measureText(endStr).width;
      // 防止与对方端点重叠
      ctx2d.fillText(startStr, Math.min(startX + 4, endX - startW - 4), h - 4);
      ctx2d.fillText(endStr,   Math.min(endX + 4,   w - endW - 2), h - 4);
    }

    function draw() {
      if (!isVisible) { raf = requestAnimationFrame(draw); return; }
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w !== lastWidth || h !== lastHeight || track.trimStart !== lastTrimStart || track.trimEnd !== lastTrimEnd) {
        needsRedraw = true;
      }
      if (needsRedraw) {
        needsRedraw = false;
        paint(w, h);
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [track]);

  // 鼠标交互：判定 hit 区域 + 拖拽
  useEffect(() => {
    const canvas = canvasRef.current!;

    function clientXToTime(clientX: number): number {
      const r = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(r.width, clientX - r.left));
      return x / r.width * track.duration;
    }
    function clientXToPx(clientX: number): number {
      const r = canvas.getBoundingClientRect();
      return clientX - r.left;
    }
    function trimStartPx() {
      const r = canvas.getBoundingClientRect();
      return (track.trimStart / track.duration) * r.width;
    }
    function trimEndPx() {
      const r = canvas.getBoundingClientRect();
      return (track.trimEnd / track.duration) * r.width;
    }
    function modeAt(px: number): DragMode {
      const sx = trimStartPx(), ex = trimEndPx();
      if (Math.abs(px - sx) < HANDLE_HIT) return 'start';
      if (Math.abs(px - ex) < HANDLE_HIT) return 'end';
      if (px >= sx && px <= ex) return 'middle';
      // 点击两端外区域 = 把就近端点拉过来
      return px < sx ? 'start' : 'end';
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return;
      const px = clientXToPx(e.clientX);
      const mode = modeAt(px);
      dragRef.current = {
        mode,
        startX: e.clientX,
        initStart: track.trimStart,
        initEnd:   track.trimEnd,
      };
      // 立刻同步一次（点击两端外侧时把端点拉过来）
      const t = clientXToTime(e.clientX);
      if (mode === 'start') trackEngine.updateTrim(track.id, t, track.trimEnd);
      else if (mode === 'end') trackEngine.updateTrim(track.id, track.trimStart, t);
    }

    function onMouseMove(e: MouseEvent) {
      const px = clientXToPx(e.clientX);
      // hover cursor 提示（仅当未拖拽时）
      if (!dragRef.current.mode) {
        const m = modeAt(px);
        canvas.style.cursor =
          m === 'start' || m === 'end' ? 'ew-resize'
          : m === 'middle' ? 'grab'
          : 'pointer';
      }

      const drag = dragRef.current;
      if (!drag.mode) return;

      const t = clientXToTime(e.clientX);
      if (drag.mode === 'start') {
        trackEngine.updateTrim(track.id, t, track.trimEnd);
      } else if (drag.mode === 'end') {
        trackEngine.updateTrim(track.id, track.trimStart, t);
      } else if (drag.mode === 'middle') {
        // 整段拖动：保持长度，移动 [start, end]
        const r = canvas.getBoundingClientRect();
        const dx = e.clientX - drag.startX;
        const dt = (dx / r.width) * track.duration;
        const len = drag.initEnd - drag.initStart;
        let ns = drag.initStart + dt;
        let ne = drag.initEnd + dt;
        if (ns < 0) { ns = 0; ne = len; }
        if (ne > track.duration) { ne = track.duration; ns = ne - len; }
        trackEngine.updateTrim(track.id, ns, ne);
        canvas.style.cursor = 'grabbing';
      }
    }

    function onMouseUp() {
      dragRef.current.mode = null;
      // 还原 cursor
      canvas.style.cursor = '';
    }

    function onDblClick() {
      trackEngine.resetTrim(track.id);
    }

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('dblclick', onDblClick);
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('dblclick', onDblClick);
    };
  }, [track]);

  // 操作
  function commitName() {
    if (draftName.trim()) trackEngine.rename(track.id, draftName.trim());
    setEditing(false);
  }

  async function sendToAnalyze() {
    const file = new File([track.blob], track.name + '.webm', { type: track.blob.type });
    const r = await engine.loadFile(file);
    if (r.ok) {
      setFileName(track.name);
      setTab('analyze');
    } else {
      alert(t('upload.decodeFailFmt', { msg: r.error || '' }));
    }
  }

  function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function exportTrim() {
    try {
      const wav = await trackEngine.exportTrim(track);
      const ts = `[${formatTime(track.trimStart).replace(':', '.')}-${formatTime(track.trimEnd).replace(':', '.')}]`;
      downloadBlob(wav, `${track.name} ${ts}.wav`);
    } catch (e) {
      alert(t('record.exportFailFmt', { msg: (e as Error).message }));
    }
  }

  async function exportFull() {
    try {
      const wav = await trackEngine.exportTrim({
        ...track, trimStart: 0, trimEnd: track.duration,
      });
      downloadBlob(wav, track.name + '.wav');
    } catch (e) {
      alert(t('record.exportFailFmt', { msg: (e as Error).message }));
    }
  }

  const trimDur = track.trimEnd - track.trimStart;
  const isWhole = track.trimStart === 0 && Math.abs(track.trimEnd - track.duration) < 0.001;

  return (
    <div className={`${s.trackItem} ${track.selected ? s.trackItemSelected : ''}`}>
      <div className={s.trackHead}>
        <button
          className={`${s.checkbox} ${track.selected ? s.checkboxChecked : ''}`}
          onClick={() => trackEngine.toggleSelect(track.id)}
          aria-label={track.selected ? t('record.deselectTrack') : t('record.selectTrack')}
        >
          {track.selected ? '✓' : ''}
        </button>
        <span className={s.trackIcon}>{track.source === 'recording' ? '🎤' : '📁'}</span>
        {editing ? (
          <input
            autoFocus
            className={s.recNameInput}
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => {
              if (e.key === 'Enter') commitName();
              if (e.key === 'Escape') setEditing(false);
            }}
          />
        ) : (
          <span className={s.trackName} onDoubleClick={() => { setDraftName(track.name); setEditing(true); }}>
            {track.name}
          </span>
        )}
        <span className={s.trackMeta}>
          {isWhole ? formatTime(track.duration) : `${formatTime(trimDur)} / ${formatTime(track.duration)}`}
        </span>
      </div>

      <canvas ref={canvasRef} className={s.trackCanvas} />

      <div className={s.trackActions}>
        <button className={s.recBtn} onClick={() => trackEngine.togglePreview(track)}>{previewBtnText}</button>
        <button className={s.recBtn} onClick={exportTrim}>{t('record.exportTrim')}</button>
        <button className={s.recBtn} onClick={exportFull}>{t('record.exportFull')}</button>
        <button className={s.recBtn} onClick={sendToAnalyze}>{t('record.sendToAnalyze')}</button>
        <button className={s.recBtn} onClick={() => trackEngine.resetTrim(track.id)} disabled={isWhole}>{t('record.resetTrim')}</button>
        <button className={s.recBtn} onClick={() => { setDraftName(track.name); setEditing(true); }}>{t('record.renameTrack')}</button>
        <button className={`${s.recBtn} ${s.recBtnDanger}`} onClick={() => trackEngine.remove(track.id)}>{t('record.removeTrack')}</button>
      </div>
    </div>
  );
}
