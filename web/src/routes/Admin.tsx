import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ledgerApi, type User, type Loan } from '../lib/store';
import { ErrorState, LoadingState, RoleBadge } from '../components/ui';

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [allLoans, setAllLoans] = useState<Loan[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  async function load() {
    setStatus('loading');
    try {
      const [u, l] = await Promise.all([ledgerApi.listUsers(), ledgerApi.listLoans('all')]);
      setUsers(u);
      setAllLoans(l);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    load();
  }, []);

  const loanCount = (id: number) => allLoans.filter((l) => l.user_id === id).length;
  const admins = users.filter((u) => u.role === 'ADMIN').length;

  return (
    <main className="page" data-testid="admin-page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Administration</div>
          <h1 className="page-title" data-testid="admin-title">
            Members
          </h1>
          <p className="page-sub">Everyone with access to the household library.</p>
        </div>
        <Link to="/admin/settings" className="btn btn-ghost">
          ⚙️ Service settings
        </Link>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-label">Total members</div>
          <div className="stat-value accent">{users.length}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Administrators</div>
          <div className="stat-value">{admins}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Active loans</div>
          <div className="stat-value">{allLoans.filter((l) => l.status === 'lent').length}</div>
        </div>
      </div>

      {status === 'loading' && <LoadingState label="Loading members" />}
      {status === 'error' && <ErrorState message="We couldn't load members." onRetry={load} />}

      {status === 'ready' && (
        <div className="card table-wrap" data-testid="users-table">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Role</th>
                <th>Loans</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} data-testid="user-row">
                  <td className="cell-strong">{u.name}</td>
                  <td className="cell-muted">{u.email}</td>
                  <td>
                    <RoleBadge role={u.role} />
                  </td>
                  <td>{loanCount(u.id)}</td>
                  <td className="cell-muted">{u.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
