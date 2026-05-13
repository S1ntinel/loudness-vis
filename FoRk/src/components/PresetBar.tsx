import { useTranslation } from 'react-i18next';
import { useUIStore, type PresetTheme } from '../store';
import s from './PresetBar.module.css';

const BUILT_IN_PRESETS: { value: PresetTheme; labelKey: string; color: string }[] = [
  { value: 'default', labelKey: 'settings.default', color: '#3b6db5' },
  { value: 'green',   labelKey: 'settings.green',   color: '#00c8a0' },
  { value: 'pink',    labelKey: 'settings.pink',    color: '#e84a8d' },
];

export default function PresetBar() {
  const { t } = useTranslation();
  const preset = useUIStore(s => s.preset);
  const setPreset = useUIStore(s => s.setPreset);

  const currentIdx = BUILT_IN_PRESETS.findIndex(p => p.value === preset);
  const current = BUILT_IN_PRESETS[currentIdx >= 0 ? currentIdx : 0];

  function prev() {
    const next = currentIdx <= 0 ? BUILT_IN_PRESETS.length - 1 : currentIdx - 1;
    setPreset(BUILT_IN_PRESETS[next].value);
  }

  function next() {
    const nx = currentIdx >= BUILT_IN_PRESETS.length - 1 ? 0 : currentIdx + 1;
    setPreset(BUILT_IN_PRESETS[nx].value);
  }

  return (
    <div className={s.bar}>
      <button className={s.navBtn} onClick={prev} title={t('presets.prev')}>◀</button>
      <span className={s.name}>{t(current.labelKey)}</span>
      <button className={s.navBtn} onClick={next} title={t('presets.next')}>▶</button>
      <div className={s.dots}>
        {BUILT_IN_PRESETS.map(p => (
          <button
            key={p.value}
            className={`${s.dot} ${p.value === preset ? s.dotActive : ''}`}
            style={{ '--dot-color': p.color } as React.CSSProperties}
            onClick={() => setPreset(p.value)}
            title={t(p.labelKey)}
          />
        ))}
      </div>
    </div>
  );
}
