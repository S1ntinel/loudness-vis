import { useEffect, useRef } from 'react';
import { engine } from '../audio/engine';
import s from '../tabs/Analyze/Analyze.module.css';

/**
 * 显示 Integrated LUFS（整曲，预计算） + Short-term LUFS（最近 3s，实时跟播放进度）
 */
export default function LufsDisplay() {
  const stRef = useRef<HTMLSpanElement>(null);
  const intRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    function loop() {
      const lr = engine.lufsResult;
      if (lr && intRef.current) {
        intRef.current.textContent = isFinite(lr.integrated) ? lr.integrated.toFixed(1) : '—';
      }
      const st = engine.getShortTermLufs();
      if (stRef.current) {
        stRef.current.textContent = isFinite(st) ? st.toFixed(1) : '—';
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={s.lufs}>
      <div className={s.lufsItem}>
        <span className={s.lufsLabel}>S</span>
        <span ref={stRef} className={s.lufsValue}>—</span>
        <span className={s.lufsUnit}>LUFS</span>
      </div>
      <div className={s.lufsItem}>
        <span className={s.lufsLabel}>I</span>
        <span ref={intRef} className={s.lufsValue}>—</span>
        <span className={s.lufsUnit}>LUFS</span>
      </div>
    </div>
  );
}
