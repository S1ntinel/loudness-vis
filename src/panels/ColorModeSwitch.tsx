import { useEffect, useState } from 'react';
import { engine, type ColorMode } from '../audio/engine';
import s from '../tabs/Analyze/Analyze.module.css';

const MODES: { value: ColorMode; label: string; title: string }[] = [
  { value: 'mono',       label: '单色',  title: '所有波形蓝/灰双色' },
  { value: 'multiband',  label: '频段',  title: 'RGB 三频段叠加：低=蓝、中=绿、高=红' },
  { value: 'map',        label: '重心',  title: 'Centroid 单 hue 映射，从蓝到红的光谱' },
];

export default function ColorModeSwitch() {
  const [mode, setMode] = useState<ColorMode>(engine.colorMode);

  useEffect(() => {
    return engine.subscribe(() => setMode(engine.colorMode));
  }, []);

  return (
    <div className={s.modeSwitch}>
      {MODES.map(m => (
        <button
          key={m.value}
          title={m.title}
          className={`${s.modeBtn} ${mode === m.value ? s.modeBtnActive : ''}`}
          onClick={() => engine.setColorMode(m.value)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
