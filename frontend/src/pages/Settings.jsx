import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
  getMe,
  getApiKeys,
  createApiKey,
  revokeApiKey,
} from '../api/client';
import ConfirmDialog from '../components/items/ConfirmDialog';
import { applyTheme } from '../utils/theme';
import { useThemePreference } from '../hooks/useTheme';
import Button from '../components/ui/Button';
import OneTimeSecret from '../components/ui/OneTimeSecret';
import {
  Badge,
  PageHeader,
  DescriptionItem,
  EmptyState,
  ErrorState,
  Skeleton,
  LoadingRegion,
} from '../components/ui/primitives';
import { Toast } from '../components/ui/feedback';
import {
  IconSun,
  IconMoon,
  IconMonitor,
  IconLogout,
  IconCheck,
} from '../components/ui/Icons';


const THEME_OPTIONS = [
  { id: 'light', label: 'Light', description: 'Dark sidebar, light workspace', icon: IconSun },
  { id: 'dark', label: 'Dark', description: 'Dark sidebar and workspace', icon: IconMoon },
  { id: 'system', label: 'System', description: 'Matches your operating system', icon: IconMonitor },
];

/** Miniature preview of the hybrid layout for each theme option. */
function ThemePreview({ mode }) {
  const canvas = mode === 'dark' ? '#0b1130' : '#eef1fb';
  const card = mode === 'dark' ? '#141b3f' : '#ffffff';
  const line = mode === 'dark' ? '#262f60' : '#e4e8f5';
  const body = (
    <div className="flex h-full w-full">
      <div className="flex w-[28%] flex-col gap-1 bg-[#0f1b4c] p-1.5">
        <span className="h-1.5 w-3/4 rounded-sm bg-[#3461f0]" />
        <span className="h-1 w-2/3 rounded-sm bg-white/20" />
        <span className="h-1 w-1/2 rounded-sm bg-white/20" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-1.5" style={{ background: canvas }}>
        <span className="h-1.5 w-1/2 rounded-sm" style={{ background: line }} />
        <div className="grid flex-1 grid-cols-2 gap-1">
          <span className="rounded-sm border" style={{ background: card, borderColor: line }} />
          <span className="rounded-sm border" style={{ background: card, borderColor: line }} />
        </div>
      </div>
    </div>
  );
  if (mode === 'system') {
    return (
      <div className="relative h-14 w-full overflow-hidden rounded-sm border border-line" aria-hidden>
        <div className="absolute inset-0">
          <ThemePreview mode="light" />
        </div>
        <div className="absolute inset-0 [clip-path:polygon(60%_0,100%_0,100%_100%,40%_100%)]">
          <ThemePreview mode="dark" />
        </div>
      </div>
    );
  }
  return (
    <div className="h-14 w-full overflow-hidden rounded-sm border border-line" aria-hidden>
      {body}
    </div>
  );
}


/** Label-left settings section: title and explanation beside the controls. */
const SECTION_MARK = {
  'account-heading': 'bg-cobalt',
  'keys-heading': 'bg-orchid',
  'session-heading': 'bg-grass',
  'prefs-heading': 'bg-sunflower',
};

function SettingsSection({ titleId, title, description, actions, children }) {
  return (
    <section
      aria-labelledby={titleId}
      className="grid scroll-mt-24 grid-cols-1 gap-4 rounded-2xl border border-line bg-surface p-6 shadow-card lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10"
    >
      <div>
        <h2 id={titleId} className="flex items-center gap-2 text-[15px] font-semibold text-fg">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${SECTION_MARK[titleId] || 'bg-cobalt'}`} aria-hidden />
          {title}
        </h2>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{description}</p>}
      </div>
      <div className="min-w-0">
        {actions && <div className="mb-4 flex flex-wrap gap-2">{actions}</div>}
        {children}
      </div>
    </section>
  );
}

export default function Settings() {
  const { user: authUser, logout } = useAuth();
  const qc = useQueryClient();
  const [newSecret, setNewSecret] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [theme, setTheme] = useThemePreference();
  const [toast, setToast] = useState('');

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const profileQuery = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    initialData: authUser ? { success: true, user: authUser } : undefined,
  });

  const keysQuery = useQuery({
    queryKey: ['apiKeys'],
    queryFn: getApiKeys,
  });

  const createMutation = useMutation({
    mutationFn: (label) => createApiKey(label || 'Dashboard'),
    onSuccess: (data) => {
      if (data.apiKey) {
        setNewSecret(data.apiKey);
      }
      qc.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => revokeApiKey(id),
    onSuccess: () => {
      setRevokeTarget(null);
      setToast('API key revoked');
      qc.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });

  const profile = profileQuery.data?.user || authUser;
  const keys = keysQuery.data?.keys || [];
  const activeCount = keys.filter((k) => !k.revoked).length;

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Account details, API keys, session security, and display preferences."
      />

      <div>
        <div className="min-w-0 space-y-5">
          {/* Account */}
          <SettingsSection
              titleId="account-heading"
              title="Account"
              description="Email and plan are managed by the backend. Profile fields are read-only in this release."
            >
            {profileQuery.isLoading && !profile && (
              <LoadingRegion label="Loading account…" className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </LoadingRegion>
            )}
            {profileQuery.isError && !profile && (
              <ErrorState
                title="Could not load profile."
                message={profileQuery.error?.message}
                onRetry={() => profileQuery.refetch()}
              />
            )}
            {profile && (
              <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                <DescriptionItem label="Email">
                  <span className="break-all font-medium">{profile.email}</span>
                </DescriptionItem>
                <DescriptionItem label="Plan">
                  <span className="capitalize">{profile.plan || '—'}</span>
                </DescriptionItem>
                <DescriptionItem label="User ID">
                  <span className="break-all font-mono text-xs text-fg-muted">{profile.id}</span>
                </DescriptionItem>
                <DescriptionItem label="Account created">
                  {profile.createdAt ? new Date(profile.createdAt).toLocaleString() : '—'}
                </DescriptionItem>
              </dl>
            )}
          </SettingsSection>

          {/* API keys */}
          <SettingsSection
              titleId="keys-heading"
              title="API keys"
              description="A key's secret is shown once, when you create it. Revoking a key blocks it on the public API straight away."
              actions={
                <Button
                  variant="primary"
                  onClick={() => createMutation.mutate('Dashboard')}
                  loading={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating…' : 'Create API key'}
                </Button>
              }
            >

            {createMutation.isError && (
              <p className="mt-3 text-sm text-danger-fg" role="alert">
                {createMutation.error?.body?.message || createMutation.error?.message}
              </p>
            )}

            <OneTimeSecret secret={newSecret} onDismiss={() => setNewSecret(null)} />

            <div className="mt-4">
              {keysQuery.isLoading && (
                <LoadingRegion label="Loading keys…" className="space-y-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </LoadingRegion>
              )}
              {keysQuery.isError && (
                <p className="text-sm text-danger-fg" role="alert">
                  Could not load keys. {keysQuery.error?.message}
                </p>
              )}

              {keys.length > 0 && (
                <>
                  <p className="mb-2 text-xs text-fg-muted">
                    {activeCount} active of {keys.length} total
                  </p>
                  <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
                    {keys.map((k) => (
                      <li
                        key={k.id}
                        className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${k.revoked ? 'bg-surface-2/60' : ''}`}
                      >
                        <div className="min-w-0">
                          <p className={`text-sm font-medium ${k.revoked ? 'text-fg-muted' : 'text-fg'}`}>
                            {k.label || 'Unnamed'}{' '}
                            <span className="ml-1 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs font-normal text-fg-muted">
                              {(k.prefix || k.keyPrefix || '').replace(/\.+$/, '') + '…'}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-fg-muted">
                            Created {k.createdAt ? new Date(k.createdAt).toLocaleString() : '—'}
                            {k.lastUsedAt
                              ? ` · Last used ${new Date(k.lastUsedAt).toLocaleString()}`
                              : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={k.revoked ? 'neutral' : 'success'} dot>
                            {k.revoked ? 'Revoked' : 'Active'}
                          </Badge>
                          {!k.revoked && (
                            <Button
                              size="xs"
                              variant="danger-ghost"
                              onClick={() => {
                                setRevokeTarget(k);
                                revokeMutation.reset();
                              }}
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {keys.length === 0 && !keysQuery.isLoading && !keysQuery.isError && (
                <EmptyState
                  className="rounded-md border border-dashed border-line-strong"
                  title="No API keys yet."
                  description="Create a key to authenticate calls to the public cache API."
                />
              )}
            </div>
          </SettingsSection>

          {/* Session */}
          <SettingsSection
              titleId="session-heading"
              title="Session & security"
              description="How your session and credentials are handled."
              actions={
                <Button icon={IconLogout} onClick={() => logout()}>
                  Log out
                </Button>
              }
            >
            <ul className="list-disc space-y-1.5 pl-4 text-[13px] text-fg marker:text-fg-subtle">
              {[
                'Dashboard auth uses an HTTP-only session cookie (not readable by JavaScript). The JWT is not stored in localStorage or sessionStorage.',
                'API keys are stored server-side as SHA-256 hashes only.',
                'Passwords are hashed with bcrypt before storage.',
                'Login attempts are rate-limited; public API calls use plan-based rate limits.',
              ].map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </SettingsSection>

          {/* Preferences */}
          <SettingsSection
              titleId="prefs-heading"
              title="Preferences"
              description={
                <>
                  Theme preference is stored in this browser only (localStorage key{' '}
                  <code className="rounded bg-surface-2 px-1 text-xs text-fg">caas_theme</code>). It is not an
                  authentication secret.
                </>
              }
            >
            <fieldset>
              <legend className="sr-only">Theme</legend>
              <p className="mb-3 text-[13px] font-medium text-fg" aria-hidden>
                Theme
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {THEME_OPTIONS.map((opt) => {
                  const active = theme === opt.id;
                  return (
                    <label
                      key={opt.id}
                      className={`relative cursor-pointer rounded-2xl border bg-surface p-2.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand ${
                        active ? 'border-brand ring-2 ring-brand/30' : 'border-line hover:border-line-strong'
                      }`}
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={opt.id}
                        checked={active}
                        onChange={() => setTheme(opt.id)}
                        className="sr-only"
                      />
                      <ThemePreview mode={opt.id} />
                      <span className="mt-3 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium text-fg">
                          <opt.icon className="h-4 w-4 text-fg-muted" />
                          <span>{opt.label}</span>
                        </span>
                        {active && (
                          <IconCheck className="h-4 w-4 text-fg" strokeWidth={2.25} />
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-fg-muted">{opt.description}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </SettingsSection>
        </div>
      </div>

      <Toast message={toast} onDismiss={() => setToast('')} />

      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke API key"
        description={
          revokeTarget
            ? `Revoke “${revokeTarget.label || 'Unnamed'}” (${revokeTarget.prefix || revokeTarget.keyPrefix || ''}…)? This cannot be undone. Any application still using this key will receive authentication errors immediately.`
            : ''
        }
        confirmLabel="Revoke key"
        danger
        loading={revokeMutation.isPending}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
      >
        {revokeMutation.isError && (
          <p className="mt-3 text-sm text-danger-fg" role="alert">
            {revokeMutation.error?.body?.message || revokeMutation.error?.message}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
