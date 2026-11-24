import { cloneElement, useEffect, useId, useState } from 'react';
import { IconCheck, IconAlert, IconCopy } from './Icons';

/* ───────────────────────── Tooltip ─────────────────────────
 * Shows on hover and keyboard focus, hides on blur / mouse leave / Escape
 * (WCAG 1.4.13 dismissible). The child must be focusable.
 */
export function Tooltip({ content, side = 'top', children, disabled = false }) {
  const id = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (disabled) return children;

  const pos =
    side === 'right'
      ? 'left-full top-1/2 ml-2 -translate-y-1/2'
      : side === 'bottom'
        ? 'top-full left-1/2 mt-2 -translate-x-1/2'
        : 'bottom-full left-1/2 mb-2 -translate-x-1/2';

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {cloneElement(children, { 'aria-describedby': open ? id : undefined })}
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`pointer-events-none absolute z-50 w-max max-w-xs animate-fade-in rounded-xl bg-[#0f1b4c] px-2 py-1 text-xs text-white ${pos}`}
        >
          {content}
        </span>
      )}
    </span>
  );
}

/* ───────────────────────── Toast ─────────────────────────
 * Polite live-region toast. Pages own the message state (and its timeout).
 */
export function Toast({ message, tone = 'success', onDismiss }) {
  if (!message) return null;
  const Icon = tone === 'error' ? IconAlert : IconCheck;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 sm:inset-x-auto sm:right-6 sm:bottom-6">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex animate-toast-in items-center gap-2.5 rounded-xl bg-[#0f1b4c] px-3.5 py-2.5 text-sm text-white shadow-overlay"
      >
        <Icon className={`h-4 w-4 ${tone === 'error' ? 'text-[#f0a090]' : 'text-[#8fcca7]'}`} strokeWidth={2.25} />
        <span>{message}</span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="ml-2 rounded-xl text-xs text-white/60 hover:text-white"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Live status ─────────────────────────
 * Polling indicator shared by Dashboard and Usage.
 */
export function LiveStatus({ isStaleError, isFetching, tabVisible, intervalLabel, lastUpdated }) {
  const tone = isStaleError ? 'warning' : !tabVisible ? 'neutral' : 'success';
  const dot = tone === 'warning' ? 'bg-warning' : tone === 'neutral' ? 'bg-fg-subtle' : 'bg-success';
  const seconds = String(intervalLabel || '').replace(/[^0-9]/g, '');
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-fg-muted" aria-live="polite">
      <span className="inline-flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot} ${isFetching ? 'opacity-50' : ''}`} aria-hidden />
        {isStaleError
          ? 'Showing last successful data'
          : tabVisible
            ? `Live, refreshes every ${seconds || '?'}s`
            : 'Paused while this tab is hidden'}
      </span>
      {lastUpdated && <span>Updated {lastUpdated}</span>}
    </span>
  );
}

/* ───────────────────────── Copy button ───────────────────────── */

export function useCopy(timeout = 2000) {
  const [state, setState] = useState(''); // '' | 'copied' | 'failed'
  useEffect(() => {
    if (!state) return undefined;
    const t = setTimeout(() => setState(''), timeout);
    return () => clearTimeout(t);
  }, [state, timeout]);
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
      return true;
    } catch {
      setState('failed');
      return false;
    }
  }
  return [state, copy];
}

/** Compact icon-only copy action with visible success feedback. */
export function IconCopyButton({ text, label, className = '', onCopied }) {
  const [state, copy] = useCopy(1600);
  return (
    <Tooltip content={state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}>
      <button
        type="button"
        onClick={async () => {
          const ok = await copy(text);
          if (ok) onCopied?.();
        }}
        aria-label={label}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-xl text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg ${className}`}
      >
        {state === 'copied' ? (
          <IconCheck className="h-3.5 w-3.5 text-success-fg" strokeWidth={2.25} />
        ) : (
          <IconCopy className="h-3.5 w-3.5" />
        )}
      </button>
    </Tooltip>
  );
}
