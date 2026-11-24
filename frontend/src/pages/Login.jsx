import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/ui/Button';
import { Notice, inputClass, labelClass } from '../components/ui/primitives';
import { IconEye, IconEyeOff } from '../components/ui/Icons';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/app';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      if (err.status === 429) {
        setError(err.body?.message || 'Too many attempts. Please wait and try again.');
      } else {
        setError(err.body?.message || err.message || 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div>
        <div className="mb-7">
          <h1 className="text-[30px] font-bold leading-[1.15] text-fg sm:text-[34px]">Welcome back to your cache</h1>
          <p className="mt-2 text-[14px] text-fg-muted">Log in to CaaS to see your keys, usage and live cache performance.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && (
            <Notice tone="danger" role="alert">
              {error}
            </Notice>
          )}
          <div>
            <label htmlFor="login-email" className={labelClass}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!error && !email.trim()}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="login-password" className={labelClass}>
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!error && !password}
                className={`${inputClass} pr-11`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-fg-muted hover:bg-surface-2 hover:text-fg"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" variant="ink" size="lg" loading={loading} className="h-11 w-full">
            {loading ? 'Signing in…' : 'Log in'}
          </Button>
        </form>
      </div>
      <p className="mt-6 text-sm text-fg-muted">
        New here?{' '}
        <Link to="/signup" className="font-medium text-brand-fg underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
