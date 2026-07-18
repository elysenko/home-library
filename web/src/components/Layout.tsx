import { NavLink, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';

const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

interface NavItem {
  to: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: '/books', label: 'Books', icon: '📚' },
  { to: '/loans', label: 'Loans', icon: '🔖' },
  { to: '/admin', label: 'Users', icon: '👥', adminOnly: true },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️', adminOnly: true },
];

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">L</div>
      <div>
        <div className="brand-name">Household Lending Ledger</div>
        <div className="brand-sub">Home Library</div>
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'ADMIN';
  const items = NAV.filter((i) => !i.adminOnly || isAdmin);

  const isActive = (to: string) =>
    to === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(to);

  return (
    <div className="app-shell" data-testid="app-shell">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <Brand />
        <div className="nav-group-label">Library</div>
        {items
          .filter((i) => !i.adminOnly)
          .map((i) => (
            <NavLink key={i.to} to={i.to} className={() => `nav-link ${isActive(i.to) ? 'active' : ''}`}>
              <span className="nav-ico">{i.icon}</span>
              {i.label}
            </NavLink>
          ))}

        {isAdmin && (
          <>
            <div className="nav-group-label">Administration</div>
            {items
              .filter((i) => i.adminOnly)
              .map((i) => (
                <NavLink key={i.to} to={i.to} className={() => `nav-link ${isActive(i.to) ? 'active' : ''}`}>
                  <span className="nav-ico">{i.icon}</span>
                  {i.label}
                </NavLink>
              ))}
          </>
        )}

        <div className="sidebar-foot">
          <div className="userchip">
            <div className="avatar">{user ? initials(user.name) : '?'}</div>
            <div style={{ minWidth: 0 }}>
              <div className="userchip-name">{user?.name}</div>
              <div className="userchip-role">{user?.role === 'ADMIN' ? 'Administrator' : 'Member'}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout} data-testid="logout">
            Sign out
          </button>
        </div>
      </aside>

      <div className="main-col">
        {/* Mobile top bar */}
        <header className="topbar">
          <Brand />
          <button className="logout-btn" style={{ width: 'auto', padding: '0 14px' }} onClick={logout}>
            Sign out
          </button>
        </header>

        {children}
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="tabbar" aria-label="Primary">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} className={() => `tab ${isActive(i.to) ? 'active' : ''}`}>
            <span className="tab-ico">{i.icon}</span>
            {i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
