import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

/** Vietnam flag SVG (3:2). */
function FlagVn() {
  return (
    <svg className="language-switcher__flag" viewBox="0 0 30 20" aria-hidden focusable="false">
      <rect width="30" height="20" fill="#DA251D" />
      <path
        fill="#FFCD00"
        d="M15 4.2l1.35 4.15h4.37l-3.54 2.57 1.35 4.15L15 12.65l-3.53 2.62 1.35-4.15-3.54-2.57h4.37L15 4.2z"
      />
    </svg>
  );
}

/** US flag SVG (simplified). */
function FlagUs() {
  const h = 10 / 13;
  return (
    <svg className="language-switcher__flag" viewBox="0 0 19 10" aria-hidden focusable="false">
      <rect width="19" height="10" fill="#B22234" />
      <path
        fill="#fff"
        d={`M0 ${h} H19 V${2 * h} H0 Z M0 ${3 * h} H19 V${4 * h} H0 Z M0 ${5 * h} H19 V${6 * h} H0 Z M0 ${7 * h} H19 V${8 * h} H0 Z M0 ${9 * h} H19 V${10 * h} H0 Z`}
      />
      <rect fill="#3C3B6E" x="0" y="0" width="7.6" height={7 * h} />
      <g fill="#fff">
        <circle cx="1.9" cy="1.1" r="0.45" />
        <circle cx="3.8" cy="1.1" r="0.45" />
        <circle cx="5.7" cy="1.1" r="0.45" />
        <circle cx="2.85" cy="2.2" r="0.45" />
        <circle cx="4.75" cy="2.2" r="0.45" />
        <circle cx="1.9" cy="3.3" r="0.45" />
        <circle cx="3.8" cy="3.3" r="0.45" />
      </g>
    </svg>
  );
}

/**
 * Toggle 2 ngôn ngữ — khung trắng trượt sang cờ đang chọn.
 * @param {{ className?: string; variant?: 'onDark' | 'onLight' }}=} props
 */
export default function LanguageSwitcher({ className, variant = 'onDark' }) {
  const { i18n, t } = useTranslation();
  const lng = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'vi';
  const onLight = variant === 'onLight';

  return (
    <div
      className={cn(
        'language-switcher',
        onLight ? 'language-switcher--light' : 'language-switcher--dark',
        lng === 'en' && 'language-switcher--en',
        className
      )}
      role="group"
      aria-label={t('common.language')}
    >
      <span className="language-switcher__thumb" aria-hidden />

      <button
        type="button"
        className="language-switcher__btn"
        aria-pressed={lng === 'vi'}
        aria-label={t('common.vi')}
        title={t('common.vi')}
        onClick={() => i18n.changeLanguage('vi')}
      >
        <FlagVn />
      </button>
      <button
        type="button"
        className="language-switcher__btn"
        aria-pressed={lng === 'en'}
        aria-label={t('common.en')}
        title={t('common.en')}
        onClick={() => i18n.changeLanguage('en')}
      >
        <FlagUs />
      </button>
    </div>
  );
}
