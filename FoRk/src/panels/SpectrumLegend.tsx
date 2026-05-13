import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { engine, type CompareChannel } from '../audio/engine';
import s from '../tabs/Analyze/Analyze.module.css';

/**
 * 频响图例 + 「+ 加入对比」按钮
 * - 主轨蓝点（不可删）
 * - 每条对比通道：彩色点 + 名字 + 删除按钮
 * - 单击彩色点 → 切换 visible
 */
export default function SpectrumLegend() {
  const { t } = useTranslation();
  const [, force] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => engine.subscribe(() => force(v => v + 1)), []);

  function onFiles(fs: FileList | null) {
    if (!fs) return;
    Array.from(fs).forEach(f => engine.addCompareFromFile(f));
  }

  return (
    <div className={s.legendBar}>
      <div className={s.legendItem}>
        <span className={s.legendDot} style={{ background: '#3b6db5' }} />
        <span className={s.legendName}>{t('analyze.spectrum.mainTrack')}</span>
      </div>
      {engine.compareChannels.map((ch: CompareChannel) => (
        <div key={ch.id} className={s.legendItem}>
          <button
            className={s.legendDot}
            style={{ background: ch.visible ? ch.color : 'transparent', border: '2px solid ' + ch.color }}
            onClick={() => engine.toggleCompareVisible(ch.id)}
            title={ch.visible ? t('common.clickHide') : t('common.clickShow')}
          />
          <span className={s.legendName}>{ch.name}</span>
          <button className={s.legendClose} onClick={() => engine.removeCompareChannel(ch.id)} title={t('common.remove')}>✕</button>
        </div>
      ))}
      <button className={s.addCompareBtn} onClick={() => fileInputRef.current?.click()} title={t('analyze.spectrum.addCompareDesc')}>
        {t('analyze.spectrum.addCompare')}
      </button>
      <input
        type="file" accept="audio/*" multiple hidden ref={fileInputRef}
        onChange={e => { onFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}
