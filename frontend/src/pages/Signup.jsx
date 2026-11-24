import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/ui/Button';
import { Notice, inputClass, labelClass } from '../components/ui/primitives';
import { IconEye, IconEyeOff, IconCheck } from '../components/ui/Icons';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await signup({ email: email.trim(), password });
      navigate('/onboarding/api-key', { replace: true });
    } catch (err) {
      setError(err.body?.message || err.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  }

  const lengthOk = password.length >= 8;
  const matchOk = confirm.length > 0 && password === confirm;

  return (
    <AuthLayout>
      <div>
        <div className="mb-7">
            <video src="/videos/intro.mp4" className="w-full mb-4" controls />
          <h1 className="text-[30px] font-bold leading-[1.15] text-fg sm:text-[34px]">Keep your cache in one place</h1>
          <p className="mt-2 text-[14px] text-fg-muted">Create a CaaS account. Your first API key is made with it and shown once on the next screen.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && (
            <Notice tone="danger" role="alert">
              {error}
            </Notice>
          )}
          <div>
            <label htmlFor="signup-email" className={labelClass}>
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="signup-password" className={labelClass}>
              Password
            </label>
            <div className="relative">
              <input
                id="signup-password"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby="signup-password-rules"
                className={`${inputClass} pr-11`}
                required
                minLength={8}
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
          <div>
            <label htmlFor="signup-confirm" className={labelClass}>
              Confirm password
            </label>
            <input
              id="signup-confirm"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <ul id="signup-password-rules" className="space-y-0.5 text-[13px]">
            {[
              { ok: lengthOk, text: 'At least 8 characters' },
              { ok: matchOk, text: 'Passwords match' },
            ].map((r) => (
              <li key={r.text} className={`flex items-center gap-1.5 ${r.ok ? 'text-success-fg' : 'text-fg-muted'}`}>
                <span
                  className="flex h-3.5 w-3.5 items-center justify-center"
                  aria-hidden
                >
                  {r.ok ? <IconCheck className="h-3.5 w-3.5" strokeWidth={2.5} /> : <span className="h-1 w-1 rounded-full bg-fg-subtle" />}
                </span>
                {r.text}
                <span className="sr-only">{r.ok ? '(met)' : '(not met)'}</span>
              </li>
            ))}
          </ul>
          <Button type="submit" variant="ink" size="lg" loading={loading} className="h-11 w-full">
            {loading ? 'Creating account…' : 'Sign up'}
          </Button>
        </form>
      </div>
      <p className="mt-6 text-sm text-fg-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-fg underline underline-offset-2">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
