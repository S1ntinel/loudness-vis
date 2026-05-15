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
    previewAspect,
    rackLocked,
    selectedSlot,
    slots,
    applyTheme,
    setSpectrumStyle,
    updateGlobal,
    updateText,
    updateDynamicBackground,
    updateSpectrumSettings,
    updateSlotParams,
    setPreviewAspect,
    resetProject,
  } = useMVStore();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [exportMode, setExportMode] = useState<MVAssetRefMode>('zip');
  const panelLockedStyle = rackLocked ? { pointerEvents: 'none' as const, opacity: 0.6 } : undefined;
  const selectedSlotConfig = slots.find(slot => slot.id === selectedSlot) ?? null;
  const selectedParticleVariant = selectedSlotConfig?.type === 'particle-burst' && typeof selectedSlotConfig.params.variant === 'string'
    ? selectedSlotConfig.params.variant
    : 'burst';

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

      <div className={s.group} style={panelLockedStyle}>
        <div className={s.groupTitle}>{t('mv.theme')}</div>
        <label className={s.field}>
          <span>{t('mv.theme')}</span>
          <select value={currentThemeId} disabled={rackLocked} onChange={event => applyTheme(event.target.value as keyof typeof MV_THEMES)} className={s.select}>
            {Object.values(MV_THEMES).map(theme => (
              <option key={theme.id} value={theme.id}>{t(`mv.themeNames.${theme.id}`, theme.label)}</option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          <span>{t('mv.spectrumStyle')}</span>
          <select value={currentSpectrumStyle} disabled={rackLocked} onChange={event => setSpectrumStyle(event.target.value as 'bar' | 'mirrorBar' | 'radial')} className={s.select}>
            <option value="bar">{t('mv.spectrumStyles.bar')}</option>
            <option value="mirrorBar">{t('mv.spectrumStyles.mirrorBar')}</option>
            <option value="radial">{t('mv.spectrumStyles.radial')}</option>
          </select>
        </label>
        <label className={s.field}>
          <span>{t('mv.previewAspect', 'Preview')}</span>
          <select value={previewAspect} onChange={event => setPreviewAspect(event.target.value as 'auto' | 'landscape' | 'portrait')} className={s.select}>
            <option value="auto">{t('mv.previewAuto', 'Auto')}</option>
            <option value="landscape">16:9</option>
            <option value="portrait">9:16</option>
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
        <label className={s.sliderField}>
          <span>{t('mv.opacity', 'Opacity')}</span>
          <input type="range" min={10} max={100} value={Math.round(global.opacity * 100)} onChange={event => updateGlobal({ opacity: Number(event.target.value) / 100 })} />
          <strong>{Math.round(global.opacity * 100)}%</strong>
        </label>
        <label className={s.sliderField}>
          <span>{t('mv.spectrumScale', 'Spectrum Size')}</span>
          <input type="range" min={15} max={300} value={Math.round(spectrumSettings.scale * 100)} onChange={event => updateSpectrumSettings({ scale: Number(event.target.value) / 100 })} />
          <strong>{Math.round(spectrumSettings.scale * 100)}%</strong>
        </label>
        <label className={s.sliderField}>
          <span>{t('mv.horizontalOffset', 'Horizontal')}</span>
          <input type="range" min={-40} max={40} value={Math.round((spectrumSettings.offsetX ?? 0) * 100)} onChange={event => updateSpectrumSettings({ offsetX: Number(event.target.value) / 100 })} />
          <strong>{Math.round((spectrumSettings.offsetX ?? 0) * 100)}</strong>
        </label>
        <label className={s.sliderField}>
          <span>{t('mv.verticalOffset', 'Vertical')}</span>
          <input type="range" min={-40} max={40} value={Math.round((spectrumSettings.offsetY ?? 0) * 100)} onChange={event => updateSpectrumSettings({ offsetY: Number(event.target.value) / 100 })} />
          <strong>{Math.round((spectrumSettings.offsetY ?? 0) * 100)}</strong>
        </label>
        <div className={s.colorGrid}>
          <label className={s.colorField}>
            <span>{t('mv.effectPrimary', 'Effect Main')}</span>
            <input type="color" value={global.primaryColor} onChange={event => updateGlobal({ primaryColor: event.target.value })} />
          </label>
          <label className={s.colorField}>
            <span>{t('mv.effectSecondary', 'Effect Accent')}</span>
            <input type="color" value={global.secondaryColor} onChange={event => updateGlobal({ secondaryColor: event.target.value })} />
          </label>
          <label className={s.colorField}>
            <span>{t('mv.effectGlow', 'Effect Glow')}</span>
            <input type="color" value={global.glowColor} onChange={event => updateGlobal({ glowColor: event.target.value })} />
          </label>
          <label className={s.colorField}>
            <span>{t('mv.effectText', 'Text')}</span>
            <input type="color" value={global.textColor} onChange={event => updateGlobal({ textColor: event.target.value })} />
          </label>
        </div>
        <div className={s.colorGrid}>
          <label className={s.colorField}>
            <span>{t('mv.spectrumMain', 'Spectrum Main')}</span>
            <input type="color" value={spectrumSettings.colorA} onChange={event => updateSpectrumSettings({ colorA: event.target.value })} />
          </label>
          <label className={s.colorField}>
            <span>{t('mv.spectrumAccent', 'Spectrum Accent')}</span>
            <input type="color" value={spectrumSettings.colorB} onChange={event => updateSpectrumSettings({ colorB: event.target.value })} />
          </label>
          <label className={s.colorField}>
            <span>{t('mv.spectrumGlow', 'Spectrum Glow')}</span>
            <input type="color" value={spectrumSettings.glowColor} onChange={event => updateSpectrumSettings({ glowColor: event.target.value })} />
          </label>
        </div>
      </div>

      <div className={s.group} style={{ borderLeft: `3px solid ${currentTheme.primaryColor}`, paddingLeft: 13, ...(panelLockedStyle ?? {}) }}>
        <div className={s.groupTitle}>{t('mv.dynBg')}</div>
        <label className={s.toggleRow}>
          <input type="checkbox" checked={dynamicBackground.enabled} disabled={rackLocked} onChange={event => updateDynamicBackground({ enabled: event.target.checked })} />
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

      <div className={s.group} style={panelLockedStyle}>
        <div className={s.groupTitle}>{t('mv.text')}</div>
        <label className={s.toggleRow}>
          <input type="checkbox" checked={text.showTitle} disabled={rackLocked} onChange={event => updateText({ showTitle: event.target.checked })} />
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
          <input type="range" min={18} max={200} value={text.fontSize} onChange={event => updateText({ fontSize: Number(event.target.value) })} />
          <strong>{text.fontSize}</strong>
        </label>
        <label className={s.sliderField}>
          <span>{t('mv.textGlow')}</span>
          <input type="range" min={0} max={100} value={Math.round(text.textGlow * 100)} onChange={event => updateText({ textGlow: Number(event.target.value) / 100 })} />
          <strong>{Math.round(text.textGlow * 100)}</strong>
        </label>
        <label className={s.sliderField}>
          <span>{t('mv.horizontalOffset', 'Horizontal')}</span>
          <input type="range" min={-40} max={40} value={Math.round((text.offsetX ?? 0) * 100)} onChange={event => updateText({ offsetX: Number(event.target.value) / 100 })} />
          <strong>{Math.round((text.offsetX ?? 0) * 100)}</strong>
        </label>
        <label className={s.sliderField}>
          <span>{t('mv.verticalOffset', 'Vertical')}</span>
          <input type="range" min={-40} max={40} value={Math.round((text.offsetY ?? 0) * 100)} onChange={event => updateText({ offsetY: Number(event.target.value) / 100 })} />
          <strong>{Math.round((text.offsetY ?? 0) * 100)}</strong>
        </label>
      </div>



      {selectedSlotConfig?.type === 'lyrics-karaoke' && (
        <div className={s.group} style={panelLockedStyle}>
          <div className={s.groupTitle}>{t('mv.lyricsEdit', 'Lyrics Editor')}</div>
          <label className={s.field}>
            <span>{t('mv.position')}</span>
            <select value={typeof selectedSlotConfig.params.position === 'string' ? selectedSlotConfig.params.position : 'bottom'} onChange={event => updateSlotParams(selectedSlotConfig.id, { position: event.target.value })} className={s.select}>
              <option value="top">{t('mv.positions.top')}</option>
              <option value="center">{t('mv.positions.center')}</option>
              <option value="bottom">{t('mv.positions.bottom')}</option>
            </select>
          </label>
          <label className={s.sliderField}>
            <span>{t('mv.lyricsZoom', 'Font Size')}</span>
            <input type="range" min={14} max={120} value={Number(selectedSlotConfig.params.fontSize ?? 38)} onChange={event => updateSlotParams(selectedSlotConfig.id, { fontSize: Number(event.target.value) })} />
            <strong>{Number(selectedSlotConfig.params.fontSize ?? 38)}</strong>
          </label>
          <label className={s.sliderField}>
            <span>{t('mv.lyricsGlow', 'Glow')}</span>
            <input type="range" min={0} max={100} value={Math.round(Number(selectedSlotConfig.params.glow ?? 0.6) * 100)} onChange={event => updateSlotParams(selectedSlotConfig.id, { glow: Number(event.target.value) / 100 })} />
            <strong>{Math.round(Number(selectedSlotConfig.params.glow ?? 0.6) * 100)}</strong>
          </label>
          <label className={s.fieldVertical}>
            <span>{t('mv.lyricsFont', 'Font Family')}</span>
            <input className={s.input} value={typeof selectedSlotConfig.params.fontFamily === 'string' ? selectedSlotConfig.params.fontFamily : ''} onChange={event => updateSlotParams(selectedSlotConfig.id, { fontFamily: event.target.value })} placeholder={t('mv.lyricsFontPlaceholder', 'Default: MiSans')} />
          </label>
        </div>
      )}

      {selectedSlotConfig?.type === 'particle-burst' && (
        <div className={s.group} style={panelLockedStyle}>
          <div className={s.groupTitle}>{t('mv.particlePanel', 'Particle Style')}</div>
          <label className={s.field}>
            <span>{t('mv.particleStyle', 'Variant')}</span>
            <select value={selectedParticleVariant} disabled={rackLocked} onChange={event => updateSlotParams(selectedSlotConfig.id, { variant: event.target.value })} className={s.select}>
              <option value="burst">{t('mv.particleStyles.burst', 'Burst')}</option>
              <option value="meteor">{t('mv.particleStyles.meteor', 'Meteor')}</option>
              <option value="sakura">{t('mv.particleStyles.sakura', 'Sakura')}</option>
              <option value="rain">{t('mv.particleStyles.rain', 'Rain')}</option>
              <option value="firefly">{t('mv.particleStyles.firefly', 'Firefly')}</option>
            </select>
          </label>
          <label className={s.sliderField}>
            <span>{t('mv.density', 'Density')}</span>
            <input type="range" min={8} max={120} value={Number(selectedSlotConfig.params.density ?? 50)} onChange={event => updateSlotParams(selectedSlotConfig.id, { density: Number(event.target.value) })} />
            <strong>{Number(selectedSlotConfig.params.density ?? 50)}</strong>
          </label>
          <label className={s.sliderField}>
            <span>{t('mv.speed', 'Speed')}</span>
            <input type="range" min={10} max={180} value={Number(selectedSlotConfig.params.speed ?? 60)} onChange={event => updateSlotParams(selectedSlotConfig.id, { speed: Number(event.target.value) })} />
            <strong>{Number(selectedSlotConfig.params.speed ?? 60)}</strong>
          </label>
          <label className={s.sliderField}>
            <span>{t('mv.particleSize', 'Size')}</span>
            <input type="range" min={1} max={12} step={0.1} value={Number(selectedSlotConfig.params.size ?? 3)} onChange={event => updateSlotParams(selectedSlotConfig.id, { size: Number(event.target.value) })} />
            <strong>{Number(selectedSlotConfig.params.size ?? 3).toFixed(1)}</strong>
          </label>
        </div>
      )}

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
