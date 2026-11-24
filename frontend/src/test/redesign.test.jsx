import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import CachedItems from '../pages/CachedItems';
import Integrate from '../pages/Integrate';
import Usage from '../pages/Usage';
import Home from '../pages/Home';
import OneTimeSecret from '../components/ui/OneTimeSecret';
import { applyTheme, getStoredTheme, setStoredTheme, watchSystemTheme } from '../utils/theme';
import * as api from '../api/client';

vi.mock('../api/client', () => ({
  getMe: vi.fn(),
  getItems: vi.fn(),
  updateItemTtl: vi.fn(),
  deleteItem: vi.fn(),
  clearAllItems: vi.fn(),
  getApiKeys: vi.fn(),
  createApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
  getUsage: vi.fn(),
  getStats: vi.fn(),
  signup: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
  apiPatch: vi.fn(),
}));

function renderWith(ui) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const items = {
  success: true,
  items: [{ key: 'user:42', size: 256, ttlRemaining: 285, createdAt: '2026-11-15T20:00:00.000Z' }],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  api.getMe.mockResolvedValue({ success: true, user: { id: '1', email: 'dev@example.com', plan: 'free' } });
  api.getApiKeys.mockResolvedValue({ success: true, keys: [] });
});

describe('Cached Items redesign', () => {
  it('custom TTL validates input and sends seconds to the existing API', async () => {
    api.getItems.mockResolvedValue(items);
    api.updateItemTtl.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    renderWith(<CachedItems />);
    const row = (await screen.findByText('user:42')).closest('tr');
    await user.click(within(row).getByRole('button', { name: /edit ttl/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/current ttl/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Custom' }));
    const input = within(dialog).getByLabelText(/custom ttl \(seconds\)/i);
    const confirm = within(dialog).getByRole('button', { name: /update ttl/i });
    expect(confirm).toBeDisabled();
    await user.type(input, '0');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(confirm).toBeDisabled();
    await user.clear(input);
    await user.type(input, '5400');
    expect(within(dialog).getByText('≈ 1h 30m')).toBeInTheDocument();
    await user.click(confirm);
    await waitFor(() => expect(api.updateItemTtl).toHaveBeenCalledWith('user:42', 5400));
  });

  it('sortable column headers drive the server-side query', async () => {
    api.getItems.mockResolvedValue(items);
    const user = userEvent.setup();
    renderWith(<CachedItems />);
    await screen.findByText('user:42');
    await user.click(screen.getByRole('button', { name: /^size/i }));
    await waitFor(() =>
      expect(api.getItems).toHaveBeenCalledWith(expect.objectContaining({ sort: 'size', order: 'desc' }))
    );
    expect(screen.getByRole('columnheader', { name: /size/i })).toHaveAttribute('aria-sort', 'descending');
  });

  it('shows a mutation failure inside the delete dialog', async () => {
    api.getItems.mockResolvedValue(items);
    api.deleteItem.mockRejectedValue(Object.assign(new Error('x'), { body: { message: 'Redis unavailable' } }));
    const user = userEvent.setup();
    renderWith(<CachedItems />);
    const row = (await screen.findByText('user:42')).closest('tr');
    await user.click(within(row).getByRole('button', { name: /^delete$/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Redis unavailable');
  });
});

describe('Integrate Test Connection stepper', () => {
  it('reflects real step outcomes and skips cleanup when PUT fails', async () => {
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ message: 'Invalid API key' }),
      headers: { get: () => null },
    }));
    const user = userEvent.setup();
    renderWith(<Integrate />);
    await user.type(await screen.findByLabelText(/api key \(paste or create above\)/i), 'caas_live_abc');
    await user.click(screen.getByRole('button', { name: /^test connection$/i }));
    const progress = await screen.findByRole('list', { name: /probe progress/i });
    await waitFor(() => expect(within(progress).getAllByText('Failed')).toHaveLength(1));
    expect(within(progress).getAllByText('Skipped')).toHaveLength(3);
    expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps the test key masked by default with a show/hide control', async () => {
    const user = userEvent.setup();
    renderWith(<Integrate />);
    const input = await screen.findByLabelText(/api key \(paste or create above\)/i);
    expect(input).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: /show test key/i }));
    expect(input).toHaveAttribute('type', 'text');
  });

  it('language tabs support arrow-key navigation', async () => {
    const user = userEvent.setup();
    renderWith(<Integrate />);
    const js = await screen.findByRole('tab', { name: 'JavaScript' });
    js.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Python' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Python' })).toHaveFocus();
  });

  it('describes cleanup-in-finally with a safety TTL', async () => {
    renderWith(<Integrate />);
    expect(await screen.findByText(/including when GET or the value comparison fails/i)).toBeInTheDocument();
    expect(screen.getByText(/60-second safety TTL/i)).toBeInTheDocument();
  });
});

describe('Usage thresholds are independent per quota', () => {
  it('can show OK, Warning and Critical at the same time', async () => {
    api.getUsage.mockResolvedValue({
      success: true,
      plan: { name: 'free', requestsPerMinute: 100, requestsPerMonth: 10000, maxItems: 1000 },
      usage: {
        minuteUsed: 10, minuteLimit: 100, minuteRemaining: 90,
        monthlyUsed: 7500, monthlyLimit: 10000, monthlyRemaining: 2500,
        cachedItems: 950, maxItems: 1000,
      },
      reset: { minute: Math.floor(Date.now() / 1000) + 30, monthly: '2026-12-01T00:00:00.000Z' },
    });
    renderWith(<Usage />);
    expect(await screen.findByText('OK')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    const bars = screen.getAllByRole('progressbar');
    expect(bars.map((b) => b.getAttribute('aria-valuenow'))).toEqual(['10', '75', '95']);
  });
});

describe('OneTimeSecret', () => {
  it('masks by default, reveals on demand and dismisses', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const secret = 'caas_live_0123456789abcdef0123456789';
    render(<OneTimeSecret secret={secret} onDismiss={onDismiss} />);
    const input = screen.getByLabelText('New API key secret');
    expect(input.value).not.toBe(secret);
    expect(input.value.startsWith('caas_live_01')).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Show API key' }));
    expect(input.value).toBe(secret);
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('Home page', () => {
  it('has no leftover phase placeholder copy and shows live health', async () => {
    api.getMe.mockRejectedValue(Object.assign(new Error('unauth'), { status: 401 }));
    api.apiGet.mockResolvedValue({ status: 'ok', latencyMs: 2 });
    renderWith(<Home />);
    expect(await screen.findByRole('heading', { name: /backend health/i })).toBeInTheDocument();
    expect(screen.queryByText(/phase 1|coming soon|next steps/i)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Operational')).toHaveLength(3));
  });
});

describe('Theme utilities', () => {
  it('keeps the existing storage key and resolves system via matchMedia', () => {
    setStoredTheme('dark');
    expect(localStorage.getItem('caas_theme')).toBe('dark');
    expect(getStoredTheme()).toBe('dark');
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    applyTheme('system'); // mocked matchMedia → light
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    localStorage.setItem('caas_theme', 'nonsense');
    expect(getStoredTheme()).toBe('system');
  });

  it('follows OS changes only while preference is system', () => {
    const listeners = [];
    const original = window.matchMedia;
    let dark = false;
    window.matchMedia = () => ({
      get matches() {
        return dark;
      },
      addEventListener: (_e, fn) => listeners.push(fn),
      removeEventListener: () => {},
    });
    try {
      const stop = watchSystemTheme();
      localStorage.setItem('caas_theme', 'system');
      dark = true;
      listeners.forEach((fn) => fn());
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      localStorage.setItem('caas_theme', 'light');
      applyTheme('light');
      dark = true;
      listeners.forEach((fn) => fn());
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      stop();
    } finally {
      window.matchMedia = original;
    }
  });
});
