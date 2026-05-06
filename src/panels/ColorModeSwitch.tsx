import { useEffect, useState } from 'react';
import { engine, type ColorMode } from '../audio/engine';
import s from '../tabs/Analyze/Analyze.module.css';

const MODES: { value: ColorMode; label: string }[] = [
  { value: 'mono',       label: '单色'   },
  { value: 'multiband',  label: '频段'   },
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
          className={`${s.modeBtn} ${mode === m.value ? s.modeBtnActive : ''}`}
          onClick={() => engine.setColorMode(m.value)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
