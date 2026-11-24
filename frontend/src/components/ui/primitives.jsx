/**
 * CaaS UI primitives: Card, Badge, Field controls, ProgressBar,
 * headers, states (empty / error / notice / skeleton), table helpers.
 * All colors come from design tokens in index.css so light/dark both work.
 */
import { useId } from 'react';
import { IconAlert, IconCheck, IconInfo } from './Icons';

/* ───────────────────────── Card ───────────────────────── */

export function Card({ as: Tag = 'section', className = '', padded = true, children, ...rest }) {
  return (
    <Tag
      className={`rounded-2xl border border-line bg-surface shadow-card ${padded ? 'p-5' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// `icon` is accepted for API compatibility but intentionally not rendered.
// eslint-disable-next-line no-unused-vars
export function CardHeader({ title, titleId, description, actions, icon: _Icon, as: H = 'h2', className = '' }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0">
          <H id={titleId} className="text-[16px] font-bold leading-6 text-fg">
            {title}
          </H>
          {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ───────────────────────── Badge ───────────────────────── */

const BADGE_TONES = {
  neutral: 'bg-surface-3 text-fg-muted',
  brand: 'bg-brand-soft text-brand-fg',
  success: 'bg-success-soft text-success-fg',
  warning: 'bg-warning-soft text-warning-fg',
  danger: 'bg-danger-soft text-danger-fg',
  info: 'bg-info-soft text-info-fg',
};

const DOT_TONES = {
  neutral: 'bg-fg-subtle',
  brand: 'bg-brand',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

/** Status badge — always carries a text label, never color alone. */
export function Badge({ tone = 'neutral', dot = false, className = '', children, ...rest }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_TONES[tone] || BADGE_TONES.neutral} ${className}`}
      {...rest}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT_TONES[tone]}`} aria-hidden />}
      {children}
    </span>
  );
}

/* ───────────────────────── Form fields ───────────────────────── */

export const inputClass =
  'block w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-fg ' +
  'placeholder:text-fg-subtle transition-colors ' +
  'hover:border-fg-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger';

export const labelClass = 'mb-1 block text-[13px] font-medium text-fg';

export function Label({ className = '', children, ...rest }) {
  return (
    <label className={`${labelClass} ${className}`} {...rest}>
      {children}
    </label>
  );
}

export function Input({ className = '', ...rest }) {
  return <input className={`${inputClass} ${className}`} {...rest} />;
}

export function Select({ className = '', children, ...rest }) {
  return (
    <select className={`${inputClass} cursor-pointer pr-8 ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function FieldHint({ className = '', children, ...rest }) {
  return (
    <p className={`mt-1.5 text-xs text-fg-muted ${className}`} {...rest}>
      {children}
    </p>
  );
}

/* ───────────────────────── Progress ───────────────────────── */

const PROGRESS_FILL = {
  ok: 'bg-brand',
  warn: 'bg-warning',
  critical: 'bg-danger',
  success: 'bg-success',
};

export function ProgressBar({ pct = 0, level = 'ok', label, markers = [], className = '' }) {
  const safe = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <div className={`relative ${className}`}>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-surface-3"
        role="progressbar"
        aria-valuenow={Math.round(safe)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${PROGRESS_FILL[level] || PROGRESS_FILL.ok}`}
          style={{ width: `${safe}%` }}
        />
      </div>
      {markers.map((m) => (
        <span
          key={m}
          aria-hidden
          className="absolute -top-1 h-3.5 w-px bg-fg-muted/50"
          style={{ left: `${m}%` }}
        />
      ))}
    </div>
  );
}

/* ───────────────────────── Headers ───────────────────────── */

export function PageHeader({ title, subtitle, actions, meta, eyebrow }) {
  return (
    <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-0.5 text-[13px] text-fg-muted">{eyebrow}</p>}
        <h1 className="text-[26px] font-bold leading-tight text-fg">{title}</h1>
        {subtitle && <p className="mt-1 max-w-[70ch] text-[14px] text-fg-muted">{subtitle}</p>}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-fg-muted">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionHeader({ id, title, description, actions, className = '' }) {
  return (
    <div className={`mb-3 flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h2 id={id} className="text-[17px] font-bold text-fg">
          {title}
        </h2>
        {description && <p className="mt-0.5 max-w-3xl text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ───────────────────────── States ───────────────────────── */

const NOTICE_TONES = {
  info: { box: 'border-info-line bg-info-soft text-info-fg', Icon: IconInfo },
  warning: { box: 'border-warning-line bg-warning-soft text-warning-fg', Icon: IconAlert },
  danger: { box: 'border-danger-line bg-danger-soft text-danger-fg', Icon: IconAlert },
  success: { box: 'border-success-line bg-success-soft text-success-fg', Icon: IconCheck },
  neutral: { box: 'border-line bg-surface-2 text-fg-muted', Icon: IconInfo },
};

/** Inline notice / banner. Pass role="alert" or role="status" as needed. */
export function Notice({ tone = 'info', title, children, action, className = '', icon = true, ...rest }) {
  const t = NOTICE_TONES[tone] || NOTICE_TONES.info;
  const Icon = t.Icon;
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${t.box} ${className}`} {...rest}>
      {icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center px-6 py-10 text-center ${className}`}>
      {Icon && (
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cobalt-soft text-cobalt-fg">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className="text-[15px] font-semibold text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Blocking error state for a failed load. Renders role="alert". */
export function ErrorState({ title, message, onRetry, retryLabel = 'Retry', className = '' }) {
  return (
    <div
      className={`flex flex-col items-start gap-3 rounded-2xl border border-danger-line bg-danger-soft p-4 text-sm text-danger-fg sm:flex-row sm:items-center sm:justify-between ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">{title}</p>
          {message && <p className="mt-0.5 opacity-90">{message}</p>}
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-8 shrink-0 items-center rounded-lg border border-danger-line bg-surface px-3 text-[13px] font-medium text-danger-fg transition-colors hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

/** Loading region with an announced label and visual skeleton children. */
export function LoadingRegion({ label, children, className = '' }) {
  return (
    <div className={className} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/* ───────────────────────── Table helpers ───────────────────────── */

export const tableClasses = {
  wrap: 'relative overflow-x-auto',
  table: 'min-w-full text-left text-sm',
  thead: 'border-b border-line bg-surface-2',
  th: 'whitespace-nowrap px-3 py-2.5 sm:px-4 text-[12.5px] font-semibold text-fg-muted',
  tr: 'border-b border-line last:border-0 hover:bg-surface-2',
  td: 'px-3 py-2.5 align-middle sm:px-4',
};

/* ───────────────────────── Key/value list ───────────────────────── */

export function DescriptionItem({ label, children, className = '' }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-fg-muted">{label}</dt>
      <dd className="mt-1 text-sm text-fg">{children}</dd>
    </div>
  );
}

/* ───────────────────────── Segmented control ───────────────────────── */

/** Toggle-button group (aria-pressed). Used for time range etc. */
export function Segmented({ options, value, onChange, label, size = 'sm' }) {
  const id = useId();
  return (
    <div
      className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1 shadow-card"
      role="group"
      aria-label={label}
      id={id}
    >
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={`rounded-lg px-3 font-semibold ${size === 'sm' ? 'h-8 text-[13px]' : 'h-9 text-sm'} ${
              active
                ? 'bg-brand-solid text-white shadow-sm'
                : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
