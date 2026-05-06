import StatBar from '../../panels/StatBar';
import Goniometer from '../../panels/Goniometer';
import Spectrum from '../../panels/Spectrum';
import Waveform from '../../panels/Waveform';
import ColorModeSwitch from '../../panels/ColorModeSwitch';
import LufsDisplay from '../../panels/LufsDisplay';
import s from './Analyze.module.css';

export default function Analyze() {
  return (
    <>
      <StatBar />
      <div className={s.layout}>
        <div className={`${s.panel} ${s.goniometer}`}>
          <h3 className={s.panelTitle}>
            <span className={s.triangle}>▶</span>
            声场指示器
            <span className={s.panelTitleEn}>Goniometer · Mid / Side</span>
          </h3>
          <Goniometer className={s.panelCanvas} />
        </div>
        <div className={`${s.panel} ${s.spectrum}`}>
          <h3 className={s.panelTitle}>
            <span className={s.triangle}>▶</span>
            实时频响曲线
            <span className={s.panelTitleEn}>Spectrum · FFT (log freq, dBFS)</span>
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
      </div>
    </>
  );
}
