import { useEffect, useState } from 'react';
import { Users, AlertTriangle, Pencil, Plus, ArrowUpRight } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { Toast } from '../shared/Toast';
import { Spinner } from '../shared/Spinner';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { TeamFormModal } from './TeamFormModal';

interface ResponsableRecord {
  id: string;
  isActive: boolean;
  user: { id: string; name: string; email: string };
  specialties: { id: string; specialty: { id: string; name: string } }[];
  sites: { id: string; site: { id: string; name: string } }[];
}

export function Team() {
  const [data, setData] = useState<ResponsableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<ResponsableRecord | null>(null);
  const [deactivating, setDeactivating] = useState<ResponsableRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const t = useI18n((s) => s.t);

  const load = () => {
    setLoading(true);
    api('/responsables')
      .then(setData)
      .catch((err) => setError(err.message || t('errors.loadFailed')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDeactivate = async () => {
    if (!deactivating) return;
    setSaving(true);
    setError('');
    try {
      await api('/responsables/' + deactivating.id, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false })
      });
      setToast(t('team.deactivateSuccess'));
      setDeactivating(null);
    } catch (err: any) {
      setToast(err.message || t('common.error'));
    } finally {
      setSaving(false);
      load();
    }
  };

  const handleReactivate = async (r: ResponsableRecord) => {
    setError('');
    try {
      await api('/responsables/' + r.id, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: true })
      });
      setToast(t('team.reactivateSuccess'));
    } catch (err: any) {
      setToast(err.message || t('common.error'));
    }
    load();
  };

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

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> ADMINISTRATION</div>
          <h1>{t('team.title')}</h1>
          <p>{t('team.subtitle')}</p>
        </div>
        <button className="button button-primary button-lg" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> {t('team.add')}
        </button>
      </div>

      {error && (
        <div className="empty-state" style={{ marginBottom: 16 }}>
          <AlertTriangle size={32} className="empty-icon" />
          <div className="empty-title">{t('errors.loadFailed')}</div>
          <div className="empty-desc">{error}</div>
          <button className="button button-outline" onClick={load}>{t('common.retry')}</button>
        </div>
      )}

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
            <div className="empty-desc">{t('team.emptyDesc')}</div>
            <button className="button button-primary" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> {t('team.add')}
            </button>
          </div>
        ) : (
          data.map((r) => {
            const initials = r.user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={r.id} className={`panel person-card${!r.isActive ? ' person-card-inactive' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className={`avatar avatar-larger ${!r.isActive ? 'avatar-muted' : 'avatar-green'}`}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="person-card-name">
                      {r.user.name}
                      <span className={`status-indicator ${r.isActive ? 'status-online' : 'status-busy'}`} />
                    </div>
                    <div className="person-card-email">{r.user.email}</div>
                  </div>
                  <button className="icon-button" title={t('team.edit')} onClick={() => setEditing(r)}>
                    <Pencil size={15} />
                  </button>
                </div>
                {r.specialties?.length > 0 && (
                  <div className="specialties">
                    {r.specialties.map((s) => (
                      <span key={s.id} className="specialty-tag">{s.specialty.name}</span>
                    ))}
                  </div>
                )}
                {r.sites?.length > 0 ? (
                  <div className="person-card-sites">
                    {r.sites.map((s) => s.site?.name).filter(Boolean).join(', ')}
                  </div>
                ) : (
                  <div className="person-card-sites">{t('team.noSites')}</div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  {r.isActive ? (
                    <button className="button button-outline button-small" style={{ flex: 1 }} onClick={() => setDeactivating(r)}>
                      {t('team.deactivate')}
                    </button>
                  ) : (
                    <button className="button button-primary button-small" style={{ flex: 1 }} onClick={() => handleReactivate(r)}>
                      <ArrowUpRight size={13} /> {t('team.reactivate')}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showCreate && (
        <TeamFormModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load(); }}
        />
      )}

      {editing && (
        <TeamFormModal
          mode="edit"
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {deactivating && (
        <ConfirmDialog
          title={t('team.deactivateTitle')}
          message={`${t('team.deactivateMessage')} ${deactivating.user.name}?`}
          confirmLabel={t('team.deactivate')}
          confirmColor="#DC2626"
          busy={saving}
          onConfirm={handleDeactivate}
          onCancel={() => setDeactivating(null)}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}