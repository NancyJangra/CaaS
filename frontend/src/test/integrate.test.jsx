import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Integrate from '../pages/Integrate';
import { AuthProvider } from '../context/AuthContext';
import * as api from '../api/client';

vi.mock('../api/client', () => ({
  getMe: vi.fn(),
  getApiKeys: vi.fn(),
  createApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
  getUsage: vi.fn(),
  getItems: vi.fn(),
  getStats: vi.fn(),
  signup: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  updateItemTtl: vi.fn(),
  deleteItem: vi.fn(),
  clearAllItems: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
  apiPatch: vi.fn(),
}));

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>
          <Integrate />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function mockFetchSequence(handlers) {
  let i = 0;
  global.fetch = vi.fn(async (url, opts) => {
    const handler = handlers[i++];
    if (!handler) {
      throw new Error(`Unexpected fetch #${i} ${opts?.method} ${url}`);
    }
    return handler(url, opts);
  });
}

function logText() {
  return screen
    .queryAllByRole('listitem')
    .map((el) => el.textContent)
    .join('\n');
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
  api.getMe.mockResolvedValue({
    success: true,
    user: { id: '1', email: 'dev@example.com', plan: 'free' },
  });
  api.getApiKeys.mockResolvedValue({
    success: true,
    keys: [
      {
        id: 'k1',
        prefix: 'caas_live_ab12',
        keyPrefix: 'caas_live_ab12',
        label: 'Production',
        createdAt: '2026-11-01T00:00:00.000Z',
        revoked: false,
      },
    ],
  });
});

describe('Integrate page', () => {
  it('renders getting started and API key metadata', async () => {
    renderPage();
    expect(await screen.findByText(/Integrate CaaS/i)).toBeInTheDocument();
    expect(await screen.findByText(/Production/i)).toBeInTheDocument();
    expect(screen.getAllByText(/caas_live_ab12/i).length).toBeGreaterThan(0);
  });

  it('switches language tabs and shows code', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/Integrate CaaS/i);
    expect(screen.getByText(/process.env.CAAS_API_KEY/i)).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /python/i }));
    expect(await screen.findByText(/import requests/i)).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /curl/i }));
    expect(screen.getAllByText(/x-api-key/i).length).toBeGreaterThan(0);
  });

  it('creates a key and shows one-time secret', async () => {
    api.createApiKey.mockResolvedValue({
      success: true,
      key: { id: 'n1', keyPrefix: 'caas_live_zz', label: 'Integrate' },
      apiKey: 'caas_live_secret_only_once_0123456789abcdef',
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/Production/i);
    await user.click(screen.getByRole('button', { name: /create new api key/i }));
    expect(await screen.findByText(/will not be shown again/i)).toBeInTheDocument();
    expect(api.createApiKey).toHaveBeenCalled();
  });

  it('test connection requires a key', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('button', { name: /^test connection$/i });
    await user.click(screen.getByRole('button', { name: /^test connection$/i }));
    expect(await screen.findByText(/enter or create an api key/i)).toBeInTheDocument();
  });

  it('documents 404 miss and rate limits', async () => {
    renderPage();
    await screen.findByText(/Troubleshooting/i);
    expect(screen.getAllByText(/X-Cache: MISS/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/429/i).length).toBeGreaterThan(0);
  });
});

describe('Test connection hardening', () => {
  async function startTest(user) {
    renderPage();
    const keyInput = await screen.findByLabelText(/api key \(paste or create above\)/i);
    await user.type(keyInput, 'caas_live_testkey_abcdefghijklmnop');
    await user.click(screen.getByRole('button', { name: /^test connection$/i }));
  }

  it('successful probe uses safety TTL and cleans up', async () => {
    const user = userEvent.setup();
    let putBody;
    mockFetchSequence([
      async (_url, opts) => {
        putBody = JSON.parse(opts.body);
        expect(putBody.ttl).toBe(60);
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, ttl: 60 }),
          headers: { get: () => null },
        };
      },
      async () => ({
        ok: true,
        status: 200,
        json: async () => ({ cached: true, value: putBody.value }),
        headers: { get: (n) => (n === 'X-Cache' ? 'HIT' : null) },
      }),
      async () => ({
        ok: true,
        status: 200,
        json: async () => ({ success: true, deleted: true }),
        headers: { get: () => null },
      }),
    ]);
    await startTest(user);
    await waitFor(() => expect(logText()).toMatch(/connection test passed/i));
    expect(logText()).toMatch(/Cleanup successful/i);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('PUT failure does not attempt cleanup DELETE', async () => {
    const user = userEvent.setup();
    mockFetchSequence([
      async () => ({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Invalid API key' }),
        headers: { get: () => null },
      }),
    ]);
    await startTest(user);
    await waitFor(() => expect(logText()).toMatch(/PUT failed/i));
    expect(logText()).toMatch(/connection test failed/i);
    expect(global.fetch.mock.calls.length).toBe(1);
  });

  it('GET failure after PUT still runs cleanup', async () => {
    const user = userEvent.setup();
    mockFetchSequence([
      async () => ({
        ok: true,
        status: 200,
        json: async () => ({ success: true, ttl: 60 }),
        headers: { get: () => null },
      }),
      async () => ({
        ok: false,
        status: 500,
        statusText: 'Error',
        json: async () => ({ message: 'Server error' }),
        headers: { get: () => null },
      }),
      async () => ({
        ok: true,
        status: 200,
        json: async () => ({ success: true, deleted: true }),
        headers: { get: () => null },
      }),
    ]);
    await startTest(user);
    await waitFor(() => expect(logText()).toMatch(/GET failed/i));
    expect(logText()).toMatch(/Cleanup successful/i);
    expect(logText()).toMatch(/connection test failed/i);
    expect(global.fetch.mock.calls.length).toBe(3);
  });

  it('value mismatch still runs cleanup and fails overall', async () => {
    const user = userEvent.setup();
    mockFetchSequence([
      async () => ({
        ok: true,
        status: 200,
        json: async () => ({ success: true, ttl: 60 }),
        headers: { get: () => null },
      }),
      async () => ({
        ok: true,
        status: 200,
        json: async () => ({ cached: true, value: { wrong: true } }),
        headers: { get: (n) => (n === 'X-Cache' ? 'HIT' : null) },
      }),
      async () => ({
        ok: true,
        status: 200,
        json: async () => ({ success: true, deleted: true }),
        headers: { get: () => null },
      }),
    ]);
    await startTest(user);
    await waitFor(() => expect(logText()).toMatch(/Value comparison failed/i));
    expect(logText()).toMatch(/Cleanup successful/i);
    expect(logText()).not.toMatch(/Overall result: connection test passed/i);
  });

  it('cleanup failure is reported even when probe succeeded', async () => {
    const user = userEvent.setup();
    let putBody;
    mockFetchSequence([
      async (_url, opts) => {
        putBody = JSON.parse(opts.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, ttl: 60 }),
          headers: { get: () => null },
        };
      },
      async () => ({
        ok: true,
        status: 200,
        json: async () => ({ cached: true, value: putBody.value }),
        headers: { get: (n) => (n === 'X-Cache' ? 'HIT' : null) },
      }),
      async () => ({
        ok: false,
        status: 500,
        statusText: 'Error',
        json: async () => ({ message: 'delete failed' }),
        headers: { get: () => null },
      }),
    ]);
    await startTest(user);
    await waitFor(() => expect(logText()).toMatch(/Cleanup failed/i));
    expect(logText()).toMatch(/probe succeeded but cleanup failed/i);
    expect(logText()).not.toMatch(/Overall result: connection test passed/i);
  });

  it('unexpected exception after PUT still attempts cleanup', async () => {
    const user = userEvent.setup();
    mockFetchSequence([
      async () => ({
        ok: true,
        status: 200,
        json: async () => ({ success: true, ttl: 60 }),
        headers: { get: () => null },
      }),
      async () => {
        throw new Error('network dropped');
      },
      async () => ({
        ok: true,
        status: 200,
        json: async () => ({ success: true, deleted: true }),
        headers: { get: () => null },
      }),
    ]);
    await startTest(user);
    await waitFor(() => expect(logText()).toMatch(/Unexpected error: network dropped/i));
    expect(logText()).toMatch(/Cleanup successful/i);
  });

  it('disables button while testing (duplicate-click prevention)', async () => {
    const user = userEvent.setup();
    let resolvePut;
    mockFetchSequence([
      () =>
        new Promise((resolve) => {
          resolvePut = () =>
            resolve({
              ok: true,
              status: 200,
              json: async () => ({ success: true, ttl: 60 }),
              headers: { get: () => null },
            });
        }),
      async () => ({
        ok: true,
        status: 200,
        json: async () => ({ cached: true, value: { probe: true } }),
        headers: { get: () => null },
      }),
      async () => ({
        ok: true,
        status: 200,
        json: async () => ({ success: true, deleted: true }),
        headers: { get: () => null },
      }),
    ]);
    renderPage();
    const keyInput = await screen.findByLabelText(/api key \(paste or create above\)/i);
    await user.type(keyInput, 'caas_live_testkey_abcdefghijklmnop');
    const btn = screen.getByRole('button', { name: /^test connection$/i });
    await user.click(btn);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /testing/i })).toBeDisabled()
    );
    await user.click(screen.getByRole('button', { name: /testing/i }));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    resolvePut();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^test connection$/i })).not.toBeDisabled()
    );
  });
});
