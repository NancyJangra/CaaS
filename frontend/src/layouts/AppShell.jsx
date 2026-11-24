import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wordmark, LogoMark } from '../components/ui/Logo';
import { Tooltip } from '../components/ui/feedback';
import { Skeleton } from '../components/ui/primitives';
import { HeaderWaves, SidebarWaves } from '../components/ui/BackgroundArt';
import {
  IconOverview,
  IconDatabase,
  IconGauge,
  IconCode,
  IconSettings,
  IconLogout,
  IconMenu,
  IconClose,
  IconChevronRight,
  IconSun,
  IconMoon,
  IconMonitor,
  IconSearch,
} from '../components/ui/Icons';
import { useThemePreference } from '../hooks/useTheme';

export const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { to: '/app', label: 'Overview', icon: IconOverview, end: true },
      { to: '/app/items', label: 'Cached Items', icon: IconDatabase },
      { to: '/app/usage', label: 'Usage & Limits', icon: IconGauge },
    ],
  },
  {
    label: 'Developer',
    items: [{ to: '/app/integrate', label: 'Integrate', icon: IconCode }],
  },
  {
    label: 'Account',
    items: [{ to: '/app/settings', label: 'Settings', icon: IconSettings }],
  },
];

function findRoute(pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/app';
  for (const g of NAV_GROUPS) {
    for (const item of g.items) {
      if (item.end ? clean === item.to : clean.startsWith(item.to)) return { group: g.label, item };
    }
  }
  return { group: 'Workspace', item: NAV_GROUPS[0].items[0] };
}

function displayName(email) {
  if (!email) return '';
  const local = email.split('@')[0].split(/[._\-+]/).filter(Boolean);
  const words = local.map((w) => w.replace(/\d+/g, '')).filter(Boolean).slice(0, 2);
  if (words.length === 0) return email.split('@')[0];
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* ───────────────────────── Sidebar ───────────────────────── */

function NavItem({ item, collapsed, onNavigate }) {
  const Icon = item.icon;
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      aria-label={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-xl text-[14px] font-medium transition-colors duration-150 ` +
        `focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white ` +
        `${collapsed ? 'h-10 w-10 justify-center' : 'h-11 px-3.5'} ` +
        (isActive
          ? 'bg-gradient-to-r from-[#3461f0] to-[#2a4bd6] text-white shadow-md shadow-[#0a1238]/40'
          : 'text-sidebar-fg hover:bg-white/[0.06] hover:text-white')
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-white' : 'text-sidebar-muted group-hover:text-white'}`} />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  );
  return collapsed ? (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

const THEME_CYCLE = { light: 'dark', dark: 'system', system: 'light' };
const THEME_META = {
  light: { label: 'Light', Icon: IconSun },
  dark: { label: 'Dark', Icon: IconMoon },
  system: { label: 'System', Icon: IconMonitor },
};

function ThemeToggle({ collapsed }) {
  const [theme, setTheme] = useThemePreference();
  const { Icon, label } = THEME_META[theme] || THEME_META.system;
  const next = THEME_CYCLE[theme] || 'light';
  const btn = (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${label}. Switch to ${THEME_META[next].label}`}
      className={`flex items-center gap-2.5 rounded-xl text-[13px] text-sidebar-muted hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-white ${
        collapsed ? 'h-10 w-10 justify-center' : 'h-9 px-3.5'
      }`}
    >
      <Icon className="h-4 w-4" />
      {!collapsed && <span>{label} theme</span>}
    </button>
  );
  return collapsed ? <Tooltip content={`${label} theme`} side="right">{btn}</Tooltip> : btn;
}

function Sidebar({ collapsed = false, onNavigate, onClose }) {
  const { user, logout } = useAuth();
  const email = user?.email || '';
  const name = displayName(email);
  const initial = (name[0] || email[0] || '?').toUpperCase();

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-[#0f1b4c] via-[#0e1a4a] to-[#0a1440] text-sidebar-fg dark:from-[#070c26] dark:via-[#070c26] dark:to-[#050920]">
      <SidebarWaves className="absolute inset-x-0 top-[38%] h-56 w-full" />

      {/* Brand */}
      <div className={`relative flex h-[72px] shrink-0 items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-6'}`}>
        <NavLink
          to="/app"
          end
          onClick={onNavigate}
          className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          aria-label="CaaS overview"
        >
          {collapsed ? <LogoMark className="h-8 w-8" /> : <Wordmark tone="light" descriptor={false} />}
        </NavLink>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-muted hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
            aria-label="Close navigation"
          >
            <IconClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav aria-label="Main" className={`relative flex-1 overflow-y-auto pb-4 pt-2 ${collapsed ? 'px-2.5' : 'px-4'}`}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-5' : ''}>
            {collapsed ? (
              gi > 0 && <div className="mx-auto mb-3 h-px w-6 bg-white/10" aria-hidden />
            ) : (
              <p className="mb-1.5 px-3.5 text-[11.5px] font-semibold text-sidebar-muted/80">{group.label}</p>
            )}
            <ul className={`space-y-1 ${collapsed ? 'flex flex-col items-center' : ''}`} aria-label={collapsed ? group.label : undefined}>
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavItem item={item} collapsed={collapsed} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom: plan card, theme, profile, logout */}
      <div className={`relative shrink-0 ${collapsed ? 'flex flex-col items-center gap-2 px-2 py-3' : 'space-y-3 p-4'}`}>
        {!collapsed && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <p className="text-[12px] text-sidebar-muted">Current plan</p>
            <p className="mt-0.5 text-[16px] font-bold text-white">
              <span className="capitalize">{user?.plan || 'Unknown'}</span> plan
            </p>
            <p className="mt-1 text-[12px] leading-snug text-sidebar-muted">See how much of each quota you have left.</p>
            <NavLink
              to="/app/usage"
              onClick={onNavigate}
              className="mt-3 flex h-9 items-center justify-center gap-1 rounded-xl bg-[#3461f0] text-[13px] font-semibold text-white hover:bg-[#2b53d6] focus-visible:outline-2 focus-visible:outline-white"
            >
              View limits <IconChevronRight className="h-3.5 w-3.5" />
            </NavLink>
          </div>
        )}

        <ThemeToggle collapsed={collapsed} />

        {collapsed ? (
          <>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3461f0] text-sm font-semibold text-white"
              aria-hidden
              title={email}
            >
              {initial}
            </span>
            <Tooltip content="Log out" side="right">
              <button
                type="button"
                onClick={() => logout()}
                aria-label="Log out"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-sidebar-muted hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
              >
                <IconLogout className="h-4 w-4" />
              </button>
            </Tooltip>
          </>
        ) : (
          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center gap-3 px-1">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3461f0] text-sm font-semibold text-white"
                aria-hidden
              >
                {initial}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-white">{name || 'Signed in'}</p>
                <p className="truncate text-[12px] text-sidebar-muted" title={email}>
                  {email}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="mt-2 flex h-9 w-full items-center gap-2.5 rounded-xl px-3.5 text-[13.5px] text-sidebar-fg hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-white"
            >
              <IconLogout className="h-4 w-4" />
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Mobile / tablet drawer ───────────────────────── */

function NavDrawer({ open, onClose, returnFocusRef }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const opener = returnFocusRef?.current;
    const panel = panelRef.current;
    const first = panel?.querySelector(FOCUSABLE);
    first?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll(FOCUSABLE));
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === firstEl || !panel.contains(document.activeElement))) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && (document.activeElement === lastEl || !panel.contains(document.activeElement))) {
        e.preventDefault();
        firstEl.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open, onClose, returnFocusRef]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
      <div className="absolute inset-0 animate-fade-in bg-[#0a1238]/60" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="relative h-full w-[272px] max-w-[85vw] animate-drawer-in shadow-overlay"
      >
        <Sidebar onNavigate={onClose} onClose={onClose} />
      </div>
    </div>
  );
}

/* ───────────────────────── Top bar search ───────────────────────── */

function TopSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  return (
    <form
      role="search"
      className="relative w-full max-w-[380px]"
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        navigate(term ? `/app/items?search=${encodeURIComponent(term)}` : '/app/items');
      }}
    >
      <label htmlFor="global-key-search" className="sr-only">
        Search cache keys
      </label>
      <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
      <input
        id="global-key-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search cache keys…"
        className="h-11 w-full rounded-full border border-line bg-surface pl-11 pr-4 text-[14px] text-fg shadow-card placeholder:text-fg-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
      />
    </form>
  );
}

/* ───────────────────────── Shell ───────────────────────── */

export default function AppShell() {
  const location = useLocation();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuBtnRef = useRef(null);
  const railMenuRef = useRef(null);
  const openerRef = useRef(null); // element to restore focus to when the drawer closes
  const { group, item } = findRoute(location.pathname);
  const initial = (displayName(user?.email)[0] || user?.email?.[0] || '?').toUpperCase();

  // Keep the document title in sync with the active page
  useEffect(() => {
    document.title = `${item.label} · CaaS`;
  }, [item.label]);

  function openDrawer(ref) {
    openerRef.current = ref.current;
    setDrawerOpen(true);
  }

  return (
    <div className="min-h-screen bg-canvas text-fg">
      <a
        href="#main-content"
        className="sr-only z-[70] rounded-xl bg-brand-solid px-3 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      {/* Desktop: persistent sidebar (≥1024px) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[256px] lg:block" aria-label="Sidebar">
        <Sidebar />
      </aside>

      {/* Tablet: collapsed icon rail (768–1023px), expandable to full drawer */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[68px] md:block lg:hidden" aria-label="Sidebar">
        <Sidebar collapsed />
        <button
          ref={railMenuRef}
          type="button"
          onClick={() => openDrawer(railMenuRef)}
          className="absolute -right-3 top-[60px] flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-fg-muted shadow-raised hover:text-fg"
          aria-label="Expand navigation"
          aria-expanded={drawerOpen}
        >
          <IconChevronRight className="h-3.5 w-3.5" />
        </button>
      </aside>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} returnFocusRef={openerRef} />

      <div className="relative isolate flex min-h-screen flex-col md:pl-[68px] lg:pl-[256px]">
        <HeaderWaves className="absolute inset-x-0 top-0 -z-10 h-[300px] w-full" />

        {/* Top bar */}
        <header className="relative z-20">
          <div className="mx-auto flex h-[72px] w-full max-w-[1320px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              ref={menuBtnRef}
              type="button"
              onClick={() => openDrawer(menuBtnRef)}
              className="-ml-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-fg-muted hover:bg-surface hover:text-fg md:hidden"
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
            >
              <IconMenu className="h-5 w-5" />
            </button>
            <nav aria-label="Breadcrumb" className="sr-only">
              <ol>
                <li>{group}</li>
                <li aria-current="page">{item.label}</li>
              </ol>
            </nav>
            <TopSearch />
            <div className="ml-auto flex items-center gap-3">
              <Link
                to="/app/integrate"
                className="hidden text-[13px] font-semibold text-fg-muted hover:text-fg sm:inline"
              >
                API reference
              </Link>
              <Link
                to="/app/settings"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f1b4c] text-sm font-semibold text-white ring-4 ring-surface hover:bg-[#1a2861] dark:bg-[#3461f0]"
                aria-label={`Account settings for ${user?.email || 'your account'}`}
                title={user?.email}
              >
                {initial}
              </Link>
            </div>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1320px] flex-1 px-4 pb-16 pt-2 focus:outline-none sm:px-6 lg:px-8"
        >
          <Suspense
            fallback={
              <div role="status" aria-live="polite" className="space-y-4">
                <span className="sr-only">Loading page…</span>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-80" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-28 rounded-2xl" />
                  ))}
                </div>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
