import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { engine } from '../audio/engine';
import { computeStats, percentile, median, STAT_DEFS, type StatKey } from '../audio/stats';
import s from '../tabs/Analyze/Analyze.module.css';

type StatElementRefs = Record<StatKey, HTMLDivElement | null>;
type StatHistory = Record<StatKey, number[]>;

// StatBar 中 d.key → i18n 翻译键
const STAT_LABEL_KEY: Record<StatKey, { cn: string; en: string }> = {
  peakDb:  { cn: 'analyze.metrics.peak',         en: 'analyze.metrics.peakUnit' },
  rmsDb:   { cn: 'analyze.metrics.rms',          en: 'analyze.metrics.rmsUnit' },
  crest:   { cn: 'analyze.metrics.crest',        en: 'analyze.metrics.crestUnit' },
  dr90:    { cn: 'analyze.metrics.dr',           en: 'analyze.metrics.drUnit' },
  clip95:  { cn: 'analyze.metrics.clip',         en: 'analyze.metrics.clipUnit' },
  corr:    { cn: 'analyze.metrics.correlation', en: 'analyze.metrics.correlationUnit' },
  width:   { cn: 'analyze.metrics.stereoWidth', en: 'analyze.metrics.stereoWidthUnit' },
  kurtL:   { cn: 'analyze.metrics.kurtosis',    en: 'analyze.metrics.kurtosisUnit' },
};

function createStatElementRefs(): StatElementRefs {
  return Object.fromEntries(STAT_DEFS.map(d => [d.key, null])) as unknown as StatElementRefs;
}

function createStatHistory(): StatHistory {
  return Object.fromEntries(STAT_DEFS.map(d => [d.key, []])) as unknown as StatHistory;
}

const STAT_WINDOW = 30;       // ~0.5s @ 60fps
const RMS_HIST_MAX = 1800;    // ~30s @ 60fps for DR90

export default function StatBar() {
  const { t } = useTranslation();
  // 每个指标对应两个 ref：值/区间
  const valueRefs = useRef<StatElementRefs>(createStatElementRefs());
  const rangeRefs = useRef<StatElementRefs>(createStatElementRefs());
  const historyRef = useRef<StatHistory>(createStatHistory());
  const rmsHistoryRef = useRef<number[]>([]);

  useEffect(() => {
    let raf = 0;
    let isVisible = document.visibilityState === 'visible';
    let frameCount = 0;
    let lastDr90 = NaN;
    const onVisibilityChange = () => {
      isVisible = document.visibilityState === 'visible';
    };

    function loop() {
      if (!isVisible) { raf = requestAnimationFrame(loop); return; }
      if (engine.isPlaying) {
        engine.lAna.getFloatTimeDomainData(engine.lBuf);
        engine.rAna.getFloatTimeDomainData(engine.rBuf);
        const base = computeStats(engine.lBuf, engine.rBuf);

        // RMS 历史用于 DR90：每 6 帧（约 100ms@60fps）计算一次，避免每帧排序 1800 元素
        rmsHistoryRef.current.push(base.rmsDb);
        if (rmsHistoryRef.current.length > RMS_HIST_MAX) rmsHistoryRef.current.shift();
        frameCount++;
        if (frameCount % 6 === 0 && rmsHistoryRef.current.length >= 60) {
          lastDr90 = percentile(rmsHistoryRef.current, 0.9) - percentile(rmsHistoryRef.current, 0.1);
        }
        const dr90 = lastDr90;

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

    document.addEventListener('visibilitychange', onVisibilityChange);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <div className={s.statsBar}>
      {STAT_DEFS.map(d => (
        <div
          key={d.key}
          className={s.stat}
          style={{ '--accent': d.color, '--accent-glow': d.color + '40' } as React.CSSProperties}
        >
          <div className={s.head}>
            <span className={s.cn}>{t(STAT_LABEL_KEY[d.key].cn, d.cn)}</span>
            <span className={s.en}>{t(STAT_LABEL_KEY[d.key].en, d.en)}</span>
          </div>
          <div ref={el => { valueRefs.current[d.key] = el; }} className={s.value}>—</div>
          <div ref={el => { rangeRefs.current[d.key] = el; }} className={s.range}>—</div>
        </div>
      ))}
    </div>
  );
}
