import { useEffect, useRef, useState } from 'react';
import s from './App.module.css';
import { engine } from './audio/engine';
import { useEngineState } from './audio/useEngineState';
import { useUIStore } from './store';
import Analyze from './tabs/Analyze';
import Record from './tabs/Record';

export default function App() {
  const { tab, setTab, theme, toggleTheme, fileName, setFileName, volume, setVolume } = useUIStore();
  const { audioBuffer, isPlaying, pauseOffset } = useEngineState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const dragDepthRef = useRef(0);

  // 加载文件
  async function loadFile(file: File) {
    setFileName(file.name);
    const r = await engine.loadFile(file);
    if (!r.ok) setFileName('解码失败：' + (r.error || ''));
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
      if (f) loadFile(f);
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
  }, []);

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

  // 播放按钮文字
  const playBtnText = !audioBuffer ? '▶ 播放'
    : isPlaying ? '⏸ 暂停'
    : pauseOffset > 0 ? '▶ 继续' : '▶ 播放';

  return (
    <div className={s.app}>
      <header className={s.topbar}>
        <input
          type="file" accept="audio/*" ref={fileInputRef} hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); }}
        />
        <button className={s.btn} onClick={() => fileInputRef.current?.click()}>选择文件</button>
        <button className={s.btn} onClick={() => engine.toggle()} disabled={!audioBuffer}>
          {playBtnText}
        </button>
        <span className={s.fileName}>{fileName}</span>

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
        <button className={s.btn} onClick={toggleTheme}>{theme === 'dark' ? '深色' : '浅色'}</button>
        <span className={s.labelText}>音量</span>
        <input
          type="range" min={0} max={1} step={0.01}
          value={volume}
          onChange={e => setVolume(parseFloat(e.target.value))}
        />
      </header>

      {tab === 'analyze' && <Analyze />}
      {tab === 'record' && <Record />}
      {tab === 'devices' && <div className={s.placeholder}>阶段 5 · 系统设备控制（开发中）</div>}
      {tab === 'mv' && <div className={s.placeholder}>阶段 7 · MV 编辑器（开发中）</div>}

      <div className={`${s.dropzone} ${dragActive ? s.show : ''}`}>
        ↓ 松开以加载音频文件
      </div>
    </div>
  );
}
