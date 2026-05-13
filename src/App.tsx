import { useEffect, useRef, useState } from 'react';
import s from './App.module.css';
import { engine } from './audio/engine';
import { useEngineState } from './audio/useEngineState';
import { useUIStore } from './store';
import Analyze from './tabs/Analyze';
import Record from './tabs/Record';
import Devices from './tabs/Devices';
import UploadTargetModal from './components/UploadTargetModal';
import PresetBar from './components/PresetBar';
import ColorPresetSwitch from './components/ColorPresetSwitch';
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  const { tab, setTab, theme, toggleTheme, fileName, gain, setGain, setPendingUpload } = useUIStore();
  const { audioBuffer, isPlaying, pauseOffset } = useEngineState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const dragDepthRef = useRef(0);
  const [pinned, setPinned] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

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

  // 同步增益到引擎（音量条已经移除，volume 固定 1.0 的话直接用 gain 控制）
  useEffect(() => { engine.setVolume(1); engine.setGain(gain); }, [gain]);

  // 播放按钮文字
  const playBtnText = !audioBuffer ? '▶ 播放'
    : isPlaying ? '⏸ 暂停'
    : pauseOffset > 0 ? '▶ 继续' : '▶ 播放';

  return (
    <div className={s.app}>
      <header className={s.topbar}>
        <input
          type="file" accept="audio/*" ref={fileInputRef} hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) setPendingUpload(f); }}
        />
        <ColorPresetSwitch />
        <button className={s.btn} onClick={() => fileInputRef.current?.click()}>选择文件</button>
        <button className={s.btn} onClick={() => engine.toggle()} disabled={!audioBuffer}>
          {playBtnText}
        </button>
        <span className={s.fileName}>{fileName}</span>

        <PresetBar />

        {/* Tab 切换 */}
        <button className={`${s.tabBtn} ${tab === 'analyze' ? s.active : ''}`} onClick={() => setTab('analyze')}>
          分析
        </button>
        <button className={`${s.tabBtn} ${tab === 'record' ? s.active : ''}`} onClick={() => setTab('record')}>
          录音
        </button>
        <button className={`${s.tabBtn} ${tab === 'devices' ? s.active : ''}`} onClick={() => setTab('devices')}>
          设备
        </button>
        <button className={`${s.tabBtn} ${tab === 'mv' ? s.active : ''}`} onClick={() => setTab('mv')}>
          MV
        </button>

        <span className={s.divider} />
        {isElectron && (
          <button
            className={`${s.btn} ${pinned ? s.btnPinned : ''}`}
            onClick={togglePin}
            title={pinned ? '取消置顶' : '窗口置顶'}
          >
            {pinned ? '📌 已置顶' : '📌 置顶'}
          </button>
        )}
        <button className={s.btn} onClick={toggleTheme}>{theme === 'dark' ? '深色' : '浅色'}</button>
        <button className={s.btn} onClick={() => setShowSettings(true)} title="设置">⚙ 设置</button>
        <span className={s.labelText}>增益</span>
        <input
          type="range" min={-12} max={12} step={0.1}
          value={gain}
          onChange={e => setGain(parseFloat(e.target.value))}
          title={`增益 ${gain > 0 ? '+' : ''}${gain.toFixed(1)} dB（双击重置）`}
          onDoubleClick={() => setGain(0)}
        />
        <span className={s.gainValue}>{gain > 0 ? '+' : ''}{gain.toFixed(1)}dB</span>
      </header>

      {tab === 'analyze' && <Analyze />}
      {tab === 'record' && <Record />}
      {tab === 'devices' && <Devices />}
      {tab === 'mv' && <div className={s.placeholder}>阶段 7 · MV 编辑器（开发中）</div>}

      <div className={`${s.dropzone} ${dragActive ? s.show : ''}`}>
        ↓ 松开以加载音频文件
      </div>

      <UploadTargetModal />
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
