import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { Wordmark } from '../components/ui/Logo';
import Button, { buttonClasses } from '../components/ui/Button';
import { labelClass } from '../components/ui/primitives';
import { IconAlert, IconCheck, IconCopy, IconEye, IconEyeOff } from '../components/ui/Icons';

export default function OnboardingApiKey() {
  const { pendingApiKey, clearPendingApiKey, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState(null);

  const key = pendingApiKey || newKey;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  async function handleCopy() {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      setCopyMsg('Copied to clipboard');
    } catch {
      setCopyMsg('Copy failed. Select the key and copy it manually.');
    }
    setTimeout(() => setCopyMsg(''), 2500);
  }

  function handleContinue() {
    clearPendingApiKey();
    setNewKey(null);
    navigate('/app', { replace: true });
  }

  async function handleCreateNew() {
    setCreating(true);
    setCopyMsg('');
    try {
      const data = await api.createApiKey('Default');
      setNewKey(data.apiKey);
      setSaved(false);
      setVisible(false);
    } catch (err) {
      setCopyMsg(err.body?.message || 'Could not create a new key.');
    } finally {
      setCreating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-fg-muted" role="status">
        Loading…
      </div>
    );
  }

  const shell = (content, step) => (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Wordmark tone="dark" />
          <ol className="hidden items-center gap-2 text-xs font-medium sm:flex" aria-label="Onboarding progress">
            {['Create account', 'Save API key', 'Open dashboard'].map((label, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <li key={label} className="flex items-center gap-2" aria-current={current ? 'step' : undefined}>
                  {i > 0 && <span className="h-px w-6 bg-line-strong" aria-hidden />}
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-sm border text-[11px] ${
                      done
                        ? 'border-success bg-success text-white'
                        : current
                          ? 'border-fg text-fg'
                          : 'border-line-strong text-fg-muted'
                    }`}
                    aria-hidden
                  >
                    {done ? <IconCheck className="h-3 w-3" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={current ? 'text-fg' : 'text-fg-muted'}>
                    {label}
                    {done && <span className="sr-only"> (completed)</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center sm:px-6">
        <div className="w-full max-w-xl">{content}</div>
      </main>
    </div>
  );

  if (!key) {
    return shell(
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
        <h1 className="text-[22px] font-semibold text-fg">API key already shown</h1>
        <p className="mt-2 text-sm text-fg-muted">
          For security, your API key secret is displayed only once at creation. If you did not
          save it, generate a new key below. Your previous key remains valid until you revoke it
          in Settings.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" onClick={handleCreateNew} loading={creating}>
            {creating ? 'Creating…' : 'Create a new API key'}
          </Button>
          <Link to="/app" className={buttonClasses({ variant: 'secondary' })}>
            Skip to dashboard
          </Link>
        </div>
        {copyMsg && (
          <p className="mt-3 text-sm text-fg-muted" role="status">
            {copyMsg}
          </p>
        )}
      </div>,
      1
    );
  }

  const masked =
    key.length > 16 ? `${key.slice(0, 12)}${'•'.repeat(Math.min(24, key.length - 16))}${key.slice(-4)}` : '••••••••';

  return shell(
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="p-6 sm:p-8">
        <h1 className="text-[22px] font-semibold text-fg">Save your API key</h1>
        <p className="mt-1.5 text-sm text-fg-muted">
          Your account is ready. Use this key in the <code className="rounded bg-surface-2 px-1 text-xs text-fg">x-api-key</code>{' '}
          header to call the cache API.
        </p>

        <div
          className="mt-5 flex gap-3 rounded-sm border border-warning-line bg-warning-soft px-3.5 py-3 text-sm text-warning-fg"
          role="alert"
        >
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">This is the only time the full key will be shown.</p>
            <p className="mt-0.5 opacity-90">
              Store it in a password manager or secrets store. You will not be able to recover this secret later.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <label className={labelClass} htmlFor="api-key-display">
            Your API key
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="api-key-display"
              readOnly
              value={visible ? key : masked}
              onFocus={(e) => e.target.select()}
              className="h-9 w-full min-w-0 rounded-sm border border-line-strong bg-surface-2 px-2.5 font-mono text-[13px] text-fg focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
            />
            <div className="flex gap-2">
              <Button
                size="lg"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? 'Hide API key' : 'Show API key'}
                icon={visible ? IconEyeOff : IconEye}
              >
                {visible ? 'Hide' : 'Show'}
              </Button>
              <Button size="lg" variant="primary" onClick={handleCopy} icon={IconCopy}>
                Copy
              </Button>
            </div>
          </div>
          {copyMsg && (
            <p className="mt-2 text-sm text-success-fg" role="status">
              {copyMsg}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-line px-6 py-5 sm:px-8">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-fg">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-line-strong accent-[#4f46e5]"
          />
          <span>
            <span className="font-medium">I&apos;ve saved my API key</span>
            <span className="mt-0.5 block text-xs text-fg-muted">
              You can create additional keys later in Integrate or Settings.
            </span>
          </span>
        </label>

        <Button
          variant="primary"
          size="lg"
          onClick={handleContinue}
          disabled={!saved}
          className="mt-5 w-full"
        >
          Continue to dashboard
        </Button>
      </div>
    </div>,
    1
  );
}
