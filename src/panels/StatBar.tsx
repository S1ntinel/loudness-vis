import { useEffect, useRef } from 'react';
import { engine } from '../audio/engine';
import { computeStats, percentile, median, STAT_DEFS, type StatKey } from '../audio/stats';
import s from '../tabs/Analyze/Analyze.module.css';

const STAT_WINDOW = 30;       // ~0.5s @ 60fps
const RMS_HIST_MAX = 1800;    // ~30s @ 60fps for DR90

export default function StatBar() {
  // 每个指标对应两个 ref：值/区间
  const valueRefs = useRef<Record<StatKey, HTMLDivElement | null>>({} as any);
  const rangeRefs = useRef<Record<StatKey, HTMLDivElement | null>>({} as any);
  const historyRef = useRef<Record<StatKey, number[]>>(
    Object.fromEntries(STAT_DEFS.map(d => [d.key, [] as number[]])) as any
  );
  const rmsHistoryRef = useRef<number[]>([]);

  useEffect(() => {
    let raf = 0;
    function loop() {
      if (engine.isPlaying) {
        engine.lAna.getFloatTimeDomainData(engine.lBuf);
        engine.rAna.getFloatTimeDomainData(engine.rBuf);
        const base = computeStats(engine.lBuf, engine.rBuf);

        // RMS 历史用于 DR90
        rmsHistoryRef.current.push(base.rmsDb);
        if (rmsHistoryRef.current.length > RMS_HIST_MAX) rmsHistoryRef.current.shift();
        const dr90 = rmsHistoryRef.current.length >= 60
          ? percentile(rmsHistoryRef.current, 0.9) - percentile(rmsHistoryRef.current, 0.1)
          : NaN;

        const stats = { ...base, dr90 } as Record<StatKey, number>;

        // 推入每个指标的滑动窗
        for (const d of STAT_DEFS) {
          const v = stats[d.key];
          if (v != null && !isNaN(v)) {
            const arr = historyRef.current[d.key];
            arr.push(v);
            if (arr.length > STAT_WINDOW) arr.shift();
          }
        }

        // 直接操作 DOM 更新数值（避免 setState 重渲染）
        for (const d of STAT_DEFS) {
          const arr = historyRef.current[d.key];
          const elV = valueRefs.current[d.key];
          const elR = rangeRefs.current[d.key];
          if (!elV || !elR) continue;
          if (arr.length === 0) {
            elV.textContent = '—';
            elV.className = s.value;
            elR.textContent = '—';
            continue;
          }
          const med = median(arr);
          elV.textContent = d.fmt(med);
          let cls = s.value;
          if (d.warn && d.warn(med)) cls += ' ' + s.warn;
          else if (d.ok && d.ok(med)) cls += ' ' + s.ok;
          elV.className = cls;
          let mn = Infinity, mx = -Infinity;
          for (const v of arr) { if (v < mn) mn = v; if (v > mx) mx = v; }
          const fmtR = d.fmtRange || ((v: number) => v.toFixed(d.dec));
          elR.textContent = fmtR(mn) + ' — ' + fmtR(mx);
        }
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={s.statsBar}>
      {STAT_DEFS.map(d => (
        <div
          key={d.key}
          className={s.stat}
          style={{ ['--accent' as any]: d.color, ['--accent-glow' as any]: d.color + '40' }}
        >
          <div className={s.head}>
            <span className={s.cn}>{d.cn}</span>
            <span className={s.en}>{d.en}</span>
          </div>
          <div ref={el => { valueRefs.current[d.key] = el; }} className={s.value}>—</div>
          <div ref={el => { rangeRefs.current[d.key] = el; }} className={s.range}>—</div>
        </div>
      ))}
    </div>
  );
}
