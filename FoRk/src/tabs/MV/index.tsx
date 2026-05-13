import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMVStore } from '../../store/useMVStore';
import { engine } from '../../audio/engine';
import { useEngineState } from '../../audio/useEngineState';
import Stage from './components/Stage';
import EffectRack from './components/EffectRack';
import PresetPanel from './components/PresetPanel';
import ProjectPanel from './components/ProjectPanel';
import RecordPanel from './components/RecordPanel';
import AssetPanel from './components/AssetPanel';
import s from './MV.module.css';

function mvThemeStyle(theme: ReturnType<typeof useMVStore.getState>['currentTheme']): React.CSSProperties {
  return {
    '--accent': theme.primaryColor,
    '--accent-glow': theme.glowColor,
    '--btn-border': theme.panelBorder,
    '--tab-active': theme.buttonHover,
  } as React.CSSProperties;
}

export default function MV() {
  const { t } = useTranslation();
  const { isPlaying, setPlaying, currentTheme } = useMVStore();
  const { audioBuffer, isPlaying: enginePlaying } = useEngineState();
  
  // 同步播放状态
  useEffect(() => {
    setPlaying(enginePlaying);
  }, [enginePlaying, setPlaying]);
  
  return (
    <div className={s.container}>
      <header className={s.header}>
        <h2 className={s.title}>{t('mv.title')}</h2>
        <div className={s.controls}>
          <button
            className={s.playBtn}
            onClick={() => engine.toggle()}
            disabled={!audioBuffer}
          >
            {isPlaying ? t('toolbar.pause') : t('toolbar.play')}
          </button>
        </div>
      </header>
      
      <div className={s.layout}>
        <div className={s.stageArea}>
          <Stage />
        </div>
        
        <div className={s.sidebar}>
          <div style={{ ...mvThemeStyle(currentTheme), display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AssetPanel />
            <PresetPanel />
            <ProjectPanel />
            <EffectRack />
          </div>
          <RecordPanel />
        </div>
      </div>
    </div>
  );
}
