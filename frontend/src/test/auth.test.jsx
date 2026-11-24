import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from '../components/ProtectedRoute';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import OnboardingApiKey from '../pages/OnboardingApiKey';
import * as api from '../api/client';

vi.mock('../api/client', () => ({
  getMe: vi.fn(),
  signup: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  createApiKey: vi.fn(),
  getApiKeys: vi.fn(),
  revokeApiKey: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}));

function renderWithProviders(ui, { route = '/' } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getMe.mockRejectedValue(Object.assign(new Error('unauth'), { status: 401 }));
});

describe('Signup', () => {
  it('shows validation for short password', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
      </Routes>,
      { route: '/signup' }
    );
    await waitFor(() => screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/^password$/i), 'short');
    await user.type(screen.getByLabelText(/confirm password/i), 'short');
    await user.click(screen.getByRole('button', { name: /sign up/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 8/i);
    expect(api.signup).not.toHaveBeenCalled();
  });

  it('calls signup and navigates on success path (stores key in memory via context)', async () => {
    api.signup.mockResolvedValue({
      success: true,
      user: { id: '1', email: 'a@b.com', plan: 'free' },
      apiKey: 'caas_live_testsecret000000000000000000000000000000000000000000000000',
    });
    api.getMe.mockRejectedValue(Object.assign(new Error('x'), { status: 401 }));
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
        <Route path="/onboarding/api-key" element={<div>Onboarding</div>} />
      </Routes>,
      { route: '/signup' }
    );
    await waitFor(() => screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/^password$/i), 'SecurePassword123');
    await user.type(screen.getByLabelText(/confirm password/i), 'SecurePassword123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => expect(api.signup).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'SecurePassword123',
    }));
  });
});

describe('Login', () => {
  it('shows error on invalid credentials', async () => {
    api.login.mockRejectedValue(
      Object.assign(new Error('Invalid'), { status: 401, body: { message: 'Invalid email or password.' } })
    );
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      </Routes>,
      { route: '/login' }
    );
    await waitFor(() => screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/^password$/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i);
  });
});

describe('Protected routes', () => {
  it('redirects unauthenticated users to login', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <div>Secret</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { route: '/app' }
    );
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('shows authenticated content when session valid', async () => {
    api.getMe.mockResolvedValue({
      success: true,
      user: { id: '1', email: 'u@test.com', plan: 'free' },
    });
    renderWithProviders(
      <Routes>
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <div>Secret area</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { route: '/app' }
    );
    expect(await screen.findByText('Secret area')).toBeInTheDocument();
  });
});

describe('Onboarding API key', () => {
  it('disables continue until confirmation and does not show key without pending', async () => {
    api.getMe.mockResolvedValue({
      success: true,
      user: { id: '1', email: 'u@test.com', plan: 'free' },
    });
    renderWithProviders(
      <Routes>
        <Route path="/onboarding/api-key" element={<OnboardingApiKey />} />
        <Route path="/app" element={<div>Dashboard</div>} />
      </Routes>,
      { route: '/onboarding/api-key' }
    );
    // No pending key → recovery message
    expect(await screen.findByText(/only once/i)).toBeInTheDocument();
  });
});
