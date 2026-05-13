import { useState } from 'react';
import { useUIStore } from '../store';
import { engine } from '../audio/engine';
import s from './SettingsPanel.module.css';

interface SettingsPanelProps {
  onClose: () => void;
}

const PRESET_OPTIONS = [
  { value: 'default', label: '默认', color: '#3b6db5' },
  { value: 'cyan',    label: '青色', color: '#00c8a0' },
  { value: 'pink',    label: '粉色', color: '#e8559a' },
] as const;

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { theme, colorPreset, gain, sfMode, waveRatio, setTheme, setColorPreset, setGain, setSfMode, setWaveRatio } = useUIStore();
  const [activeTab, setActiveTab] = useState<'appearance' | 'audio' | 'layout'>('appearance');

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.header}>
          <h2 className={s.title}>设置</h2>
          <button className={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={s.tabs}>
          <button
            className={`${s.tab} ${activeTab === 'appearance' ? s.tabActive : ''}`}
            onClick={() => setActiveTab('appearance')}
          >外观</button>
          <button
            className={`${s.tab} ${activeTab === 'audio' ? s.tabActive : ''}`}
            onClick={() => setActiveTab('audio')}
          >音频</button>
          <button
            className={`${s.tab} ${activeTab === 'layout' ? s.tabActive : ''}`}
            onClick={() => setActiveTab('layout')}
          >布局</button>
        </div>

        <div className={s.content}>
          {activeTab === 'appearance' && (
            <div className={s.section}>
              <h3 className={s.sectionTitle}>主题</h3>

              <div className={s.row}>
                <label className={s.label}>颜色模式</label>
                <div className={s.btnGroup}>
                  <button
                    className={`${s.btn} ${theme === 'light' ? s.btnActive : ''}`}
                    onClick={() => setTheme('light')}
                  >浅色</button>
                  <button
                    className={`${s.btn} ${theme === 'dark' ? s.btnActive : ''}`}
                    onClick={() => setTheme('dark')}
                  >深色</button>
                </div>
              </div>

              <div className={s.row}>
                <label className={s.label}>预设配色</label>
                <div className={s.btnGroup}>
                  {PRESET_OPTIONS.map(p => (
                    <button
                      key={p.value}
                      className={`${s.btn} ${colorPreset === p.value ? s.btnActive : ''}`}
                      onClick={() => setColorPreset(p.value)}
                    >
                      <span className={s.colorDot} style={{ background: p.color }} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
            <div className={s.section}>
              <h3 className={s.sectionTitle}>音频设置</h3>

              <div className={s.row}>
                <label className={s.label}>增益</label>
                <div className={s.sliderRow}>
                  <input
                    type="range" min={-12} max={12} step={0.1}
                    value={gain}
                    onChange={e => setGain(parseFloat(e.target.value))}
                    className={s.slider}
                  />
                  <span className={s.value}>{gain > 0 ? '+' : ''}{gain.toFixed(1)} dB</span>
                </div>
              </div>

              <div className={s.row}>
                <label className={s.label}>波形染色模式</label>
                <div className={s.btnGroup}>
                  <button
                    className={`${s.btn} ${engine.colorMode === 'mono' ? s.btnActive : ''}`}
                    onClick={() => engine.setColorMode('mono')}
                  >单色</button>
                  <button
                    className={`${s.btn} ${engine.colorMode === 'multiband' ? s.btnActive : ''}`}
                    onClick={() => engine.setColorMode('multiband')}
                  >频段</button>
                  <button
                    className={`${s.btn} ${engine.colorMode === 'map' ? s.btnActive : ''}`}
                    onClick={() => engine.setColorMode('map')}
                  >重心</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className={s.section}>
              <h3 className={s.sectionTitle}>布局设置</h3>

              <div className={s.row}>
                <label className={s.label}>声场指示器</label>
                <div className={s.btnGroup}>
                  <button
                    className={`${s.btn} ${sfMode === 'goniometer' ? s.btnActive : ''}`}
                    onClick={() => setSfMode('goniometer')}
                  >散点</button>
                  <button
                    className={`${s.btn} ${sfMode === 'sphere' ? s.btnActive : ''}`}
                    onClick={() => setSfMode('sphere')}
                  >球面</button>
                </div>
              </div>

              <div className={s.row}>
                <label className={s.label}>波形面板比例</label>
                <div className={s.sliderRow}>
                  <input
                    type="range" min={0.15} max={0.85} step={0.01}
                    value={waveRatio}
                    onChange={e => setWaveRatio(parseFloat(e.target.value))}
                    className={s.slider}
                  />
                  <span className={s.value}>{Math.round(waveRatio * 100)}%</span>
                </div>
              </div>

              <div className={s.info}>
                <p>更多布局选项：直接在分析 Tab 拖动面板间分隔条调整高度，Shift + 滚轮缩放时间轴。</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
