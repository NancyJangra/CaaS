import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AppShell from '../layouts/AppShell';
import { AuthProvider } from '../context/AuthContext';
import * as api from '../api/client';

vi.mock('../api/client', () => ({
  getMe: vi.fn(),
  logout: vi.fn(),
  signup: vi.fn(),
  login: vi.fn(),
  createApiKey: vi.fn(),
  getApiKeys: vi.fn(),
  revokeApiKey: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}));

function renderShell(route = '/app') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <Routes>
            <Route path="/app" element={<AppShell />}>
              <Route index element={<p>Overview page</p>} />
              <Route path="items" element={<p>Items page</p>} />
              <Route path="usage" element={<p>Usage page</p>} />
              <Route path="integrate" element={<p>Integrate page</p>} />
              <Route path="settings" element={<p>Settings page</p>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  api.getMe.mockResolvedValue({
    success: true,
    user: { id: '1', email: 'dev@example.com', plan: 'free' },
  });
  api.logout.mockResolvedValue({ success: true });
});

describe('AppShell sidebar navigation', () => {
  it('renders grouped navigation with all routes', async () => {
    renderShell();
    expect(await screen.findByText('Overview page')).toBeInTheDocument();
    // Desktop sidebar is the first "Main" navigation landmark
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0];
    for (const label of ['Overview', 'Cached Items', 'Usage & Limits', 'Integrate', 'Settings']) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument();
    }
    for (const group of ['Workspace', 'Developer', 'Account']) {
      expect(within(nav).getByText(group)).toBeInTheDocument();
    }
  });

  it('marks the active route and updates the breadcrumb', async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText('Overview page');
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0];
    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    await user.click(within(nav).getByRole('link', { name: 'Cached Items' }));
    expect(await screen.findByText('Items page')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Cached Items' })).toHaveAttribute('aria-current', 'page');
    const crumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumb).getByText('Cached Items')).toHaveAttribute('aria-current', 'page');
  });

  it('shows plan, truncated email and a working logout', async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText('Overview page');
    const sidebar = screen.getAllByRole('complementary', { name: 'Sidebar' })[0];
    expect(within(sidebar).getByText('free')).toBeInTheDocument();
    expect(within(sidebar).getByTitle('dev@example.com')).toHaveClass('truncate');
    await user.click(within(sidebar).getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(api.logout).toHaveBeenCalled());
  });
});

describe('Responsive navigation drawer', () => {
  it('opens as a modal dialog, traps focus, closes on Escape and restores focus', async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText('Overview page');
    const opener = screen.getByRole('button', { name: 'Open navigation' });
    await user.click(opener);
    const drawer = await screen.findByRole('dialog', { name: 'Navigation' });
    expect(drawer).toHaveAttribute('aria-modal', 'true');
    expect(drawer.contains(document.activeElement)).toBe(true);
    for (let i = 0; i < 15; i += 1) {
      await user.tab();
      expect(drawer.contains(document.activeElement)).toBe(true);
    }
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Navigation' })).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it('closes after choosing a destination', async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText('Overview page');
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    const drawer = await screen.findByRole('dialog', { name: 'Navigation' });
    await user.click(within(drawer).getByRole('link', { name: 'Usage & Limits' }));
    expect(await screen.findByText('Usage page')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Navigation' })).not.toBeInTheDocument();
  });

  it('tablet rail exposes an Expand navigation control', async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText('Overview page');
    await user.click(screen.getByRole('button', { name: 'Expand navigation' }));
    expect(await screen.findByRole('dialog', { name: 'Navigation' })).toBeInTheDocument();
  });
});

describe('Sidebar theme toggle', () => {
  it('cycles theme and persists only the preference key', async () => {
    const user = userEvent.setup();
    localStorage.setItem('caas_theme', 'light');
    renderShell();
    await screen.findByText('Overview page');
    const sidebar = screen.getAllByRole('complementary', { name: 'Sidebar' })[0];
    await user.click(within(sidebar).getByRole('button', { name: /theme: light/i }));
    expect(localStorage.getItem('caas_theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    await user.click(within(sidebar).getByRole('button', { name: /theme: dark/i }));
    expect(localStorage.getItem('caas_theme')).toBe('system');
    // matchMedia mock reports light → system resolves to light
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(Object.keys(localStorage)).toEqual(['caas_theme']);
  });
});
