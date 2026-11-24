import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-fg-muted">
        <div className="text-center" role="status" aria-live="polite">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-line-strong border-t-brand" />
          Checking session…
        </div>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export function PublicOnlyRoute({ children }) {
  const { status, pendingApiKey } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-fg-muted">
        <div role="status" aria-live="polite">Loading…</div>
      </div>
    );
  }

  // Allow authenticated users who still need to save a one-time API key
  if (status === 'authenticated' && !pendingApiKey) {
    return <Navigate to="/app" replace />;
  }

  return children;
}
