import { useLanguage } from '../../context/LanguageContext';
import Modal from './Modal';
import { Globe, Check } from 'lucide-react';

export default function LanguageModal() {
  const { currentLang, languages, changeLanguage, langModalOpen, setLangModalOpen, t } =
    useLanguage();

  return (
    <Modal
      isOpen={langModalOpen}
      onClose={() => setLangModalOpen(false)}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={20} color="var(--color-primary)" />
          <span>{t('selectLanguage', 'Select Language')}</span>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {languages.map((lang) => {
          const isSelected = currentLang === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${
                  isSelected ? 'var(--color-primary)' : 'var(--color-border)'
                }`,
                background: isSelected ? 'var(--color-surface-alt)' : 'white',
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>
                  {lang.nativeName}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  {lang.name}
                </div>
              </div>
              {isSelected && <Check size={20} color="var(--color-primary)" />}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
