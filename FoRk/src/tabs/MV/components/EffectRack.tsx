import { useTranslation } from 'react-i18next';
import { useMVStore, EFFECT_LIST, EffectType } from '../../../store/useMVStore';
import s from './EffectRack.module.css';

export default function EffectRack() {
  const { t } = useTranslation();
  const { slots, selectedSlot, setSelectedSlot, setSlotType, toggleSlot } = useMVStore();

  return (
    <div className={s.rack}>
      <h3 className={s.title}>{t('mv.effectRack')}</h3>

      <div className={s.slots}>
        {slots.map(slot => (
          <div
            key={slot.id}
            className={`${s.slot} ${selectedSlot === slot.id ? s.slotSelected : ''} ${!slot.enabled ? s.slotDisabled : ''}`}
            onClick={() => setSelectedSlot(slot.id)}
          >
            <div className={s.slotHeader}>
              <span className={s.slotNumber}>{slot.id + 1}</span>
              <button
                className={`${s.bypassBtn} ${!slot.enabled ? s.bypassBtnActive : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSlot(slot.id);
                }}
              >
                {slot.enabled ? t('mv.on') : t('mv.off')}
              </button>
            </div>

            <select
              className={s.slotSelect}
              value={slot.type}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                e.stopPropagation();
                setSlotType(slot.id, e.target.value as EffectType);
              }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <option value="none">{t('mv.emptySlot')}</option>
              {EFFECT_LIST.map(effect => (
                <option key={effect.type} value={effect.type}>
                  {t(`mv.effectNames.${effect.type}`, effect.name)}
                </option>
              ))}
            </select>

            {slot.type !== 'none' && (
              <div className={s.slotInfo}>
                {t(`mv.effectDescriptions.${slot.type}`, EFFECT_LIST.find(e => e.type === slot.type)?.description ?? '')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
