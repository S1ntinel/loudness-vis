import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';

/**
 * 语言切换器：🌐 中 / EN 按钮，点击在 zh ↔ en 间切换。
 * 配色跟随当前主题（var(--btn-bg) / var(--accent)）。
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
        gap: 4,
        padding: '6px 10px',
        borderRadius: 8,
        border: '1px solid var(--btn-border)',
        background: 'var(--btn-bg)',
        color: 'var(--text)',
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: 'inherit',
      }}
    >
      <span aria-hidden>🌐</span>
      <span>{current === 'zh' ? '中' : 'EN'}</span>
    </button>
  );
}
