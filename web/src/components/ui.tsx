import { useEffect, type ReactNode } from 'react';
import { deriveStatus, type Loan } from '../lib/store';

// ---- Status badge -------------------------------------------
export function StatusBadge({ loan }: { loan: Loan }) {
  const s = deriveStatus(loan);
  const cls = s === 'overdue' ? 'badge-overdue' : s === 'returned' ? 'badge-returned' : 'badge-lent';
  return (
    <span className={`badge ${cls}`}>
      <span className="dot" />
      {s}
    </span>
  );
}

export function RoleBadge({ role }: { role: 'ADMIN' | 'USER' }) {
  return <span className={`badge ${role === 'ADMIN' ? 'badge-admin' : 'badge-user'}`}>{role.toLowerCase()}</span>;
}

// ---- State blocks -------------------------------------------
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="card card-pad" data-testid="loading-state">
      <div className="skeleton sk-line" style={{ width: '35%', height: 18 }} />
      <div className="skeleton sk-line" style={{ width: '85%' }} />
      <div className="skeleton sk-line" style={{ width: '60%' }} />
      <div className="skeleton sk-line" style={{ width: '75%' }} />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function EmptyState({
  icon = '📚',
  title,
  message,
  action,
}: {
  icon?: string;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="state" data-testid="empty-state">
      <div className="state-ico">{icon}</div>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state" data-testid="error-state">
      <div className="state-ico">⚠️</div>
      <h3>Something went wrong</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn-ghost" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

// ---- Modal (bottom-sheet on mobile) -------------------------
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ---- Toast --------------------------------------------------
export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="toast-host">
      <div className="toast" role="status" data-testid="toast">
        {message}
      </div>
    </div>
  );
}
