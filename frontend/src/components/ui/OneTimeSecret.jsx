import { useState } from 'react';
import { IconAlert, IconCheck, IconCopy, IconEye, IconEyeOff } from './Icons';
import { useCopy } from './feedback';

/**
 * One-time API key secret display. The secret lives only in the parent's
 * React state (memory) — never persisted. Masked by default.
 */
export default function OneTimeSecret({ secret, onDismiss, copyLabel = 'Copy', copiedMessage = 'Copied' }) {
  const [visible, setVisible] = useState(false);
  const [copyState, copy] = useCopy(2000);

  if (!secret) return null;
  const masked = `${secret.slice(0, 12)}${'•'.repeat(20)}`;

  return (
    <div className="mt-4 rounded-xl border border-warning-line bg-warning-soft" role="alert">
      <div className="flex items-start gap-3 px-4 pt-3.5">
        <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning-fg" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-warning-fg">Copy this key now. It will not be shown again.</p>
          <p className="mt-0.5 text-[13px] text-warning-fg">
            We only keep a hash and the first few characters, so it can't be recovered later.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 px-4 pb-4 pt-3 sm:flex-row sm:items-center">
        <input
          readOnly
          className="h-8 min-w-0 flex-1 rounded-xl border border-warning-line bg-surface px-2.5 font-mono text-[13px] text-fg focus:outline-none focus:ring-2 focus:ring-brand/25"
          value={visible ? secret : masked}
          aria-label="New API key secret"
          onFocus={(e) => e.target.select()}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-2.5 text-[13px] font-medium text-fg hover:bg-surface-2"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide API key' : 'Show API key'}
          >
            {visible ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
            {visible ? 'Hide' : 'Show'}
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-brand-solid px-2.5 text-[13px] font-medium text-white hover:bg-brand-solid-hover"
            onClick={() => copy(secret)}
          >
            {copyState === 'copied' ? <IconCheck className="h-4 w-4" /> : <IconCopy className="h-4 w-4" />}
            {copyLabel}
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-xl px-2.5 text-[13px] font-medium text-warning-fg underline-offset-2 hover:underline"
            onClick={() => {
              setVisible(false);
              onDismiss?.();
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
      {copyState && (
        <p
          className={`border-t border-warning-line px-4 py-2 text-xs font-medium ${copyState === 'copied' ? 'text-success-fg' : 'text-danger-fg'}`}
          role="status"
        >
          {copyState === 'copied' ? copiedMessage : 'Copy failed. Select the key and copy it manually.'}
        </p>
      )}
    </div>
  );
}
