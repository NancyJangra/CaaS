import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import { AuthProvider } from '../context/AuthContext';
import * as api from '../api/client';

vi.mock('../api/client', () => ({
  getMe: vi.fn(),
  getStats: vi.fn(),
  signup: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  createApiKey: vi.fn(),
  getApiKeys: vi.fn(),
  revokeApiKey: vi.fn(),
  getUsage: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}));

const sampleStats = {
  success: true,
  range: '24h',
  summary: {
    totalRequests: 120,
    hits: 80,
    misses: 20,
    hitRate: 80,
    averageHitLatencyMs: 2.5,
    averageMissLatencyMs: 40.1,
    p50LatencyMs: 5,
    p95LatencyMs: 45,
  },
  series: [
    {
      timestamp: '2026-11-15T20:00:00.000Z',
      hits: 10,
      misses: 2,
      hitLatencyMs: 2,
      missLatencyMs: 30,
    },
    {
      timestamp: '2026-11-15T21:00:00.000Z',
      hits: 0,
      misses: 0,
      hitLatencyMs: 0,
      missLatencyMs: 0,
    },
  ],
};

function renderDashboard() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>
          <Dashboard />
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

describe('Dashboard', () => {
  it('renders KPIs from stats response', async () => {
    api.getStats.mockResolvedValue(sampleStats);
    renderDashboard();
    expect(await screen.findByText('120')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getAllByText(/80 hits/i).length).toBeGreaterThan(0);
    expect(api.getStats).toHaveBeenCalledWith('24h');
  });

  it('switches range to 1h and 7d', async () => {
    api.getStats.mockResolvedValue(sampleStats);
    const user = userEvent.setup();
    renderDashboard();
    await screen.findByText('120');
    await user.click(screen.getByRole('button', { name: /1 hour/i }));
    await waitFor(() => expect(api.getStats).toHaveBeenCalledWith('1h'));
    await user.click(screen.getByRole('button', { name: /7 days/i }));
    await waitFor(() => expect(api.getStats).toHaveBeenCalledWith('7d'));
  });

  it('shows loading then data', async () => {
    let resolve;
    api.getStats.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    renderDashboard();
    expect(screen.getByText(/loading analytics/i)).toBeInTheDocument();
    resolve(sampleStats);
    expect(await screen.findByText('120')).toBeInTheDocument();
  });

  it('shows empty state when all zeros', async () => {
    api.getStats.mockResolvedValue({
      success: true,
      range: '24h',
      summary: {
        totalRequests: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        averageHitLatencyMs: 0,
        averageMissLatencyMs: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
      },
      series: [],
    });
    renderDashboard();
    expect(await screen.findByText(/no admitted api requests/i)).toBeInTheDocument();
  });

  it('shows error with retry when fetch fails and no data', async () => {
    api.getStats.mockRejectedValue(new Error('Network down'));
    renderDashboard();
    expect(await screen.findByText(/could not load dashboard stats/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
