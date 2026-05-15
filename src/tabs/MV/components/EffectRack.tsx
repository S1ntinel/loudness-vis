import { useTranslation } from 'react-i18next';
import { useMVStore, EFFECT_LIST, EffectType } from '../../../store/useMVStore';
import s from './EffectRack.module.css';

const PARTICLE_VARIANTS = [
  { value: 'burst', labelKey: 'mv.particleStyles.burst', fallback: 'Burst' },
  { value: 'meteor', labelKey: 'mv.particleStyles.meteor', fallback: 'Meteor' },
  { value: 'sakura', labelKey: 'mv.particleStyles.sakura', fallback: 'Sakura' },
  { value: 'rain', labelKey: 'mv.particleStyles.rain', fallback: 'Rain' },
  { value: 'firefly', labelKey: 'mv.particleStyles.firefly', fallback: 'Firefly' },
];

export default function EffectRack() {
  const { t } = useTranslation();
  const {
    slots,
    selectedSlot,
    rackLocked,
    collapsedSlotIds,
    setSelectedSlot,
    setSlotType,
    toggleSlot,
    moveSlotUp,
    moveSlotDown,
    renameSlot,
    toggleRackLock,
    toggleSlotCollapsed,
    updateSlotParams,
  } = useMVStore();

  return (
    <div className={s.rack}>
      <div className={s.rackHeader}>
        <h3 className={s.title}>{t('mv.effectRack')}</h3>
        <button
          className={`${s.lockBtn} ${rackLocked ? s.lockBtnActive : ''}`}
          onClick={toggleRackLock}
          title={rackLocked ? t('mv.unlockRack', 'Unlock rack') : t('mv.lockRack', 'Lock rack')}
        >
          {rackLocked ? '🔒' : '🔓'} {rackLocked ? t('mv.locked', 'Locked') : t('mv.unlocked', 'Unlocked')}
        </button>
      </div>

      <div className={s.slots}>
        {slots.map((slot, index) => {
          const collapsed = collapsedSlotIds.includes(slot.id);
          return (
            <div
              key={slot.id}
              className={`${s.slot} ${selectedSlot === slot.id ? s.slotSelected : ''} ${!slot.enabled ? s.slotDisabled : ''} ${collapsed ? s.slotCollapsed : ''}`}
              onClick={() => setSelectedSlot(slot.id)}
            >
              <div className={s.slotHeader}>
                <div className={s.slotLead}>
                  <span className={s.slotNumber}>{index + 1}</span>
                  <span
                    className={`${s.slotOrderLabel} ${s.slotRename}`}
                    title={t('mv.renameSlotHint', 'Double-click to rename')}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      const newName = window.prompt(t('mv.renameSlotPrompt', 'Enter slot name'), slot.label || '')?.trim();
                      if (newName !== undefined) renameSlot(slot.id, newName);
                    }}
                  >
                    {slot.label || (index === 0 ? t('mv.layerTop', 'Top') : t('mv.layerOverlay', 'Overlay'))}
                  </span>
                </div>
                <div className={s.slotControls}>
                  <button
                    className={s.collapseBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSlotCollapsed(slot.id);
                    }}
                    title={collapsed ? t('mv.expandSlot', 'Expand') : t('mv.collapseSlot', 'Collapse')}
                  >
                    {collapsed ? '▸' : '▾'}
                  </button>
                  <button
                    className={s.orderBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveSlotUp(slot.id);
                    }}
                    disabled={index === 0 || rackLocked}
                    title={t('mv.moveUp', 'Move up')}
                  >
                    ↑
                  </button>
                  <button
                    className={s.orderBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveSlotDown(slot.id);
                    }}
                    disabled={index === slots.length - 1 || rackLocked}
                    title={t('mv.moveDown', 'Move down')}
                  >
                    ↓
                  </button>
                  <button
                    className={`${s.bypassBtn} ${!slot.enabled ? s.bypassBtnActive : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSlot(slot.id);
                    }}
                    disabled={rackLocked}
                  >
                    {slot.enabled ? t('mv.on') : t('mv.off')}
                  </button>
                </div>
              </div>

              {!collapsed && (
                <>
                  <select
                    className={s.slotSelect}
                    value={slot.type}
                    disabled={rackLocked}
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

                  {slot.type === 'particle-burst' && (
                    <select
                      className={s.slotSubSelect}
                      value={typeof slot.params.variant === 'string' ? slot.params.variant : 'burst'}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        e.stopPropagation();
                        updateSlotParams(slot.id, { variant: e.target.value });
                      }}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      {PARTICLE_VARIANTS.map(variant => (
                        <option key={variant.value} value={variant.value}>
                          {t(variant.labelKey, variant.fallback)}
                        </option>
                      ))}
                    </select>
                  )}

                  {slot.type !== 'none' && (
                    <div className={s.slotInfo}>
                      {t(`mv.effectDescriptions.${slot.type}`, EFFECT_LIST.find(e => e.type === slot.type)?.description ?? '')}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
