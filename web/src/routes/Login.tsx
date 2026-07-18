import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const DEMO = [
  { role: 'ADMIN', email: 'admin@library.local', password: 'admin1234' },
  { role: 'USER', email: 'reader@library.local', password: 'reader1234' },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/books';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  function useDemo(d: (typeof DEMO)[number]) {
    setEmail(d.email);
    setPassword(d.password);
  }

  return (
    <div className="auth-wrap" data-testid="login-page">
      <aside className="auth-aside">
        <div className="brand">
          <div className="brand-mark">L</div>
          <div>
            <div className="brand-name">Lending Ledger</div>
            <div className="brand-sub">Home Library</div>
          </div>
        </div>
        <div>
          <p className="auth-quote">
            “A library is not a luxury but one of the necessities of life.”
          </p>
          <p className="auth-quote-by">— Henry Ward Beecher</p>
        </div>
        <div className="auth-features">
          <div className="auth-feature">
            <span className="fi">📚</span>
            <div>
              <div className="auth-feature-t">Shared catalog</div>
              <div className="auth-feature-d">Everyone in the household browses the same shelves.</div>
            </div>
          </div>
          <div className="auth-feature">
            <span className="fi">🔖</span>
            <div>
              <div className="auth-feature-t">Track every loan</div>
              <div className="auth-feature-d">Know who borrowed what — and what's overdue.</div>
            </div>
          </div>
          <div className="auth-feature">
            <span className="fi">🔐</span>
            <div>
              <div className="auth-feature-t">Roles built in</div>
              <div className="auth-feature-d">Admins manage members; members see their own loans.</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="brand" style={{ paddingLeft: 0 }}>
            <div className="brand-mark">L</div>
            <div>
              <div className="brand-name" style={{ color: 'var(--ink)' }}>
                Lending Ledger
              </div>
              <div className="brand-sub" style={{ color: 'var(--muted)' }}>
                Home Library
              </div>
            </div>
          </div>

          <h1 className="page-title" style={{ marginTop: 12 }}>
            Welcome back
          </h1>
          <p className="page-sub" style={{ marginBottom: 22 }}>
            Sign in to manage your books and loans.
          </p>

          {error && (
            <div className="banner banner-error" data-testid="login-error">
              <span>⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={submit} data-testid="login-form">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                data-testid="login-email"
                type="email"
                autoComplete="username"
                placeholder="you@library.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                data-testid="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={busy} data-testid="login-submit">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="demo-box">
            <h4>Demo accounts — tap to fill</h4>
            {DEMO.map((d) => (
              <button
                key={d.email}
                type="button"
                className="demo-cred"
                onClick={() => useDemo(d)}
                data-testid={`demo-${d.role.toLowerCase()}`}
              >
                <span className="demo-cred-info">
                  <span className={`badge ${d.role === 'ADMIN' ? 'badge-admin' : 'badge-user'}`}>{d.role.toLowerCase()}</span>
                  <span className="demo-cred-email" style={{ display: 'block', marginTop: 4 }}>
                    {d.email}
                  </span>
                </span>
                <span className="demo-cred-use">Use →</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
