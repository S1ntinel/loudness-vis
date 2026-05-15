import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';

/**
 * 语言切换器：硬件风格拨码按键样式
 */
export default function LanguageSwitch() {
  const { i18n, t } = useTranslation();
  const current = (i18n.language === 'en' ? 'en' : 'zh') as 'zh' | 'en';
  
  function toggle() {
    setLanguage(current === 'zh' ? 'en' : 'zh');
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={t('toolbar.language')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 3,
        border: '1px solid var(--hw-ink)',
        background: 'var(--hw-metal)',
        color: 'var(--hw-ink)',
        cursor: 'pointer',
        fontSize: 10,
        fontWeight: 900,
        fontFamily: 'monospace',
        textTransform: 'uppercase',
        boxShadow: '0 2px 0 var(--hw-ink)',
        transition: 'all 0.05s'
      }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(1px)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 0 var(--hw-ink)';
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 0 var(--hw-ink)';
      }}
    >
      <span style={{ fontSize: 12 }}>🌐</span>
      <span>{current === 'zh' ? 'ZH' : 'EN'}</span>
    </button>
  );
}
