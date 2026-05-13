import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import s from './App.module.css';
import { engine } from './audio/engine';
import { useEngineState } from './audio/useEngineState';
import { useUIStore } from './store';
import { usePresetStore } from './store/usePresetStore';
import Analyze from './tabs/Analyze';
import Record from './tabs/Record';
import Devices from './tabs/Devices';
import MV from './tabs/MV';
import UploadTargetModal from './components/UploadTargetModal';
import PresetBar from './components/PresetBar';
import SettingsPanel from './components/SettingsPanel';
import LanguageSwitch from './components/LanguageSwitch';

export default function App() {
  const { t } = useTranslation();
  const { tab, setTab, theme, toggleTheme, fileName, volume, setVolume, gain, setGain, setPendingUpload } = useUIStore();
  const { audioBuffer, isPlaying, pauseOffset } = useEngineState();
  const loadPresets = usePresetStore(s => s.load);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const dragDepthRef = useRef(0);
  const [pinned, setPinned] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // 启动时加载预设列表
  useEffect(() => { loadPresets(); }, [loadPresets]);

  // 启动时同步 Electron 当前 alwaysOnTop 状态
  useEffect(() => {
    if (window.electronAPI?.getAlwaysOnTop) {
      window.electronAPI.getAlwaysOnTop().then(v => setPinned(Boolean(v)));
    }
  }, []);

  // 加载新音频时重置时间轴视图
  useEffect(() => {
    if (audioBuffer) useUIStore.getState().resetView();
  }, [audioBuffer]);

  function togglePin() {
    if (!window.electronAPI) return;
    const next = !pinned;
    window.electronAPI.setAlwaysOnTop(next);
    setPinned(next);
  }

  // 拖放
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
      if (f) setPendingUpload(f);    // 弹 Modal 让用户选目标
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

  // 空格快捷键
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

  // 同步音量到引擎
  useEffect(() => { engine.setVolume(volume); }, [volume]);

  // 同步增益到引擎
  useEffect(() => { engine.setGain(gain); }, [gain]);

  // 播放按钮文字
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
        <button className={s.btn} onClick={() => fileInputRef.current?.click()}>{t('toolbar.selectFile')}</button>
        <button className={s.btn} onClick={() => engine.toggle()} disabled={!audioBuffer}>
          {playBtnText}
        </button>
        <span className={s.fileName}>{fileName || t('toolbar.noFile')}</span>

        {/* 预设切换 - 中间位置 */}
        <div className={s.presetWrapper}>
          <PresetBar />
        </div>

        {/* Tab 切换 */}
        <button className={`${s.tabBtn} ${tab === 'analyze' ? s.active : ''}`} onClick={() => setTab('analyze')}>
          {t('tabs.analyze')}
        </button>
        <button className={`${s.tabBtn} ${tab === 'record' ? s.active : ''}`} onClick={() => setTab('record')}>
          {t('tabs.record')}
        </button>
        <button className={`${s.tabBtn} ${tab === 'devices' ? s.active : ''}`} onClick={() => setTab('devices')}>
          {t('tabs.devices')}
        </button>
        <button className={`${s.tabBtn} ${tab === 'mv' ? s.active : ''}`} onClick={() => setTab('mv')}>
          {t('tabs.mv')}
        </button>

        <span className={s.divider} />
        {isElectron && (
          <button
            className={`${s.btn} ${pinned ? s.btnPinned : ''}`}
            onClick={togglePin}
            title={pinned ? t('toolbar.pinOnTitle') : t('toolbar.pinOffTitle')}
          >
            {pinned ? t('toolbar.pinOn') : t('toolbar.pinOff')}
          </button>
        )}
        <button className={s.btn} onClick={toggleTheme}>{theme === 'dark' ? t('toolbar.themeLight') : t('toolbar.themeDark')}</button>
        <button className={s.btn} onClick={() => setShowSettings(true)} title={t('toolbar.settings')}>
          ⚙️ {t('toolbar.settings')}
        </button>
        <LanguageSwitch />
        <span className={s.labelText}>{t('toolbar.gain')}</span>
        <input
          type="range" min={-12} max={12} step={0.1}
          value={gain}
          onChange={e => setGain(parseFloat(e.target.value))}
          title={`${t('toolbar.gain')}: ${gain > 0 ? '+' : ''}${gain} dB`}
          className={s.gainSlider}
        />
        <span className={s.gainValue}>{gain > 0 ? '+' : ''}{gain}dB</span>
      </header>

      {tab === 'analyze' && <Analyze />}
      {tab === 'record' && <Record />}
      {tab === 'devices' && <Devices />}
      {tab === 'mv' && <MV />}

      <div className={`${s.dropzone} ${dragActive ? s.show : ''}`}>
        {t('toolbar.dropHint')}
      </div>

      <UploadTargetModal />
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
