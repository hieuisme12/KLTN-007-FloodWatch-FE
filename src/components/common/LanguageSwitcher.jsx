import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

/** Vietnam flag SVG (3:2), decorative. */
function FlagVn({ className }) {
  return (
    <svg viewBox="0 0 30 20" className={className} aria-hidden focusable="false">
      <rect width="30" height="20" fill="#DA251D" />
      <path
        fill="#FFCD00"
        d="M15 4.2l1.35 4.15h4.37l-3.54 2.57 1.35 4.15L15 12.65l-3.53 2.62 1.35-4.15-3.54-2.57h4.37L15 4.2z"
      />
    </svg>
  );
}

/** US flag SVG (simplified), decorative. */
function FlagUs({ className }) {
  const h = 10 / 13;
  return (
    <svg viewBox="0 0 19 10" className={className} aria-hidden focusable="false">
      <rect width="19" height="10" fill="#B22234" />
      <path
        fill="#fff"
        d={`M0 ${h} H19 V${2 * h} H0 Z M0 ${3 * h} H19 V${4 * h} H0 Z M0 ${5 * h} H19 V${6 * h} H0 Z M0 ${7 * h} H19 V${8 * h} H0 Z M0 ${9 * h} H19 V${10 * h} H0 Z M0 ${11 * h} H19 V${12 * h} H0 Z`}
      />
      <rect fill="#3C3B6E" x="0" y="0" width="7.6" height={7 * h} />
      <g fill="#fff">
        <circle cx="1.9" cy="1.1" r="0.45" />
        <circle cx="3.8" cy="1.1" r="0.45" />
        <circle cx="5.7" cy="1.1" r="0.45" />
        <circle cx="2.85" cy="2.2" r="0.45" />
        <circle cx="4.75" cy="2.2" r="0.45" />
        <circle cx="6.65" cy="2.2" r="0.45" />
        <circle cx="1.9" cy="3.3" r="0.45" />
        <circle cx="3.8" cy="3.3" r="0.45" />
        <circle cx="5.7" cy="3.3" r="0.45" />
      </g>
    </svg>
  );
}

/**
 * @param {{ className?: string; variant?: 'onDark' | 'onLight' }}=} props
 */
export default function LanguageSwitcher({ className, variant = 'onDark' }) {
  const { i18n, t } = useTranslation();
  const lng = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'vi';
  const onLight = variant === 'onLight';

  const btnBase =
    'flex items-center justify-center rounded-md p-1 transition-[filter,opacity,box-shadow,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1';

  const inactive = onLight
    ? 'text-slate-600 opacity-[0.55] blur-[1.25px] saturate-[0.85] hover:blur-none hover:saturate-100 hover:bg-white/80 hover:opacity-100'
    : 'text-white opacity-[0.5] blur-[1.25px] saturate-[0.85] hover:blur-none hover:saturate-100 hover:bg-white/15 hover:opacity-100';

  const active = onLight
    ? 'bg-white shadow-sm ring-2 ring-slate-300 ring-offset-1 ring-offset-slate-100 blur-0 opacity-100'
    : 'bg-white shadow-sm ring-2 ring-white/70 ring-offset-1 ring-offset-transparent blur-0 opacity-100';

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-lg border p-0.5 backdrop-blur-sm',
        onLight
          ? 'border-slate-300 bg-slate-100 text-slate-700'
          : 'border-white/35 bg-white/10 text-white',
        className
      )}
      role="group"
      aria-label={t('common.language')}
    >
      <button
        type="button"
        className={cn(btnBase, lng === 'vi' ? active : inactive)}
        aria-pressed={lng === 'vi'}
        aria-label={t('common.vi')}
        title={t('common.vi')}
        onClick={() => i18n.changeLanguage('vi')}
      >
        <FlagVn className="h-[14px] w-[21px] sm:h-4 sm:w-6" />
      </button>
      <button
        type="button"
        className={cn(btnBase, lng === 'en' ? active : inactive)}
        aria-pressed={lng === 'en'}
        aria-label={t('common.en')}
        title={t('common.en')}
        onClick={() => i18n.changeLanguage('en')}
      >
        <FlagUs className="h-[14px] w-[21px] sm:h-4 sm:w-6" />
      </button>
    </div>
  );
}
