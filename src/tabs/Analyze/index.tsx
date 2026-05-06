import { useEffect, useRef, useState } from 'react';
import StatBar from '../../panels/StatBar';
import Goniometer from '../../panels/Goniometer';
import Spectrum from '../../panels/Spectrum';
import Waveform from '../../panels/Waveform';
import SpectrogramPanel from '../../panels/Spectrogram';
import SoundField from '../../panels/SoundField';
import ColorModeSwitch from '../../panels/ColorModeSwitch';
import LufsDisplay from '../../panels/LufsDisplay';
import SpectrumLegend from '../../panels/SpectrumLegend';
import s from './Analyze.module.css';

const TOP_ROW = 320;     // 声场+频响行高
const SPLITTER = 6;      // 分隔条高度
const MIN_PANEL = 80;    // 波形/频谱图各自最小高度
const STORAGE_KEY = 'lvWaveRatio';
const SF_KEY = 'lvSoundFieldMode';

type SoundFieldMode = 'goniometer' | 'sphere';

export default function Analyze() {
  const layoutRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const [waveRatio, setWaveRatio] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem(STORAGE_KEY) || '');
      if (Number.isFinite(v) && v > 0.05 && v < 0.95) return v;
    } catch { /* noop */ }
    return 0.4;
  });
  const [dragging, setDragging] = useState(false);
  const [sfMode, setSfMode] = useState<SoundFieldMode>(() => {
    try {
      const v = localStorage.getItem(SF_KEY);
      return v === 'sphere' ? 'sphere' : 'goniometer';
    } catch {
      return 'goniometer';
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(waveRatio)); } catch { /* noop */ }
  }, [waveRatio]);

  useEffect(() => {
    try { localStorage.setItem(SF_KEY, sfMode); } catch { /* noop */ }
  }, [sfMode]);

  // 拖拽分隔条改变 waveRatio
  function onSplitterDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    draggingRef.current = true;
    setDragging(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      const el = layoutRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // 可拖区域 = layout 内、扣掉 padding 上下 10、扣掉顶部行 320 + 1 个 gap、扣掉底部 1 个 gap、扣掉分隔条高度
      const padding = 10;
      const gap = 10;
      const topUsed = padding + TOP_ROW + gap;            // 顶部行结束的 y
      const available = r.height - topUsed - SPLITTER - gap - padding;
      if (available < MIN_PANEL * 2) return;
      const yLocal = e.clientY - r.top - topUsed;         // 在可拖区域内的相对 y
      const minRatio = MIN_PANEL / available;
      const maxRatio = 1 - minRatio;
      const ratio = Math.max(minRatio, Math.min(maxRatio, yLocal / available));
      setWaveRatio(ratio);
    }
    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // 用 fr 单位让两个面板按比例瓜分剩余高度
  const gridTemplateRows =
    `${TOP_ROW}px ${waveRatio.toFixed(4)}fr ${SPLITTER}px ${(1 - waveRatio).toFixed(4)}fr`;

  return (
    <>
      <StatBar />
      <div ref={layoutRef} className={s.layout} style={{ gridTemplateRows }}>
        <div className={`${s.panel} ${s.goniometer}`}>
          <h3 className={s.panelTitle}>
            <span className={s.triangle}>▶</span>
            {sfMode === 'goniometer' ? '声场指示器' : '声场分析球'}
            <span className={s.panelTitleEn}>
              {sfMode === 'goniometer' ? 'Goniometer · Mid / Side' : 'Sound Field · 4-band Spatial'}
            </span>
            <span className={s.panelTitleSpacer} />
            <div className={s.modeSwitch}>
              <button
                className={`${s.modeBtn} ${sfMode === 'goniometer' ? s.modeBtnActive : ''}`}
                onClick={() => setSfMode('goniometer')}
                title="Lissajous 利萨如散点（Mid/Side 关系）"
              >散点</button>
              <button
                className={`${s.modeBtn} ${sfMode === 'sphere' ? s.modeBtnActive : ''}`}
                onClick={() => setSfMode('sphere')}
                title="按频段的空间定位球（俯视图）"
              >球面</button>
            </div>
          </h3>
          {sfMode === 'goniometer'
            ? <Goniometer className={s.panelCanvas} />
            : <SoundField className={s.panelCanvas} />}
        </div>
        <div className={`${s.panel} ${s.spectrum}`}>
          <h3 className={s.panelTitle}>
            <span className={s.triangle}>▶</span>
            实时频响曲线
            <span className={s.panelTitleEn}>Spectrum · FFT (log freq, dBFS)</span>
            <span className={s.panelTitleSpacer} />
            <SpectrumLegend />
          </h3>
          <Spectrum className={`${s.panelCanvas} ${s.panelCanvasCrosshair}`} />
        </div>
        <div className={`${s.panel} ${s.waveform}`}>
          <h3 className={s.panelTitle}>
            <span className={s.triangle}>▶</span>
            波形 · 实时滚动
            <span className={s.panelTitleEn}>Waveform · click / drag to seek</span>
            <span className={s.panelTitleSpacer} />
            <ColorModeSwitch />
            <LufsDisplay />
          </h3>
          <Waveform className={`${s.panelCanvas} ${s.panelCanvasGrab}`} />
        </div>
        <div
          className={`${s.splitter} ${dragging ? s.splitterDragging : ''}`}
          onMouseDown={onSplitterDown}
          title="拖动调整两面板高度比例（双击重置）"
          onDoubleClick={() => setWaveRatio(0.4)}
        />
        <div className={`${s.panel} ${s.spectrogram}`}>
          <h3 className={s.panelTitle}>
            <span className={s.triangle}>▶</span>
            频谱图
            <span className={s.panelTitleEn}>Spectrogram · time × log-freq · magma</span>
          </h3>
          <SpectrogramPanel className={`${s.panelCanvas} ${s.panelCanvasCrosshair}`} />
        </div>
      </div>
    </>
  );
}
