import { ChangeEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMVStore } from '../../../store/useMVStore';
import { MV_THEMES, MVAssetRefMode } from '../mvProject';
import { exportProjectFile, importProjectFile } from '../projectIO';
import s from './ProjectPanel.module.css';

export default function ProjectPanel() {
  const { t } = useTranslation();
  const {
    currentThemeId,
    currentSpectrumStyle,
    currentTheme,
    global,
    text,
    dynamicBackground,
    spectrumSettings,
    applyTheme,
    setSpectrumStyle,
    updateGlobal,
    updateText,
    updateDynamicBackground,
    updateSpectrumSettings,
    resetProject,
  } = useMVStore();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [exportMode, setExportMode] = useState<MVAssetRefMode>('zip');

  async function downloadConfig() {
    try {
      const { blob, suggestedName } = await exportProjectFile(exportMode);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      window.alert(t('mv.exportFailFmt', { msg: message }));
    }
  }

  async function onImportConfig(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importProjectFile(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(t('mv.importFailFmt', { msg: message }));
    }
    event.target.value = '';
  }

  return (
    <div className={s.panel}>
      <h3 className={s.title}>{t('mv.effectParams')}</h3>

      <div className={s.group}>
        <div className={s.groupTitle}>{t('mv.theme')}</div>
        <label className={s.field}>
          <span>{t('mv.theme')}</span>
          <select value={currentThemeId} onChange={event => applyTheme(event.target.value as keyof typeof MV_THEMES)} className={s.select}>
            {Object.values(MV_THEMES).map(theme => (
              <option key={theme.id} value={theme.id}>{t(`mv.themeNames.${theme.id}`, theme.label)}</option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          <span>{t('mv.spectrumStyle')}</span>
          <select value={currentSpectrumStyle} onChange={event => setSpectrumStyle(event.target.value as 'bar' | 'mirrorBar' | 'radial')} className={s.select}>
            <option value="bar">{t('mv.spectrumStyles.bar')}</option>
            <option value="mirrorBar">{t('mv.spectrumStyles.mirrorBar')}</option>
            <option value="radial">{t('mv.spectrumStyles.radial')}</option>
          </select>
        </label>
        <label className={s.sliderField}>
          <span>{t('mv.glow')}</span>
          <input type="range" min={0} max={100} value={Math.round(global.glow * 100)} onChange={event => updateGlobal({ glow: Number(event.target.value) / 100 })} />
          <strong>{Math.round(global.glow * 100)}</strong>
        </label>
        <label className={s.sliderField}>
          <span>{t('mv.sensitivity')}</span>
          <input type="range" min={20} max={300} value={Math.round(global.sensitivity * 100)} onChange={event => updateGlobal({ sensitivity: Number(event.target.value) / 100 })} />
          <strong>{global.sensitivity.toFixed(2)}</strong>
        </label>
        <label className={s.sliderField}>
          <span>{t('mv.smoothing')}</span>
          <input type="range" min={0} max={100} value={Math.round(global.smoothing * 100)} onChange={event => updateGlobal({ smoothing: Number(event.target.value) / 100 })} />
          <strong>{global.smoothing.toFixed(2)}</strong>
        </label>
        <label className={s.sliderField}>
          <span>{t('mv.barCount')}</span>
          <input type="range" min={24} max={160} value={spectrumSettings.barCount} onChange={event => updateSpectrumSettings({ barCount: Number(event.target.value) })} />
          <strong>{spectrumSettings.barCount}</strong>
        </label>
      </div>

      <div className={s.group}>
        <div className={s.groupTitle}>{t('mv.dynBg')}</div>
        <label className={s.toggleRow}>
          <input type="checkbox" checked={dynamicBackground.enabled} onChange={event => updateDynamicBackground({ enabled: event.target.checked })} />
          <span>{t('mv.enableDynBg')}</span>
        </label>
        <label className={s.toggleRow}>
          <input type="checkbox" checked={dynamicBackground.audioReactive} onChange={event => updateDynamicBackground({ audioReactive: event.target.checked })} />
          <span>{t('mv.lowFreqBright')}</span>
        </label>
        <label className={s.field}>
          <span>{t('mv.bgType')}</span>
          <select value={dynamicBackground.type} onChange={event => updateDynamicBackground({ type: event.target.value as typeof dynamicBackground.type })} className={s.select}>
            <option value="gradient">{t('mv.bgTypes.gradient')}</option>
            <option value="electro">{t('mv.bgTypes.electro')}</option>
            <option value="starlight">{t('mv.bgTypes.starlight')}</option>
            <option value="ember">{t('mv.bgTypes.ember')}</option>
            <option value="ocean">{t('mv.bgTypes.ocean')}</option>
          </select>
        </label>
        <label className={s.sliderField}>
          <span>{t('mv.speed')}</span>
          <input type="range" min={5} max={150} value={Math.round(dynamicBackground.speed * 100)} onChange={event => updateDynamicBackground({ speed: Number(event.target.value) / 100 })} />
          <strong>{dynamicBackground.speed.toFixed(2)}</strong>
        </label>
      </div>

      <div className={s.group}>
        <div className={s.groupTitle}>{t('mv.text')}</div>
        <label className={s.toggleRow}>
          <input type="checkbox" checked={text.showTitle} onChange={event => updateText({ showTitle: event.target.checked })} />
          <span>{t('mv.showTitle')}</span>
        </label>
        <label className={s.fieldVertical}>
          <span>{t('mv.songTitle')}</span>
          <input className={s.input} value={text.songTitle} onChange={event => updateText({ songTitle: event.target.value })} />
        </label>
        <label className={s.fieldVertical}>
          <span>{t('mv.artistName')}</span>
          <input className={s.input} value={text.artistName} onChange={event => updateText({ artistName: event.target.value })} />
        </label>
        <label className={s.field}>
          <span>{t('mv.position')}</span>
          <select value={text.position} onChange={event => updateText({ position: event.target.value as typeof text.position })} className={s.select}>
            <option value="top">{t('mv.positions.top')}</option>
            <option value="center">{t('mv.positions.center')}</option>
            <option value="bottom">{t('mv.positions.bottom')}</option>
          </select>
        </label>
        <label className={s.sliderField}>
          <span>{t('mv.fontSize')}</span>
          <input type="range" min={18} max={84} value={text.fontSize} onChange={event => updateText({ fontSize: Number(event.target.value) })} />
          <strong>{text.fontSize}</strong>
        </label>
        <label className={s.sliderField}>
          <span>{t('mv.textGlow')}</span>
          <input type="range" min={0} max={100} value={Math.round(text.textGlow * 100)} onChange={event => updateText({ textGlow: Number(event.target.value) / 100 })} />
          <strong>{Math.round(text.textGlow * 100)}</strong>
        </label>
      </div>

      <div className={s.group}>
        <div className={s.groupTitle}>{t('mv.projectFile')}</div>
        <label className={s.field}>
          <span>{t('mv.exportMode')}</span>
          <select value={exportMode} onChange={e => setExportMode(e.target.value as MVAssetRefMode)} className={s.select}>
            <option value="zip">{t('mv.exportZip')}</option>
            <option value="inline">{t('mv.exportInline')}</option>
            <option value="path">{t('mv.exportPath')}</option>
          </select>
        </label>
        <div className={s.buttonRow}>
          <button className={s.button} onClick={downloadConfig}>{t('mv.exportProject')}</button>
          <button className={s.button} onClick={() => importInputRef.current?.click()}>{t('mv.importProject')}</button>
          <button className={s.button} onClick={resetProject}>{t('mv.resetProject')}</button>
        </div>
        <input ref={importInputRef} type="file" accept=".json,.zip,application/json,application/zip" className={s.hiddenInput} onChange={onImportConfig} />
        <div className={s.themePreview} style={{ background: `linear-gradient(135deg, ${currentTheme.primaryColor}, ${currentTheme.secondaryColor})` }}>
          <span>{t(`mv.themeNames.${currentThemeId}`, currentTheme.label)}</span>
        </div>
      </div>
    </div>
  );
}
