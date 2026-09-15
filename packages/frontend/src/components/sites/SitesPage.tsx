import { useEffect, useState } from 'react';
import { Building2, Plus, X, CheckCircle, AlertTriangle, Pencil } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { Site } from '../../types';
import { siteColors } from '../../constants';
import { Spinner } from '../shared/Spinner';
import { Toast } from '../shared/Toast';
import { MapLocationPicker } from '../map/MapLocationPicker';

export function Sites() {
  const [data, setData] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [toast, setToast] = useState('');
  const t = useI18n((s) => s.t);

  const load = () => {
    setLoading(true);
    setError('');
    api('/sites')
      .then(setData)
      .catch((err) => setError(err.message || t('errors.loadFailed')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleActivate = async (siteId: string) => {
    try {
      await api('/sites/' + siteId, { method: 'PATCH', body: JSON.stringify({ isActive: true }) });
      setToast(t('sites.reactivateSuccess'));
      load();
    } catch (err: any) {
      setToast(err.message || t('common.error'));
    }
  };

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> {t('sites.eyebrow')}</div>
          <h1>{t('sites.title')}</h1>
          <p>{t('sites.subtitle')}</p>
        </div>
        <button className="button button-primary button-lg" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> {t('sites.add')}
        </button>
      </div>

      {loading && (
        <div className="loading-page"><Spinner size={24} /></div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <AlertTriangle size={32} className="empty-icon" />
          <div className="empty-title">{t('errors.loadFailed')}</div>
          <div className="empty-desc">{error}</div>
          <button className="button button-outline" onClick={load}>{t('common.retry')}</button>
        </div>
      )}

      {!loading && !error && (
        <div className="site-grid">
          {data.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-icon"><Building2 size={18} /></div>
              <div className="empty-title">{t('sites.empty')}</div>
              <div className="empty-desc">{t('sites.emptyDesc')}</div>
              <button className="button button-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} /> {t('sites.add')}
              </button>
            </div>
          ) : (
            data.map((s, i) => (
              <div key={s.id} className={`panel site-card${!s.isActive ? ' inactive' : ''}`}>
                {/* Cycle through predefined colors for visual differentiation */}
                <div className="site-card-dot" style={{ background: siteColors[i % siteColors.length] }} />
                {!s.isActive && <span className="site-card-inactive">{t('sites.inactive')}</span>}
                <div className="site-card-name">{s.name}</div>
                <div className="site-card-address">{s.address || t('sites.noAddress')}</div>
                <div className="site-card-stats">
                  <div>
                    <div className="site-stat-value">{s._count?.incidents ?? 0}</div>
                    <div className="site-stat-label">{t('sites.incidents')}</div>
                  </div>
                  <div>
                    <div className="site-stat-value">{s.latitude?.toFixed(2) ?? '—'}</div>
                    <div className="site-stat-label">Lat</div>
                  </div>
                  <div>
                    <div className="site-stat-value">{s.longitude?.toFixed(2) ?? '—'}</div>
                    <div className="site-stat-label">Lng</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button className="button button-outline button-small" style={{ flex: 1 }} onClick={() => setEditingSite(s)}>
                    <Pencil size={12} /> {t('sites.modify')}
                  </button>
                  {!s.isActive && (
                    <button className="button button-primary button-small" style={{ flex: 1 }} onClick={() => handleActivate(s.id)}>
                      {t('sites.reactivate')}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showCreate && (
        <SiteModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load(); }}
        />
      )}

      {editingSite && (
        <SiteModal
          mode="edit"
          site={editingSite}
          onClose={() => setEditingSite(null)}
          onSaved={() => { setEditingSite(null); load(); }}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}

interface SiteModalProps {
  mode: 'create' | 'edit';
  site?: Site;
  onClose: () => void;
  onSaved: () => void;
}

function SiteModal({ mode, site, onClose, onSaved }: SiteModalProps) {
  const [name, setName] = useState(site?.name || '');
  const [address, setAddress] = useState(site?.address || '');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(
    site ? { latitude: site.latitude, longitude: site.longitude } : null
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const t = useI18n((s) => s.t);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (name.length < 2 || name.length > 100) e.name = t('sites.nameError');
    if (!location) e.location = t('sites.locationRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setApiErr('');
    try {
      const payload = {
        name: name.trim(),
        address: address.trim() || null,
        latitude: location!.latitude,
        longitude: location!.longitude
      };

      if (mode === 'create') {
        await api('/sites', { method: 'POST', body: JSON.stringify(payload) });
      } else {
        await api('/sites/' + site!.id, { method: 'PATCH', body: JSON.stringify(payload) });
      }
      onSaved();
    } catch (err: any) {
      setApiErr(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="create-modal site-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="site-modal-title">
        <div className="modal-header">
          <div>
            <h2 id="site-modal-title">{mode === 'create' ? t('sites.add') : t('sites.edit')}</h2>
            <div className="modal-subtitle">
              {mode === 'create' ? t('sites.createSubtitle') : t('sites.editSubtitle')}
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t('common.close')}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <div className="form-grid">
            <div className="form-field span-full">
              <label>{t('sites.name')} <em>*</em></label>
              <input
                maxLength={100}
                placeholder={t('sites.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {errors.name && <div className="form-error">{errors.name}</div>}
            </div>

            <div className="form-field span-full">
              <label>{t('sites.address')} <span style={{ color: '#94a3b8', fontWeight: 400 }}>{t('sites.addressOptional')}</span></label>
              <input
                placeholder={t('sites.addressPlaceholder')}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="form-field span-full">
              <label>{t('sites.location')} <em>*</em></label>
              <MapLocationPicker
                value={location}
                onChange={(loc) => {
                  setLocation(loc);
                  setErrors((prev) => { const n = { ...prev }; delete n.location; return n; });
                  if (loc.address && !address) setAddress(loc.address);
                }}
                height={240}
                draggable
              />
              {errors.location && <div className="form-error">{errors.location}</div>}
            </div>
          </div>

          {apiErr && <div className="auth-error" style={{ margin: '8px 0 0' }}>{apiErr}</div>}
        </div>

        <div className="form-footer">
          <button className="button button-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button className="button button-primary" onClick={submit} disabled={submitting}>
            {submitting ? (
              <><Spinner size={14} /> {mode === 'create' ? t('sites.creating') : t('sites.saving')}</>
            ) : (
              <><CheckCircle size={14} /> {mode === 'create' ? t('sites.create') : t('sites.save')}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
