import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Usage from '../pages/Usage';
import { AuthProvider } from '../context/AuthContext';
import * as api from '../api/client';

vi.mock('../api/client', () => ({
  getMe: vi.fn(),
  getUsage: vi.fn(),
  getItems: vi.fn(),
  getStats: vi.fn(),
  signup: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  createApiKey: vi.fn(),
  getApiKeys: vi.fn(),
  revokeApiKey: vi.fn(),
  updateItemTtl: vi.fn(),
  deleteItem: vi.fn(),
  clearAllItems: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
  apiPatch: vi.fn(),
}));

const sample = {
  success: true,
  plan: {
    name: 'free',
    requestsPerMinute: 100,
    requestsPerMonth: 10000,
    maxItems: 1000,
  },
  usage: {
    minuteUsed: 28,
    minuteLimit: 100,
    minuteRemaining: 72,
    monthlyUsed: 2500,
    monthlyLimit: 10000,
    monthlyRemaining: 7500,
    cachedItems: 120,
    maxItems: 1000,
  },
  reset: {
    minute: Math.floor(Date.now() / 1000) + 45,
    monthly: '2026-12-01T00:00:00.000Z',
  },
};

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>
          <Usage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getMe.mockResolvedValue({
    success: true,
    user: { id: '1', email: 'dev@example.com', plan: 'free' },
  });
});

describe('Usage page', () => {
  it('renders plan and usage numbers from API', async () => {
    api.getUsage.mockResolvedValue(sample);
    renderPage();
    expect(await screen.findByText(/free/i)).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.getByText('2500')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText(/72 remaining/i)).toBeInTheDocument();
  });

  it('shows neutral status below 70%', async () => {
    api.getUsage.mockResolvedValue(sample); // monthly 25%, items 12%
    renderPage();
    await screen.findByText(/free/i);
    const oks = screen.getAllByText('OK');
    expect(oks.length).toBeGreaterThanOrEqual(2);
  });

  it('shows amber warning at 70–89%', async () => {
    api.getUsage.mockResolvedValue({
      ...sample,
      usage: {
        ...sample.usage,
        monthlyUsed: 7500,
        monthlyRemaining: 2500,
        cachedItems: 800,
        maxItems: 1000,
      },
    });
    renderPage();
    expect(await screen.findByText('7500')).toBeInTheDocument();
    expect(screen.getAllByText('Warning').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/more than 70%/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows critical at 90%+', async () => {
    api.getUsage.mockResolvedValue({
      ...sample,
      usage: {
        ...sample.usage,
        monthlyUsed: 9500,
        monthlyRemaining: 500,
        cachedItems: 950,
        maxItems: 1000,
      },
    });
    renderPage();
    expect(await screen.findByText('9500')).toBeInTheDocument();
    expect(screen.getAllByText('Critical').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/near or at this limit/i).length).toBeGreaterThanOrEqual(1);
  });

  it('handles zero usage', async () => {
    api.getUsage.mockResolvedValue({
      ...sample,
      usage: {
        minuteUsed: 0,
        minuteLimit: 100,
        minuteRemaining: 100,
        monthlyUsed: 0,
        monthlyLimit: 10000,
        monthlyRemaining: 10000,
        cachedItems: 0,
        maxItems: 1000,
      },
    });
    renderPage();
    expect(await screen.findByText(/100 remaining/i)).toBeInTheDocument();
    expect(screen.getAllByText(/0% used/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows loading then data', async () => {
    let resolve;
    api.getUsage.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderPage();
    expect(screen.getByText(/loading usage/i)).toBeInTheDocument();
    resolve(sample);
    expect(await screen.findByText('28')).toBeInTheDocument();
  });

  it('shows error with retry', async () => {
    api.getUsage.mockRejectedValue(new Error('Network down'));
    renderPage();
    expect(await screen.findByText(/could not load usage/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('manual refresh calls getUsage again', async () => {
    api.getUsage.mockResolvedValue(sample);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('28');
    const calls = api.getUsage.mock.calls.length;
    await user.click(screen.getByRole('button', { name: /^refresh$/i }));
    await waitFor(() => expect(api.getUsage.mock.calls.length).toBeGreaterThan(calls));
  });

  it('formats monthly reset as UTC', async () => {
    api.getUsage.mockResolvedValue(sample);
    renderPage();
    expect(await screen.findByText(/UTC calendar month/i)).toBeInTheDocument();
  });
});
