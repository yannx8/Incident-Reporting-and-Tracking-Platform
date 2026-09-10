import { useEffect, useState } from 'react';
import { Users, AlertTriangle } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { Toast } from '../shared/Toast';
import { Spinner } from '../shared/Spinner';

export function Team() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const t = useI18n((s) => s.t);

  useEffect(() => {
    setLoading(true);
    api('/responsables')
      .then(setData)
      .catch((err) => setError(err.message || t('errors.loadFailed')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="page-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-dot" /> ADMINISTRATION</div>
            <h1>{t('team.title')}</h1>
            <p>{t('team.subtitle')}</p>
          </div>
        </div>
        <div className="loading-page"><Spinner size={32} /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-dot" /> ADMINISTRATION</div>
            <h1>{t('team.title')}</h1>
            <p>{t('team.subtitle')}</p>
          </div>
        </div>
        <div className="empty-state">
          <AlertTriangle size={40} className="empty-icon" />
          <div className="empty-title">{t('errors.loadFailed')}</div>
          <div className="empty-desc">{error}</div>
          <button className="button button-outline" onClick={() => window.location.reload()}>{t('common.retry')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> ADMINISTRATION</div>
          <h1>{t('team.title')}</h1>
          <p>{t('team.subtitle')}</p>
        </div>
      </div>

      <div className="team-summary">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="team-avatars">
            {data.slice(0, 4).map((r, i) => (
              <div key={r.id} className={`avatar ${['avatar-green', 'avatar-orange', 'avatar-purple', 'avatar-blue'][i % 4]}`}>
                {r.user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
              </div>
            ))}
          </div>
          <div>
            <div className="team-count-text">{data.length} {t('team.members')}</div>
            <div className="team-count-sub">{t('team.organization')}</div>
          </div>
        </div>
      </div>

      <div className="team-grid">
        {data.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-icon"><Users size={18} /></div>
            <div className="empty-title">{t('team.empty')}</div>
          </div>
        ) : (
          data.map((r) => {
            const initials = r.user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={r.id} className="panel person-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="avatar avatar-larger avatar-green">{initials}</div>
                  <div>
                    <div className="person-card-name">
                      {r.user.name}
                      <span className={`status-indicator ${r.isActive ? 'status-online' : 'status-busy'}`} />
                    </div>
                    <div className="person-card-email">{r.user.email}</div>
                  </div>
                </div>
                {r.specialties?.length > 0 && (
                  <div className="specialties">
                    {r.specialties.map((s: any) => (
                      <span key={s.specialty.id} className="specialty-tag">{s.specialty.name}</span>
                    ))}
                  </div>
                )}
                {r.sites?.length > 0 && (
                  <div className="person-card-sites">
                    {r.sites.map((s: any) => s.site?.name).filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
