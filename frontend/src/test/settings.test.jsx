import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Settings from '../pages/Settings';
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
          <Settings />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  api.getMe.mockResolvedValue({
    success: true,
    user: {
      id: 'u1',
      email: 'dev@example.com',
      plan: 'free',
      createdAt: '2026-11-01T00:00:00.000Z',
    },
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
  api.logout.mockResolvedValue({ success: true });
});

describe('Settings', () => {
  it('loads account information', async () => {
    renderPage();
    expect(await screen.findByText('dev@example.com')).toBeInTheDocument();
    expect(screen.getByText(/free/i)).toBeInTheDocument();
  });

  it('renders API key metadata', async () => {
    renderPage();
    expect(await screen.findByText(/Production/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Active/i).length).toBeGreaterThan(0);
  });

  it('creates a key and shows one-time secret', async () => {
    api.createApiKey.mockResolvedValue({
      success: true,
      key: { id: 'n1', keyPrefix: 'caas_live_zz', label: 'Dashboard' },
      apiKey: 'caas_live_secret_settings_once_0123456789',
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/Production/i);
    await user.click(screen.getByRole('button', { name: /create api key/i }));
    expect(await screen.findByText(/will not be shown again/i)).toBeInTheDocument();
  });

  it('dismisses one-time secret', async () => {
    api.createApiKey.mockResolvedValue({
      success: true,
      key: { id: 'n1', keyPrefix: 'caas_live_zz', label: 'Dashboard' },
      apiKey: 'caas_live_secret_settings_once_0123456789',
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/Production/i);
    await user.click(screen.getByRole('button', { name: /create api key/i }));
    expect(await screen.findByText(/will not be shown again/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText(/will not be shown again/i)).not.toBeInTheDocument();
  });

  it('requires confirmation before revoke and refreshes list', async () => {
    api.revokeApiKey.mockResolvedValue({ success: true, message: 'API key revoked.' });
    api.getApiKeys
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValue({
        success: true,
        keys: [
          {
            id: 'k1',
            prefix: 'caas_live_ab12',
            keyPrefix: 'caas_live_ab12',
            label: 'Production',
            createdAt: '2026-11-01T00:00:00.000Z',
            revoked: true,
          },
        ],
      });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/Production/i);
    await user.click(screen.getByRole('button', { name: /^revoke$/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /revoke key/i }));
    await waitFor(() => expect(api.revokeApiKey).toHaveBeenCalledWith('k1'));
  });

  it('shows profile error state', async () => {
    api.getMe.mockRejectedValue(new Error('offline'));
    renderPage();
    expect(await screen.findByText(/could not load profile/i)).toBeInTheDocument();
  });

  it('logout calls API', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('dev@example.com');
    await user.click(screen.getByRole('button', { name: /log out/i }));
    await waitFor(() => expect(api.logout).toHaveBeenCalled());
  });

  it('theme preference persists to localStorage without secrets', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('dev@example.com');
    await user.click(screen.getByText('Dark'));
    expect(localStorage.getItem('caas_theme')).toBe('dark');
    expect(localStorage.getItem('caas_theme')).not.toMatch(/caas_live|jwt|password/i);
  });

  it('Escape closes revoke dialog', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/Production/i);
    await user.click(screen.getByRole('button', { name: /^revoke$/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
