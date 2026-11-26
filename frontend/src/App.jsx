import { lazy, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import AppShell from './layouts/AppShell';
import Login from './pages/Login';
import Signup from './pages/Signup';
import OnboardingApiKey from './pages/OnboardingApiKey';
import Home from './pages/Home';
import { HomeSplash } from './pages/Home'; // correctly import named splash component

// Authenticated pages are code‑split; AppShell renders a Suspense skeleton.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CachedItems = lazy(() => import('./pages/CachedItems'));
const Usage = lazy(() => import('./pages/Usage'));
const Integrate = lazy(() => import('./pages/Integrate'));
const Settings = lazy(() => import('./pages/Settings'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5000 },
  },
});

export default function App() {
  const [showIntro, setShowIntro] = useState(() => window.location.pathname !== '/');

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {/* Global splash – plays once on initial load */}
          {showIntro && <HomeSplash setShowIntro={setShowIntro} />}
          {/* Render the rest of the app once the splash is dismissed */}
          {!showIntro && (
            <Routes>
              <Route path="/" element={<Home />} />
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <Login />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicOnlyRoute>
                    <Signup />
                  </PublicOnlyRoute>
                }
              />
              <Route path="/onboarding/api-key" element={<OnboardingApiKey />} />
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="items" element={<CachedItems />} />
                <Route path="usage" element={<Usage />} />
                <Route path="integrate" element={<Integrate />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
