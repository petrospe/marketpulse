import { useLanguage } from '../i18n/useLanguage.js';

const buttonBase = {
  padding: '6px 14px',
  border: '1px solid #363c4e',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 'bold',
  background: 'transparent',
  color: '#848e9c',
};

const buttonActive = {
  ...buttonBase,
  background: '#2962ff',
  borderColor: '#2962ff',
  color: '#fff',
};

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div style={{ display: 'flex', gap: '8px' }} role="group" aria-label="Language">
      <button
        type="button"
        onClick={() => setLanguage('en')}
        style={language === 'en' ? buttonActive : buttonBase}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('el')}
        style={language === 'el' ? buttonActive : buttonBase}
        aria-pressed={language === 'el'}
      >
        GR
      </button>
    </div>
  );
}
