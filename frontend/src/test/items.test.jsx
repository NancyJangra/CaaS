import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import CachedItems from '../pages/CachedItems';
import { AuthProvider } from '../context/AuthContext';
import * as api from '../api/client';

vi.mock('../api/client', () => ({
  getMe: vi.fn(),
  getItems: vi.fn(),
  updateItemTtl: vi.fn(),
  deleteItem: vi.fn(),
  clearAllItems: vi.fn(),
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
  apiPatch: vi.fn(),
}));

const sample = {
  success: true,
  items: [
    {
      key: 'user:42',
      size: 256,
      ttlRemaining: 285,
      createdAt: '2026-11-15T20:00:00.000Z',
    },
    {
      key: 'session:abc',
      size: 1024,
      ttlRemaining: 60,
      createdAt: '2026-11-15T19:00:00.000Z',
    },
  ],
  pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
};

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>
          <CachedItems />
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

describe('CachedItems', () => {
  it('renders API items', async () => {
    api.getItems.mockResolvedValue(sample);
    renderPage();
    expect(await screen.findByText('user:42')).toBeInTheDocument();
    expect(screen.getByText('session:abc')).toBeInTheDocument();
    expect(screen.getByText(/2 items/i)).toBeInTheDocument();
  });

  it('shows empty cache message', async () => {
    api.getItems.mockResolvedValue({
      success: true,
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    });
    renderPage();
    expect(await screen.findByText(/cache is empty/i)).toBeInTheDocument();
  });

  it('shows empty search results', async () => {
    api.getItems.mockResolvedValue({
      success: true,
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByPlaceholderText(/search by key/i);
    await user.type(screen.getByPlaceholderText(/search by key/i), 'zzz');
    await waitFor(() =>
      expect(api.getItems).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'zzz', page: 1 })
      )
    );
  });

  it('loads error state', async () => {
    api.getItems.mockRejectedValue(new Error('fail'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load items/i);
  });

  it('Clear All requires typing CLEAR', async () => {
    api.getItems.mockResolvedValue(sample);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('user:42');
    await user.click(screen.getByRole('button', { name: /clear all/i }));
    const dialog = screen.getByRole('dialog');
    const confirmBtn = within(dialog).getByRole('button', { name: /clear all items/i });
    expect(confirmBtn).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/type clear/i), 'CLEAR');
    await waitFor(() => expect(confirmBtn).not.toBeDisabled());
  });

  it('delete confirms and calls API', async () => {
    api.getItems.mockResolvedValue(sample);
    api.deleteItem.mockResolvedValue({ success: true, deleted: true, key: 'user:42' });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('user:42');
    const row = screen.getByText('user:42').closest('tr');
    await user.click(within(row).getByRole('button', { name: /^delete$/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(api.deleteItem).toHaveBeenCalledWith('user:42'));
  });

  it('TTL update uses preset seconds', async () => {
    api.getItems.mockResolvedValue(sample);
    api.updateItemTtl.mockResolvedValue({ success: true, key: 'user:42', ttl: 60 });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('user:42');
    const row = screen.getByText('user:42').closest('tr');
    await user.click(within(row).getByRole('button', { name: /edit ttl/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /1 minute/i }));
    await user.click(within(dialog).getByRole('button', { name: /update ttl/i }));
    await waitFor(() =>
      expect(api.updateItemTtl).toHaveBeenCalledWith('user:42', 60)
    );
  });
});
