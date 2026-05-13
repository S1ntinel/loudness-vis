import { useTranslation } from 'react-i18next';
import { useMVStore } from '../../../store/useMVStore';
import s from './PresetPanel.module.css';

export default function PresetPanel() {
  const { t } = useTranslation();
  const { templates, currentTemplateId, applyTemplate } = useMVStore();

  return (
    <div className={s.panel}>
      <h3 className={s.title}>{t('mv.preset')}</h3>

      <div className={s.presetList}>
        {templates.map(preset => (
          <button
            key={preset.name}
            className={`${s.presetCard} ${currentTemplateId === preset.id ? s.presetCardActive : ''}`}
            onClick={() => applyTemplate(preset.id)}
          >
            <span className={s.presetIcon}>{preset.icon}</span>
            <div className={s.presetInfo}>
              <div className={s.presetName}>{t(`mv.templateNames.${preset.id}`, preset.name)}</div>
              <div className={s.presetDesc}>{t(`mv.templateDescriptions.${preset.id}`, preset.description)}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
