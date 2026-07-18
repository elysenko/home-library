import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Guards authenticated routes; signed-out users are redirected to /login
// (with the attempted path preserved so login can bounce them back).
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page" data-testid="auth-loading">
        <div className="card card-pad">
          <div className="skeleton sk-line" style={{ width: '40%' }} />
          <div className="skeleton sk-line" style={{ width: '70%' }} />
        </div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
