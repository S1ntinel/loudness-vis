import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMVStore } from '../../store/useMVStore';
import { useMVAssetsStore } from '../../store/useMVAssetsStore';
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
  const activeAudioId = useMVAssetsStore(s => s.activeAudioId);
  const assets = useMVAssetsStore(s => s.assets);
  
  // 同步播放状态
  useEffect(() => {
    setPlaying(enginePlaying);
  }, [enginePlaying, setPlaying]);

  function toggleMVPlay() {
    const hasMVAsset = !!activeAudioId;
    if (hasMVAsset) {
      // Play MV audio asset through engine so visualization works
      const audioAsset = assets.find(a => a.id === activeAudioId);
      if (audioAsset && audioAsset.type === 'audio') {
        if (engine.isPlaying) {
          engine.pause();
        } else {
          // Load the MV audio blob into engine for visualization
          const url = audioAsset.blobUrl;
          fetch(url).then(r => r.blob()).then(blob => {
            const file = new File([blob], audioAsset.name);
            engine.loadFile(file);
          });
        }
        return;
      }
    }
    // Fallback: toggle main engine
    engine.toggle();
  }
  
  return (
    <div className={s.container}>
      <header className={s.header}>
        <h2 className={s.title}>{t('mv.title')}</h2>
        <div className={s.controls}>
          <button
            className={s.playBtn}
            onClick={toggleMVPlay}
            disabled={!audioBuffer && !activeAudioId}
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
            <EffectRack />
            <AssetPanel />
            <PresetPanel />
            <ProjectPanel />
          </div>
          <RecordPanel />
        </div>
      </div>
    </div>
  );
}
