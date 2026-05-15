import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { engine } from '../audio/engine';
import s from '../tabs/Analyze/Analyze.module.css';

/**
 * LUFS 数显（5 项）— Gain 风格：
 *  M  Momentary  (400ms 实时)
 *  S  Short-term (3s 实时)
 *  I  Integrated (整曲)
 *  TP True Peak  (整曲，dBTP)
 *  LR Loudness Range (整曲)
 *
 * 每项显示：标签 + 数值 + 小型条形指示器
 */
export default function LufsDisplay() {
  const { t } = useTranslation();
  const mRef  = useRef<HTMLSpanElement>(null);
  const sRef  = useRef<HTMLSpanElement>(null);
  const iRef  = useRef<HTMLSpanElement>(null);
  const tpRef = useRef<HTMLSpanElement>(null);
  const lrRef = useRef<HTMLSpanElement>(null);
  const mBarRef  = useRef<HTMLDivElement>(null);
  const sBarRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    function loop() {
      const lr = engine.lufsResult;

      const m = engine.getMomentaryLufs();
      if (mRef.current) mRef.current.textContent = isFinite(m) ? m.toFixed(1) : '—';
      // Momentary 条：-60..0 映射到 0..100%
      if (mBarRef.current) {
        const pct = isFinite(m) ? Math.max(0, Math.min(100, (m + 60) / 60 * 100)) : 0;
        mBarRef.current.style.width = `${pct}%`;
      }

      const st = engine.getShortTermLufs();
      if (sRef.current) sRef.current.textContent = isFinite(st) ? st.toFixed(1) : '—';
      if (sBarRef.current) {
        const pct = isFinite(st) ? Math.max(0, Math.min(100, (st + 60) / 60 * 100)) : 0;
        sBarRef.current.style.width = `${pct}%`;
      }

      if (lr && iRef.current) {
        iRef.current.textContent = isFinite(lr.integrated) ? lr.integrated.toFixed(1) : '—';
      }
      if (lr && tpRef.current) {
        tpRef.current.textContent = isFinite(lr.truePeak) ? lr.truePeak.toFixed(1) : '—';
      }
      if (lr && lrRef.current) {
        lrRef.current.textContent = lr.lra.toFixed(1);
      }

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={s.lufs}>
      <div className={s.lufsItem} title={t('analyze.lufs.mTitle')}>
        <span className={s.lufsLabel}>M</span>
        <span ref={mRef} className={s.lufsValue}>—</span>
        <div className={s.lufsBar}>
          <div ref={mBarRef} className={s.lufsBarFill} />
        </div>
      </div>
      <div className={s.lufsItem} title={t('analyze.lufs.sTitle')}>
        <span className={s.lufsLabel}>S</span>
        <span ref={sRef} className={s.lufsValue}>—</span>
        <div className={s.lufsBar}>
          <div ref={sBarRef} className={s.lufsBarFill} />
        </div>
      </div>
      <div className={s.lufsItem} title={t('analyze.lufs.iTitle')}>
        <span className={s.lufsLabel}>I</span>
        <span ref={iRef} className={s.lufsValue}>—</span>
        <span className={s.lufsUnit}>LUFS</span>
      </div>
      <div className={s.lufsItem} title={t('analyze.lufs.tpTitle')}>
        <span className={s.lufsLabel}>TP</span>
        <span ref={tpRef} className={s.lufsValue}>—</span>
        <span className={s.lufsUnit}>dBTP</span>
      </div>
      <div className={s.lufsItem} title={t('analyze.lufs.lrTitle')}>
        <span className={s.lufsLabel}>LR</span>
        <span ref={lrRef} className={s.lufsValue}>—</span>
        <span className={s.lufsUnit}>LU</span>
      </div>
    </div>
  );
}
