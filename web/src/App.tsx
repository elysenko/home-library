// Route-verifiability contract (Colossus): every navigable UI state MUST be reachable
// from a URL alone (deep-linkable BrowserRouter routes; nginx serves try_files fallback).
// Keep data-testid="app-ready" on the shell root — the mockup gate waits for it.
import { AuthProvider } from './auth/AuthContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <div data-testid="app-ready">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </div>
  );
}
