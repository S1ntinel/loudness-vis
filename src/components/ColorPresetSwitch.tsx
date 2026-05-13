import { useUIStore, type ColorPreset } from '../store';
import s from './ColorPresetSwitch.module.css';

const PRESETS: { value: ColorPreset; label: string; color: string }[] = [
  { value: 'default', label: '蓝',   color: '#3b6db5' },
  { value: 'cyan',    label: '青',   color: '#00d4aa' },
  { value: 'pink',    label: '粉',   color: '#e84a8d' },
];

export default function ColorPresetSwitch() {
  const colorPreset = useUIStore(st => st.colorPreset);
  const setColorPreset = useUIStore(st => st.setColorPreset);

  return (
    <div className={s.bar}>
      <span className={s.label}>主题</span>
      {PRESETS.map(p => (
        <button
          key={p.value}
          className={`${s.dot} ${p.value === colorPreset ? s.dotActive : ''}`}
          style={{ ['--dot-color' as any]: p.color }}
          onClick={() => setColorPreset(p.value)}
          title={`${p.label}（${p.value}）`}
        />
      ))}
    </div>
  );
}
