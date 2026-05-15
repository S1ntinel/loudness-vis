import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import s from './App.module.css';
import { engine } from './audio/engine';
import { useEngineState } from './audio/useEngineState';
import { useUIStore } from './store';
import { usePresetStore } from './store/usePresetStore';
import Analyze from './tabs/Analyze';
import PresetBar from './components/PresetBar';
import LanguageSwitch from './components/LanguageSwitch';

const Record = lazy(() => import('./tabs/Record'));
const Devices = lazy(() => import('./tabs/Devices'));
const MV = lazy(() => import('./tabs/MV'));
const UploadTargetModal = lazy(() => import('./components/UploadTargetModal'));
const SettingsPanel = lazy(() => import('./components/SettingsPanel'));

const isElectron = !!window.electronAPI;

export default function App() {
  const { t } = useTranslation();
  const { tab, setTab, theme, toggleTheme, fileName, volume, setVolume, gain, setGain, pendingUpload, setPendingUpload } = useUIStore();
  const { audioBuffer, isPlaying, pauseOffset } = useEngineState();
  const loadPresets = usePresetStore(s => s.load);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const dragDepthRef = useRef(0);
  const [pinned, setPinned] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const handleGesture = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    document.addEventListener('wheel', handleGesture, { passive: false });
    return () => document.removeEventListener('wheel', handleGesture);
  }, []);

  useEffect(() => { loadPresets(); }, [loadPresets]);

  useEffect(() => {        
    if (window.electronAPI?.getAlwaysOnTop) {
      window.electronAPI.getAlwaysOnTop().then(v => setPinned(Boolean(v)));     
    }
  }, []);

  useEffect(() => {
    if (audioBuffer) useUIStore.getState().resetView();
  }, [audioBuffer]);

  function togglePin() {
    if (!window.electronAPI) return;
    const next = !pinned;
    window.electronAPI.setAlwaysOnTop(next);
    setPinned(next);
  }

  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragDepthRef.current++;
      setDragActive(true);
    };
    const onDragLeave = () => {
      dragDepthRef.current--;
      if (dragDepthRef.current <= 0) {
        dragDepthRef.current = 0;
        setDragActive(false);
      }
    };
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragDepthRef.current = 0;
      setDragActive(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) setPendingUpload(f);
    };        
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [setPendingUpload]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        engine.toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { engine.setVolume(volume); }, [volume]);
  useEffect(() => { engine.setGain(gain); }, [gain]);  

  const playBtnText = !audioBuffer ? t('toolbar.play')
    : isPlaying ? t('toolbar.pause')
    : pauseOffset > 0 ? t('toolbar.resume') : t('toolbar.play');

  return (
    <div className={s.app}>
      <header className={s.topbar}>
        <input
          type="file" accept="audio/*" ref={fileInputRef} hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) setPendingUpload(f); }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '9px', fontWeight: 800, opacity: 0.6 }}>LOAD / EJECT</span>
          <button className={s.btn} onClick={() => fileInputRef.current?.click()}>
            {t('toolbar.selectFile')}
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '9px', fontWeight: 800, opacity: 0.6 }}>TRANSPORT</span>
          <button className={s.btn} onClick={() => engine.toggle()} disabled={!audioBuffer}>
            {playBtnText}
          </button>
        </div>

        <span className={s.fileName}>
          <span style={{ fontSize: '9px', color: 'var(--hw-metal)', marginRight: '8px' }}>SOURCE:</span>
          {fileName || t('toolbar.noFile')}
        </span>   

        <div className={s.presetWrapper}>
          <PresetBar />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', gap: '4px' }}>
          <button className={`${s.tabBtn} ${tab === 'analyze' ? s.active : ''}`} onClick={() => setTab('analyze')}>
            {t('tabs.analyze')}
            <div style={{ fontSize: '8px', opacity: 0.5 }}>ANALYZE</div>
          </button>
          <button className={`${s.tabBtn} ${tab === 'record' ? s.active : ''}`} onClick={() => setTab('record')}>
            {t('tabs.record')}
            <div style={{ fontSize: '8px', opacity: 0.5 }}>REC</div>
          </button>
          <button className={`${s.tabBtn} ${tab === 'devices' ? s.active : ''}`} onClick={() => setTab('devices')}>
            {t('tabs.devices')}
            <div style={{ fontSize: '8px', opacity: 0.5 }}>I/O</div>
          </button>
          <button className={`${s.tabBtn} ${tab === 'mv' ? s.active : ''}`} onClick={() => setTab('mv')}>
            {t('tabs.mv')}
            <div style={{ fontSize: '8px', opacity: 0.5 }}>WORKSTATION</div>
          </button>
        </div>

        <span className={s.divider} />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
           <div style={{ display: 'flex', gap: '8px' }}>
            {isElectron && (
              <button
                className={`${s.btn} ${pinned ? s.btnPinned : ''}`}
                onClick={togglePin}
                style={{ padding: '4px 8px', height: 'auto', fontSize: '10px' }}
              >
                {pinned ? 'UNPIN' : 'PIN'}
              </button>
            )}
            <button 
              className={s.btn} 
              onClick={() => setShowSettings(true)}
              style={{ padding: '4px 8px', height: 'auto', fontSize: '10px' }}
            >
              SET
            </button>
          </div>
          <LanguageSwitch />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className={s.labelText}>GAIN / {t('toolbar.gain')}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="range" min={-12} max={12} step={0.1}
              value={gain}
              onChange={e => setGain(parseFloat(e.target.value))}
              className={s.gainSlider}
            />
            <span className={s.gainValue}>{gain > 0 ? '+' : ''}{gain}dB</span>
          </div>
        </div>
      </header>

      {tab === 'analyze' && <Analyze />}
      <Suspense fallback={null}>
        {tab === 'record' && <Record />}
        {tab === 'devices' && <Devices />}
        {tab === 'mv' && <MV />}
      </Suspense>

      <div className={`${s.dropzone} ${dragActive ? s.show : ''}`}>
        {t('toolbar.dropHint')}
      </div>

      <Suspense fallback={null}>
        {pendingUpload && <UploadTargetModal />}
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      </Suspense>
    </div>
  );
}
