import { useUIStore, type ColorPreset } from '../store';
import s from './PresetBar.module.css';

const PRESETS: { value: ColorPreset; label: string; color: string }[] = [
  { value: 'default', label: 'Default', color: '#3b6db5' },
  { value: 'cyan',    label: 'Cyan',    color: '#00d4aa' },
  { value: 'pink',    label: 'Pink',    color: '#e84a8d' },
];

export default function PresetBar() {
  const colorPreset = useUIStore(st => st.colorPreset);
  const setColorPreset = useUIStore(st => st.setColorPreset);
  const idx = PRESETS.findIndex(p => p.value === colorPreset);
  const cur = PRESETS[idx >= 0 ? idx : 0];

  function prev() {
    const ni = idx <= 0 ? PRESETS.length - 1 : idx - 1;
    setColorPreset(PRESETS[ni].value);
  }
  function next() {
    const ni = idx >= PRESETS.length - 1 ? 0 : idx + 1;
    setColorPreset(PRESETS[ni].value);
  }

  return (
    <div className={s.bar}>
      <button className={s.navBtn} onClick={prev} title="上一个预设">◀</button>
      <span className={s.name}>{cur.label}</span>
      <button className={s.navBtn} onClick={next} title="下一个预设">▶</button>
      <div className={s.dots}>
        {PRESETS.map(p => (
          <button
            key={p.value}
            className={`${s.dot} ${p.value === colorPreset ? s.dotActive : ''}`}
            style={{ ['--dot-color' as any]: p.color }}
            onClick={() => setColorPreset(p.value)}
            title={p.label}
          />
        ))}
      </div>
    </div>
  );
}
