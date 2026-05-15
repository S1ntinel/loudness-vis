import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMVStore } from '../../../store/useMVStore';
import type { EffectSlot, MVGlobalParams, MVRecordingFormatId } from '../../../store/useMVStore';
import type { MVSpectrumStyle, MVTextConfig, MVThemeDefinition, MVThemeId, MVTemplateId } from '../mvProject';
import s from './PresetPanel.module.css';

const STORAGE_KEY = 'loudnessvis.mv.custom-presets';

interface CustomPresetSnapshot {
  currentTemplateId: MVTemplateId;
  currentThemeId: MVThemeId;
  currentSpectrumStyle: MVSpectrumStyle;
  currentTheme: MVThemeDefinition;
  recordingFormat: MVRecordingFormatId;
  text: MVTextConfig;
  dynamicBackground: {
    enabled: boolean;
    speed: number;
    audioReactive: boolean;
    type: ReturnType<typeof useMVStore.getState>['dynamicBackground']['type'];
  };
  spectrumSettings: ReturnType<typeof useMVStore.getState>['spectrumSettings'];
  global: MVGlobalParams;
  slots: EffectSlot[];
}

interface CustomPresetRecord {
  id: string;
  name: string;
  snapshot: CustomPresetSnapshot;
}

function cloneSnapshot(snapshot: CustomPresetSnapshot): CustomPresetSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as CustomPresetSnapshot;
}

export default function PresetPanel() {
  const { t } = useTranslation();
  const { templates, currentTemplateId, applyTemplate, rackLocked } = useMVStore();
  const [customPresets, setCustomPresets] = useState<CustomPresetRecord[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CustomPresetRecord[];
      if (Array.isArray(parsed)) {
        setCustomPresets(parsed);
      }
    } catch {
      setCustomPresets([]);
    }
  }, []);

  const persistPresets = (next: CustomPresetRecord[]) => {
    setCustomPresets(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const captureCurrentSnapshot = (): CustomPresetSnapshot => {
    const state = useMVStore.getState();
    return cloneSnapshot({
      currentTemplateId: state.currentTemplateId,
      currentThemeId: state.currentThemeId,
      currentSpectrumStyle: state.currentSpectrumStyle,
      currentTheme: state.currentTheme,
      recordingFormat: state.recordingFormat,
      text: state.text,
      dynamicBackground: state.dynamicBackground,
      spectrumSettings: state.spectrumSettings,
      global: state.global,
      slots: state.slots,
    });
  };

  const saveCurrentPreset = () => {
    const snapshot = captureCurrentSnapshot();
    const name = window.prompt(t('mv.customPresetPrompt', 'Preset name'), snapshot.text.songTitle || t('mv.customPresetDefaultName', 'My Preset'))?.trim();
    if (!name) return;
    const record: CustomPresetRecord = {
      id: `preset_${Date.now()}`,
      name,
      snapshot,
    };
    persistPresets([record, ...customPresets]);
  };

  const applyCustomPreset = (preset: CustomPresetRecord) => {
    const snapshot = cloneSnapshot(preset.snapshot);
    useMVStore.setState({
      currentTemplateId: snapshot.currentTemplateId,
      currentThemeId: snapshot.currentThemeId,
      currentSpectrumStyle: snapshot.currentSpectrumStyle,
      currentTheme: snapshot.currentTheme,
      recordingFormat: snapshot.recordingFormat,
      text: snapshot.text,
      dynamicBackground: snapshot.dynamicBackground,
      spectrumSettings: snapshot.spectrumSettings,
      global: snapshot.global,
      slots: snapshot.slots,
    });
  };

  const renamePreset = (preset: CustomPresetRecord) => {
    const nextName = window.prompt(t('mv.renamePreset', 'Rename preset'), preset.name)?.trim();
    if (!nextName) return;
    persistPresets(customPresets.map(item => item.id === preset.id ? { ...item, name: nextName } : item));
  };

  const removePreset = (preset: CustomPresetRecord) => {
    persistPresets(customPresets.filter(item => item.id !== preset.id));
  };

  return (
    <div className={s.panel}>
      <h3 className={s.title}>{t('mv.preset')}</h3>

      <div className={s.presetList}>
        {templates.map(preset => (
          <button
            key={preset.name}
            className={`${s.presetCard} ${currentTemplateId === preset.id ? s.presetCardActive : ''}`}
            disabled={rackLocked}
            onClick={() => {
              if (rackLocked) return;
              if (currentTemplateId !== preset.id && !window.confirm(t('mv.templateSwitchConfirm', 'Switching template will reset your current layer configuration. Continue?'))) {
                return;
              }
              applyTemplate(preset.id);
            }}
          >
            <span className={s.presetIcon}>{preset.icon}</span>
            <div className={s.presetInfo}>
              <div className={s.presetName}>{t(`mv.templateNames.${preset.id}`, preset.name)}</div>
              <div className={s.presetDesc}>{t(`mv.templateDescriptions.${preset.id}`, preset.description)}</div>
            </div>
          </button>
        ))}
      </div>

      <div className={s.customHeader}>
        <h4 className={s.subTitle}>{t('mv.customPresetTitle', 'Custom Presets')}</h4>
        <button className={s.saveBtn} onClick={saveCurrentPreset}>{t('mv.saveCurrentPreset', 'Save Current')}</button>
      </div>

      {customPresets.length === 0 ? (
        <div className={s.emptyState}>{t('mv.customPresetEmpty', 'No custom presets yet. Save the current layout to build your own panel.')}</div>
      ) : (
        <div className={s.customPresetList}>
          {customPresets.map(preset => (
            <div key={preset.id} className={s.customCard}>
              <button className={s.customMain} disabled={rackLocked} onClick={() => { if (rackLocked) return; applyCustomPreset(preset); }}>
                <span className={s.customIcon}>✨</span>
                <div className={s.presetInfo}>
                  <div className={s.presetName}>{preset.name}</div>
                  <div className={s.presetDesc}>{preset.snapshot.text.songTitle || t('mv.untitledSong')}</div>
                </div>
              </button>
              <div className={s.customActions}>
                <button className={s.actionBtn} onClick={() => renamePreset(preset)}>{t('mv.renamePresetShort', 'Rename')}</button>
                <button className={s.actionBtn} onClick={() => removePreset(preset)}>{t('common.remove')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
