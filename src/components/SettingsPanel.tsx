import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store';
import { engine } from '../audio/engine';
import s from './SettingsPanel.module.css';

interface SettingsPanelProps {
  onClose: () => void;
}

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  url: string;
  checkedAt: number;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { t } = useTranslation();
  const { theme, preset, volume, gain, setTheme, setPreset, setVolume, setGain } = useUIStore();
  const [activeTab, setActiveTab] = useState<'appearance' | 'audio' | 'layout'>('appearance');
  const [currentVersion, setCurrentVersion] = useState('0.0.0');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    let disposed = false;
    if (!window.electronAPI) return;
    window.electronAPI.getAppVersion().then(version => {
      if (!disposed) setCurrentVersion(version);
    }).catch(() => {});
    setCheckingUpdate(true);
    window.electronAPI.checkForUpdates(false).then(info => {
      if (!disposed) setUpdateInfo(info);
    }).catch(() => {}).finally(() => {
      if (!disposed) setCheckingUpdate(false);
    });
    return () => { disposed = true; };
  }, []);

  async function checkUpdatesManually() {
    if (!window.electronAPI?.checkForUpdates) return;
    setCheckingUpdate(true);
    try {
      const info = await window.electronAPI.checkForUpdates(true);
      setUpdateInfo(info);
    } finally {
      setCheckingUpdate(false);
    }
  }

  async function openReleasePage() {
    if (!updateInfo?.url || !window.electronAPI?.openExternal) return;
    await window.electronAPI.openExternal(updateInfo.url);
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.header}>
          <h2 className={s.title}>{t('settings.title')}</h2>
          <button className={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={s.tabs}>
          <button className={`${s.tab} ${activeTab === 'appearance' ? s.tabActive : ''}`} onClick={() => setActiveTab('appearance')}>
            {t('settings.appearance')}
          </button>
          <button className={`${s.tab} ${activeTab === 'audio' ? s.tabActive : ''}`} onClick={() => setActiveTab('audio')}>
            {t('settings.audio')}
          </button>
          <button className={`${s.tab} ${activeTab === 'layout' ? s.tabActive : ''}`} onClick={() => setActiveTab('layout')}>
            {t('settings.layout')}
          </button>
        </div>

        <div className={s.content}>
          {activeTab === 'appearance' && (
            <div className={s.section}>
              <h3 className={s.sectionTitle}>{t('settings.theme')}</h3>

              <div className={s.row}>
                <label className={s.label}>{t('settings.colorMode')}</label>
                <div className={s.btnGroup}>
                  <button className={`${s.btn} ${theme === 'light' ? s.btnActive : ''}`} onClick={() => setTheme('light')}>
                    {t('settings.light')}
                  </button>
                  <button className={`${s.btn} ${theme === 'dark' ? s.btnActive : ''}`} onClick={() => setTheme('dark')}>
                    {t('settings.dark')}
                  </button>
                </div>
              </div>

              <div className={s.row}>
                <label className={s.label}>{t('settings.presetColor')}</label>
                <div className={s.btnGroup}>
                  <button className={`${s.btn} ${preset === 'default' ? s.btnActive : ''}`} onClick={() => setPreset('default')} style={{ '--preset-color': '#3b6db5' } as React.CSSProperties}>
                    <span className={s.colorDot} style={{ background: '#3b6db5' }} />
                    {t('settings.default')}
                  </button>
                  <button className={`${s.btn} ${preset === 'green' ? s.btnActive : ''}`} onClick={() => setPreset('green')} style={{ '--preset-color': '#00c8a0' } as React.CSSProperties}>
                    <span className={s.colorDot} style={{ background: '#00c8a0' }} />
                    {t('settings.green')}
                  </button>
                  <button className={`${s.btn} ${preset === 'pink' ? s.btnActive : ''}`} onClick={() => setPreset('pink')} style={{ '--preset-color': '#e8559a' } as React.CSSProperties}>
                    <span className={s.colorDot} style={{ background: '#e8559a' }} />
                    {t('settings.pink')}
                  </button>
                </div>
              </div>

              <div className={s.versionCard}>
                <div>
                  <div className={s.versionLabel}>{t('settings.version', 'Version')}</div>
                  <div className={s.versionValue}>v{currentVersion}</div>
                </div>
                <button className={s.btn} onClick={checkUpdatesManually} disabled={checkingUpdate}>
                  {checkingUpdate ? t('settings.checkingUpdate', 'Checking…') : t('settings.checkUpdate', 'Check updates')}
                </button>
              </div>

              {updateInfo && (
                <div className={`${s.updateCard} ${updateInfo.updateAvailable ? s.updateCardHot : ''}`}>
                  <div className={s.updateTitle}>
                    {updateInfo.updateAvailable
                      ? t('settings.updateAvailable', 'New version available')
                      : t('settings.upToDate', 'You are using the latest version')}
                  </div>
                  <div className={s.updateMeta}>
                    v{updateInfo.currentVersion} → v{updateInfo.latestVersion}
                  </div>
                  <button className={s.updateLink} onClick={openReleasePage}>
                    {t('settings.openReleasePage', 'Open release page')}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'audio' && (
            <div className={s.section}>
              <h3 className={s.sectionTitle}>{t('settings.audioSettings')}</h3>

              <div className={s.row}>
                <label className={s.label}>{t('settings.volume')}</label>
                <div className={s.sliderRow}>
                  <input type="range" min={0} max={1} step={0.01} value={volume} onChange={e => setVolume(parseFloat(e.target.value))} className={s.slider} />
                  <span className={s.value}>{Math.round(volume * 100)}%</span>
                </div>
              </div>

              <div className={s.row}>
                <label className={s.label}>{t('settings.gain')}</label>
                <div className={s.sliderRow}>
                  <input type="range" min={-12} max={12} step={0.1} value={gain} onChange={e => setGain(parseFloat(e.target.value))} className={s.slider} />
                  <span className={s.value}>{gain > 0 ? '+' : ''}{gain}dB</span>
                </div>
              </div>

              <div className={s.row}>
                <label className={s.label}>{t('settings.waveColorMode')}</label>
                <div className={s.btnGroup}>
                  <button className={`${s.btn} ${engine.colorMode === 'mono' ? s.btnActive : ''}`} onClick={() => engine.setColorMode('mono')}>
                    {t('settings.mono')}
                  </button>
                  <button className={`${s.btn} ${engine.colorMode === 'multiband' ? s.btnActive : ''}`} onClick={() => engine.setColorMode('multiband')}>
                    {t('settings.band')}
                  </button>
                  <button className={`${s.btn} ${engine.colorMode === 'map' ? s.btnActive : ''}`} onClick={() => engine.setColorMode('map')}>
                    {t('settings.centroid')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className={s.section}>
              <h3 className={s.sectionTitle}>{t('settings.layoutSettings')}</h3>

              <div className={s.row}>
                <label className={s.label}>{t('settings.statBarDisplay')}</label>
                <div className={s.btnGroup}>
                  <button className={`${s.btn} ${s.btnActive}`}>{t('settings.show')}</button>
                  <button className={s.btn}>{t('settings.hide')}</button>
                </div>
              </div>

              <div className={s.row}>
                <label className={s.label}>{t('settings.goniometerMode')}</label>
                <div className={s.btnGroup}>
                  <button className={`${s.btn} ${s.btnActive}`}>{t('settings.scatter')}</button>
                  <button className={s.btn}>{t('settings.sphere')}</button>
                </div>
              </div>

              <div className={s.info}>
                <p>{t('settings.moreLayoutComing')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
