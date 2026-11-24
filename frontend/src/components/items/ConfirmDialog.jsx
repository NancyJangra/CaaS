import { useEffect, useId, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusable(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => {
      if (el.getAttribute('aria-hidden') === 'true') return false;
      // offsetParent is null for hidden elements (except fixed/sticky edge cases)
      const style = window.getComputedStyle(el);
      return style.visibility !== 'hidden' && style.display !== 'none';
    }
  );
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  disabled = false,
  loading = false,
  onConfirm,
  onCancel,
  children,
  size = 'md',
}) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef(null);
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;

    // Prefer focusing an input inside the dialog (e.g. CLEAR confirm); else Cancel
    const firstInput = panelRef.current?.querySelector(
      'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
    );
    if (firstInput && typeof firstInput.focus === 'function') {
      firstInput.focus();
    } else {
      cancelRef.current?.focus();
    }

    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = getFocusable(panel);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Single focusable: keep focus on it
      if (focusable.length === 1) {
        e.preventDefault();
        first.focus();
        return;
      }

      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (prev && typeof prev.focus === 'function') {
        try {
          prev.focus();
        } catch {
          /* element may be gone */
        }
      }
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0a1238]/55 backdrop-blur-[2px] p-3 animate-fade-in sm:items-center sm:p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={`max-h-[calc(100vh-1.5rem)] w-full overflow-y-auto rounded-2xl border border-line bg-surface shadow-overlay animate-dialog-in ${
          size === 'lg' ? 'max-w-lg' : 'max-w-md'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-3.5 p-6 pb-0">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold text-fg">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1.5 break-words text-sm text-fg-muted">
                {description}
              </p>
            )}
            {children}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 px-6 pb-6 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-fg hover:bg-surface-2"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled || loading}
            className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
              danger
                ? 'bg-danger-solid hover:brightness-90 focus-visible:outline-danger'
                : 'bg-brand-solid hover:bg-brand-solid-hover'
            }`}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
