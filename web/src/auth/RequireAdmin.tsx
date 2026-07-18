import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

// ADMIN-only guard. Signed-out users go to /login; signed-in non-admins
// are bounced to /books (they should never see admin surfaces).
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/books" replace />;
  return <>{children}</>;
}
