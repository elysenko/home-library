import { Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from '../auth/RequireAuth';
import RequireAdmin from '../auth/RequireAdmin';
import Layout from '../components/Layout';
import Login from './Login';
import Books from './Books';
import BookDetail from './BookDetail';
import Loans from './Loans';
import Admin from './Admin';
import AdminSettings from './AdminSettings';

// Every navigable UI state is URL-addressable (deep-linkable):
//   /login            public
//   /books            guarded — catalog
//   /books/:id        guarded — book detail (fresh-reload safe)
//   /loans?status=…   guarded — loans, filter is the URL source of truth
//   /admin            admin — members
//   /admin/settings   admin — service credentials
//   /                 → /books
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/books"
        element={
          <RequireAuth>
            <Layout>
              <Books />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/books/:id"
        element={
          <RequireAuth>
            <Layout>
              <BookDetail />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/loans"
        element={
          <RequireAuth>
            <Layout>
              <Loans />
            </Layout>
          </RequireAuth>
        }
      />

      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <Layout>
              <Admin />
            </Layout>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <RequireAdmin>
            <Layout>
              <AdminSettings />
            </Layout>
          </RequireAdmin>
        }
      />

      <Route path="/" element={<Navigate to="/books" replace />} />
      <Route path="*" element={<Navigate to="/books" replace />} />
    </Routes>
  );
}
