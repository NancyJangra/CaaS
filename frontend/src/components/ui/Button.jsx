import { IconSpinner } from './Icons';

const BASE =
  'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl font-semibold ' +
  'transition-colors duration-100 disabled:pointer-events-none disabled:opacity-50 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

const VARIANTS = {
  primary:
    'bg-brand-solid text-white shadow-sm shadow-brand/30 hover:bg-brand-solid-hover',
  secondary:
    'border border-line bg-surface text-fg shadow-card hover:bg-surface-2',
  ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
  danger:
    'bg-danger-solid text-white hover:brightness-90 focus-visible:outline-danger',
  'danger-outline':
    'border border-danger-line bg-surface text-danger-fg hover:bg-danger-soft focus-visible:outline-danger',
  'danger-ghost': 'text-danger-fg hover:bg-danger-soft focus-visible:outline-danger',
  ink: 'bg-[#0f1b4c] text-white shadow-sm hover:bg-[#1a2861] dark:bg-brand-solid dark:hover:bg-brand-solid-hover',
  inverse: 'border border-white/25 text-white hover:bg-white/10',
};

const SIZES = {
  xs: 'h-7 rounded-lg px-2 text-xs',
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-10 px-4 text-sm',
  icon: 'h-8 w-8',
};

export function buttonClasses({ variant = 'secondary', size = 'md', className = '' } = {}) {
  return `${BASE} ${VARIANTS[variant] || VARIANTS.secondary} ${SIZES[size] || SIZES.md} ${className}`;
}

/**
 * Button — the single interactive-control primitive.
 * Icons are decorative; the visible label (or aria-label) is the accessible name.
 */
export default function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  icon: Icon,
  loading = false,
  children,
  type = 'button',
  disabled,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonClasses({ variant, size, className })}
      {...rest}
    >
      {loading ? (
        <IconSpinner className="h-3.5 w-3.5" />
      ) : Icon ? (
        <Icon className={size === 'xs' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      ) : null}
      {children}
    </button>
  );
}
