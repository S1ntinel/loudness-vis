import { useEffect, useRef, useState } from 'react';
import { engine, type CompareChannel } from '../audio/engine';
import s from '../tabs/Analyze/Analyze.module.css';

/**
 * 频响图例 + 「+ 加入对比」按钮
 * - 主轨蓝点（不可删）
 * - 每条对比通道：彩色点 + 名字 + 删除按钮
 * - 单击彩色点 → 切换 visible
 */
export default function SpectrumLegend() {
  const [, force] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => engine.subscribe(() => force(v => v + 1)), []);

  function onFiles(fs: FileList | null) {
    if (!fs) return;
    Array.from(fs).forEach(f => engine.addCompareFromFile(f));
  }

  return (
    <div className={s.legendBar}>
      <div className={s.legendItem} title="当前分析音频（实时频谱）">
        <span className={s.legendDot} style={{ background: '#3b6db5' }} />
        <span className={s.legendName}>主轨</span>
      </div>
      {engine.compareChannels.map((ch: CompareChannel) => (
        <div key={ch.id} className={s.legendItem}>
          <button
            className={s.legendDot}
            style={{ background: ch.visible ? ch.color : 'transparent', border: '2px solid ' + ch.color }}
            onClick={() => engine.toggleCompareVisible(ch.id)}
            title={ch.visible ? '点击隐藏' : '点击显示'}
          />
          <span className={s.legendName}>{ch.name}</span>
          <button className={s.legendClose} onClick={() => engine.removeCompareChannel(ch.id)} title="移除">✕</button>
        </div>
      ))}
      <button className={s.addCompareBtn} onClick={() => fileInputRef.current?.click()} title="加入对比通道（叠加显示对比频谱）">
        + 加入对比
      </button>
      <input
        type="file" accept="audio/*" multiple hidden ref={fileInputRef}
        onChange={e => { onFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}
