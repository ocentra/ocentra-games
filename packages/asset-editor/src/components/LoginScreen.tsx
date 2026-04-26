import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { WindowControls } from '@/components/WindowControls';
import { canUseDevMockAdmin, setDevAuthSessionOverride } from '@/utils/devAuth';
import './LoginScreen.css';

export function LoginScreen() {
  const { login, loginWithGoogle, isFirebaseConfigured } = useAuth();
  const allowDevMockAdmin = canUseDevMockAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);
    if (!result.success) setError(result.error ?? 'Login failed');
  };

  const handleGoogle = async () => {
    setError('');
    setIsLoading(true);
    const result = await loginWithGoogle();
    setIsLoading(false);
    if (!result.success) setError(result.error ?? 'Google login failed');
  };

  return (
    <div
      className="login-screen"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: '#0f1117',
        color: '#e2e8f0',
      }}
    >
      <div className="login-screen__header" style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 4px 0 0' }}>
        <WindowControls />
      </div>
      <div className="login-screen__body" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        className="login-screen__card"
        style={{
          background: '#1a1d27',
          border: '1px solid #2a2d3e',
          borderRadius: 8,
          padding: '2rem',
          maxWidth: 360,
        }}
      >
        <h1 className="login-screen__title">Asset Editor</h1>
        <p className="login-screen__subtitle">Admin access required</p>
        {!isFirebaseConfigured && (
          <p className="login-screen__error" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
            Firebase not configured. Add VITE_FIREBASE_API_KEY (and other VITE_FIREBASE_*) to <code>.env</code> or <code>.env.local</code> to sign in.
          </p>
        )}

        <form className="login-screen__form" onSubmit={handleSubmit}>
          <input
            className="login-screen__input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className="login-screen__input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && <p className="login-screen__error">{error}</p>}
          <button
            className="login-screen__button login-screen__button--primary"
            type="submit"
            disabled={isLoading || !isFirebaseConfigured}
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <button
          className="login-screen__button login-screen__button--google"
          type="button"
          onClick={handleGoogle}
          disabled={isLoading || !isFirebaseConfigured}
        >
          Sign in with Google
        </button>
        {allowDevMockAdmin ? (
          <button
            className="login-screen__button"
            type="button"
            onClick={() => {
              setDevAuthSessionOverride('mock-admin');
              window.location.reload();
            }}
          >
            Use mock admin
          </button>
        ) : null}
      </div>
      </div>
    </div>
  );
}
