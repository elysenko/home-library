import { useState } from 'react';
import { Link } from 'react-router-dom';
import { settings as seedSettings, type ServiceSetting } from '../mock/store';
import { Toast } from '../components/ui';

export default function AdminSettings() {
  const [services, setServices] = useState<ServiceSetting[]>(() => seedSettings.map((s) => ({ ...s, fields: s.fields.map((f) => ({ ...f })) })));
  const [toast, setToast] = useState('');

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2400);
  }

  function updateField(svcKey: string, fieldKey: string, value: string) {
    setServices((prev) =>
      prev.map((s) =>
        s.key !== svcKey ? s : { ...s, fields: s.fields.map((f) => (f.key === fieldKey ? { ...f, value } : f)) },
      ),
    );
  }

  function save(svcKey: string) {
    setServices((prev) =>
      prev.map((s) =>
        s.key !== svcKey ? s : { ...s, configured: s.fields.every((f) => f.value.trim().length > 0) },
      ),
    );
    flash('Settings saved');
  }

  return (
    <main className="page" data-testid="admin-settings-page">
      <Link to="/admin" className="back-link">
        ← Back to administration
      </Link>

      <div className="page-head">
        <div>
          <div className="eyebrow">Administration</div>
          <h1 className="page-title" data-testid="admin-settings-title">
            Service settings
          </h1>
          <p className="page-sub">
            Configure backing service credentials. Values fall back to environment variables when left blank.
          </p>
        </div>
      </div>

      <div className="banner banner-info">
        <span>🔒</span>
        Secrets are stored server-side and shown masked. Only administrators can view or edit this page.
      </div>

      <div className="settings-grid">
        {services.map((svc) => (
          <section className="svc-card" key={svc.key} data-testid={`service-${svc.key}`}>
            <div className="svc-head">
              <div className="svc-ico" style={{ background: svc.color }}>
                {svc.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div className="svc-title">{svc.label}</div>
                <div className="cell-muted">{svc.description}</div>
              </div>
              <span
                className={`badge ${svc.configured ? 'badge-ok' : 'badge-off'}`}
                data-testid={`status-${svc.key}`}
              >
                <span className="dot" />
                {svc.configured ? 'Configured' : 'Not configured'}
              </span>
            </div>
            <div className="svc-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  save(svc.key);
                }}
              >
                {svc.fields.map((f) => (
                  <div className="field" key={f.key}>
                    <label htmlFor={`${svc.key}-${f.key}`}>{f.label}</label>
                    <input
                      id={`${svc.key}-${f.key}`}
                      type={f.secret ? 'password' : 'text'}
                      value={f.value}
                      placeholder={f.placeholder}
                      onChange={(e) => updateField(svc.key, f.key, e.target.value)}
                    />
                    <span className="hint">
                      Env: <code>{f.key}</code>
                    </span>
                  </div>
                ))}
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" data-testid={`save-${svc.key}`}>
                    Save {svc.label}
                  </button>
                </div>
              </form>
            </div>
          </section>
        ))}
      </div>

      <Toast message={toast} />
    </main>
  );
}
