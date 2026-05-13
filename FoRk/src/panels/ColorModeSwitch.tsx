import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { engine, type ColorMode } from '../audio/engine';
import s from '../tabs/Analyze/Analyze.module.css';

const MODE_KEYS: { value: ColorMode; labelKey: string; titleKey: string }[] = [
  { value: 'mono',       labelKey: 'analyze.waveform.mono',     titleKey: 'analyze.waveform.monoDesc' },
  { value: 'multiband',  labelKey: 'analyze.waveform.band',     titleKey: 'analyze.waveform.bandDesc' },
  { value: 'map',        labelKey: 'analyze.waveform.centroid', titleKey: 'analyze.waveform.centroidDesc' },
];

export default function ColorModeSwitch() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ColorMode>(engine.colorMode);

  useEffect(() => {
    window.__lvColorMode = engine.colorMode;
    return engine.subscribe(() => {
      setMode(engine.colorMode);
      window.__lvColorMode = engine.colorMode;
    });
  }, []);

  return (
    <div className={s.modeSwitch}>
      {MODE_KEYS.map(m => (
        <button
          key={m.value}
          title={t(m.titleKey)}
          className={`${s.modeBtn} ${mode === m.value ? s.modeBtnActive : ''}`}
          onClick={() => engine.setColorMode(m.value)}
        >
          {t(m.labelKey)}
        </button>
      ))}
    </div>
  );
}
