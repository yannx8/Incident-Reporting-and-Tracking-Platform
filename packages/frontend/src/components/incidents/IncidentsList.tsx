import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, ChevronRight, ClipboardList, Send, X, CheckCircle, AlertTriangle, Upload, ArrowRight } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../store/authStore';
import { Incident, Site } from '../../types';
import { useI18n } from '../../i18n';
import { CATEGORY_LABELS, PRIORITY_COLORS } from '../../constants';
import { StatusBadge } from '../shared/StatusBadge';
import { PriorityBadge } from '../shared/PriorityBadge';
import { Spinner } from '../shared/Spinner';
import { Drawer } from '../drawer/IncidentDrawer';
import { MapLocationPicker } from '../map/MapLocationPicker';
import { useTimeAgo } from '../../lib/utils';

const AVATAR_COLORS = ['owner-avatar-green', 'owner-avatar-blue', 'owner-avatar-purple', 'owner-avatar-orange', 'owner-avatar-rose'];

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function Incidents() {
  const u = useAuth((s) => s.user)!;
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [sites, setSites] = useState<Site[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<string | null>(null);
  const [create, setCreate] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const t = useI18n((s) => s.t);
  const timeAgoFn = useTimeAgo();
  const isAdmin = u.roles.includes('ADMINISTRATOR');
  const items: Incident[] = Array.isArray(data?.items) ? data.items : [];

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api(
      `/incidents?limit=${limit}&page=${page}` +
      (q ? '&search=' + encodeURIComponent(q) : '') +
      (status ? '&status=' + status : '') +
      (priority ? '&priority=' + priority : '') +
      (category ? '&category=' + category : '') +
      (isAdmin && siteFilter ? '&siteId=' + siteFilter : '')
    ).then(setData)
      .catch((err) => setError(err.message || t('errors.loadFailed')))
      .finally(() => setLoading(false));
  }, [page, limit, q, status, priority, category, siteFilter, isAdmin, t]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (searchParams.get('new')) setCreate(true);
    api<Site[]>('/sites').then(setSites).catch(() => setSites([]));
  }, [searchParams]);

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> {t('incidents.eyebrow')}</div>
          <h1>{t('incidents.title')}</h1>
          <p>{t('incidents.subtitle')}</p>
        </div>
        <button className="button button-primary button-lg" onClick={() => setCreate(true)}>
          <Plus size={18} /> {t('incidents.create')}
        </button>
      </div>

      <div className="panel">
        <div className="panel-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2>{t('incidents.recentTitle')}</h2>
            <p>{t('incidents.recentSubtitle')}</p>
          </div>
          <button
            className="button button-ghost button-small"
            style={{ flexShrink: 0 }}
            onClick={() => { setQ(''); setStatus(''); setPriority(''); setCategory(''); setSiteFilter(''); setPage(1); load(); }}
          >
            {t('incidents.openRegister')} <ArrowRight size={14} />
          </button>
        </div>
        <div className="incidents-table-toolbar">
          <div className="incidents-search">
            <Search size={15} />
            <input
              placeholder={t('incidents.search')}
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
          </div>
          <select className="incidents-filter-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">{t('incidents.filterStatus')}</option>
            {['NEW','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED'].map((k) => (
              <option key={k} value={k}>{t(`incidentStatuses.${k}` as any)}</option>
            ))}
          </select>
          <select className="incidents-filter-select" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
            <option value="">{t('incidents.filterPriority')}</option>
            {['LOW','MEDIUM','HIGH','CRITICAL'].map((k) => (
              <option key={k} value={k}>{t(`priorities.${k}` as any)}</option>
            ))}
          </select>
          <select className="incidents-filter-select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
            <option value="">{t('incidents.filterCategory')}</option>
            {Object.keys(CATEGORY_LABELS).map((k) => (
              <option key={k} value={k}>{t(`categories.${k}` as any)}</option>
            ))}
          </select>
          {isAdmin && (
            <select className="incidents-filter-select" value={siteFilter} onChange={(e) => { setSiteFilter(e.target.value); setPage(1); }}>
              <option value="">{t('incidents.filterSite')}</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>

        {loading && (
          <div className="loading-page"><Spinner size={24} /></div>
        )}

        {!loading && error && (
          <div className="empty-state">
            <AlertTriangle size={32} className="empty-icon" />
            <div className="empty-title">{t('common.error')}</div>
            <div className="empty-desc">{error}</div>
            <button className="button button-outline" onClick={load}>{t('common.retry')}</button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="empty-state">
            <ClipboardList size={32} className="empty-icon" />
            <div className="empty-title">{t('incidents.empty')}</div>
            <div className="empty-desc">
              {q || status || priority || category || (isAdmin && siteFilter)
                ? t('incidents.emptyFiltered')
                : t('incidents.emptyCreate')}
            </div>
            {!(q || status || priority || category || (isAdmin && siteFilter)) && (
              <button className="button button-primary" onClick={() => setCreate(true)}>
                <Plus size={16} /> {t('incidents.create')}
              </button>
            )}
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <div className="incidents-table-head">
              <span>{t('incidents.incident')}</span>
              <span>{t('incidents.location')}</span>
              <span>{t('incidents.status')}</span>
              <span>{t('incidents.priority')}</span>
              <span>{t('incidents.owner')}</span>
              <span>{t('incidents.updated')}</span>
              <span />
            </div>

            {items.map((i: Incident) => {
              const activeAssignment = (i as any).assignments?.find((a: any) => a.isActive);
              const ownerName: string | undefined = activeAssignment?.responsable?.user?.name;
              const avatarColor = AVATAR_COLORS[Math.abs((i.id || '').charCodeAt(0) || 0) % AVATAR_COLORS.length];
              const accent = PRIORITY_COLORS[i.priority] || '#3B82F6';
              const categoryLabel = (t(`categories.${i.category}` as any) as string) || i.category;
              return (
                <div
                  key={i.id}
                  className="incidents-table-row"
                  style={{ boxShadow: `inset 3px 0 0 ${accent}` }}
                  onClick={() => setSelected(i.id)}
                >
                  <div>
                    <div className="incident-cell-title">{i.title}</div>
                    <div className="incident-cell-meta">INC-{(i.id || '').slice(0, 4).toUpperCase()} &middot; {categoryLabel}</div>
                  </div>
                  <div>
                    <div className="incident-cell-site">{i.site?.name || '—'}</div>
                    {(i.site?.address || (i as any).exactLocation) && (
                      <div className="incident-cell-site-sub">{i.site?.address || (i as any).exactLocation}</div>
                    )}
                  </div>
                  <div><StatusBadge value={i.status} /></div>
                  <div><PriorityBadge value={i.priority} /></div>
                  <div>
                    {ownerName ? (
                      <div className="owner-cell">
                        <div className={`owner-avatar ${avatarColor}`}>{getInitials(ownerName)}</div>
                        <span className="owner-name">{ownerName}</span>
                      </div>
                    ) : (
                      <div className="owner-cell">
                        <span style={{ color: '#94A3B8' }}>–</span>
                        <span className="owner-unassigned">{t('drawer.notAssigned')}</span>
                      </div>
                    )}
                  </div>
                  <div className="incident-cell-time">{timeAgoFn(i.updatedAt || i.createdAt)}</div>
                  <div><ChevronRight size={16} color="#b3bfc1" /></div>
                </div>
              );
            })}

            <div className="table-footer">
              <span>{data.total || 0} {t('incidents.total')}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  className="filter-select"
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  style={{ width: 60, fontSize: 11 }}
                >
                  {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>&lsaquo;</button>
                  <span className="page-btn page-btn-active">{page} / {Math.max(1, Math.ceil((data.total || 0) / limit))}</span>
                  <button className="page-btn" disabled={page >= Math.ceil((data.total || 0) / limit)} onClick={() => setPage((p) => p + 1)}>&rsaquo;</button>
                </div>
              </div>
            </div>
          </>
        )}

        {selected && <Drawer id={selected} onClose={() => setSelected(null)} />}
        {create && (
          <CreateIncident
            onClose={() => {
              setCreate(false);
              if (searchParams.get('new')) {
                searchParams.delete('new');
                setSearchParams(searchParams, { replace: true });
              }
            }}
            onCreated={(id) => {
              setCreate(false);
              if (searchParams.get('new')) {
                searchParams.delete('new');
                setSearchParams(searchParams, { replace: true });
              }
              load();
              setSelected(id);
            }}
          />
        )}
      </div>
    </div>
  );
}

/** Multi-step incident creation: 1) description + photo, 2) site + location + category, 3) submit, 4) success. */
function CreateIncident({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [step, setStep] = useState(1);
  const [sites, setSites] = useState<Site[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'OTHER',
    priority: 'MEDIUM',
    siteId: '',
    latitude: '',
    longitude: ''
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiErr, setApiErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const t = useI18n((s) => s.t);

  useEffect(() => {
    api<Site[]>('/sites')
      .then((s) => {
        setSites(s);
        if (s[0]) {
          setForm((f) => ({
            ...f,
            siteId: s[0].id,
            latitude: String(s[0].latitude),
            longitude: String(s[0].longitude)
          }));
        }
      })
      .catch(() => setSites([]))
      .finally(() => setSitesLoading(false));
  }, []);

  useEffect(() => {
    document.body.classList.add('no-scroll');
    return () => { document.body.classList.remove('no-scroll'); };
  }, []);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    /* 5 MB client-side limit to reduce unnecessary upload attempts */
    if (f.size > 5 * 1024 * 1024) { setErrors((e) => ({ ...e, photo: t('incidents.fileTooLarge') })); return; }
    setPhoto(f);
    setPhotoPreview(URL.createObjectURL(f));
    setErrors((e) => { const n = { ...e }; delete n.photo; return n; });
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (form.description.length < 10 || form.description.length > 5000) e.description = t('incidents.descLengthError');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!form.siteId) e.siteId = t('incidents.siteRequired');
    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) e.latitude = t('incidents.positionInvalid');
    if (isNaN(lng) || lng < -180 || lng > 180) e.longitude = t('incidents.positionInvalid');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(s + 1, 3));
  };

  const submit = async () => {
    setSubmitting(true);
    setApiErr('');
    try {
      const d = await api<Incident>('/incidents', {
        method: 'POST',
        body: JSON.stringify({
          title: form.description.slice(0, 80), // Derive title from description for quick creation
          description: form.description,
          category: form.category,
          priority: form.priority,
          siteId: form.siteId,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude)
        })
      });
      setCreatedId(d.id);
      setStep(4);
    } catch (e: any) {
      setApiErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSite = sites.find((s) => s.id === form.siteId);

  const siteLocationPickerValue = form.latitude && form.longitude
    ? { latitude: Number(form.latitude), longitude: Number(form.longitude) }
    : null;

  if (step === 4 && createdId) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="create-modal create-modal--success" onClick={(e) => e.stopPropagation()}>
          <div className="success-body">
            <div className="success-icon-circle">
              <CheckCircle size={48} strokeWidth={1.5} />
            </div>
            <div className="success-title">{t('incidents.created')}</div>
            <div className="success-desc">
              {t('incidents.createdDesc')} (<strong>#{createdId.slice(0, 8).toUpperCase()}</strong>)<br />
              {t('incidents.createdStatus')} <strong>{t('incidents.statusNew')}</strong>.
            </div>
            <div className="success-actions">
              <button className="button button-primary" onClick={() => { onClose(); onCreated(createdId); }}>
                <ClipboardList size={15} /> {t('incidents.viewIncident')}
              </button>
              <button className="button button-outline" onClick={onClose}>{t('common.close')}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getSubmitBtnContent = () => {
    if (step === 2 && submitting) {
      return <><Spinner size={14} /> {t('common.loading')}</>;
    }
    if (step === 2) {
      return <>{t('incidents.submit')} <Send size={14} /></>;
    }
    return null;
  };

  const getNextBtnContent = () => {
    if (step !== 2) {
      return <>{t('common.continue')} <ChevronRight size={16} /></>;
    }
    return null;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="create-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-header">
          <div className="create-header-text">
            <h2>{t('incidents.createTitle')}</h2>
            <p>{t('incidents.createSubtitle')}</p>
          </div>
          <button className="create-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="create-steps">
          <div className={`create-step${step >= 1 ? ' create-step-active' : ''}`}>
            <span className="create-step-num">1</span>
            <span className="create-step-label">{t('incidents.step1')}</span>
          </div>
          <div className="create-step-line" />
          <div className={`create-step${step >= 2 ? ' create-step-active' : ''}`}>
            <span className="create-step-num">2</span>
            <span className="create-step-label">{t('incidents.step2')}</span>
          </div>
        </div>

        <div className="create-body">
          {step === 1 && (
            <div className="create-form-step">
              <div className="create-field">
                <label>{t('incidents.whatHappened')} <em>*</em></label>
                <div className="create-textarea-wrap">
                  <textarea
                    rows={5}
                    maxLength={5000}
                    placeholder={t('incidents.descriptionPlaceholder')}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                  <span className="create-char-count">{form.description.length}/5000</span>
                </div>
                {errors.description && <div className="create-error">{errors.description}</div>}
              </div>

              <div className="create-field">
                <label>{t('incidents.photo')} <span className="create-optional">(optionnel)</span></label>
                {photoPreview ? (
                  <div className="create-photo-preview">
                    <img src={photoPreview} alt="Aperçu" />
                    <button className="create-photo-remove" onClick={removePhoto}><X size={14} /></button>
                  </div>
                ) : (
                  <label className="create-photo-drop create-photo-drop-compact" htmlFor="photo-input">
                    <Upload size={18} />
                    <span>{t('incidents.photoHint')}</span>
                    <small>{t('incidents.photoFormats')}</small>
                    {/* accept attr is a browser hint only; server validates via magic bytes */}
                    <input ref={fileRef} id="photo-input" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handlePhoto} />
                  </label>
                )}
                {errors.photo && <div className="create-error">{errors.photo}</div>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="create-form-step">
              <div className="create-field">
                <label>{t('incidents.siteLabel')} <em>*</em></label>
                {sitesLoading ? (
                  <div style={{ padding: '8px 0' }}><Spinner size={16} /></div>
                ) : (
                  <select value={form.siteId} onChange={(e) => {
                    const s = sites.find((x) => x.id === e.target.value);
                    setForm({
                      ...form,
                      siteId: e.target.value,
                      latitude: s ? String(s.latitude) : '',
                      longitude: s ? String(s.longitude) : ''
                    });
                  }}>
                    <option value="">{t('incidents.sitePlaceholder')}</option>
                    {sites.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.address || t('incidents.siteNoAddress')}</option>)}
                  </select>
                )}
                {errors.siteId && <div className="create-error">{errors.siteId}</div>}
              </div>

              {form.siteId && (
                <div className="create-field">
                  <label>{t('incidents.exactLocation')} <span className="create-optional">{t('incidents.optional')}</span></label>
                  <MapLocationPicker
                    value={siteLocationPickerValue}
                    onChange={(loc) => {
                      setForm({ ...form, latitude: String(loc.latitude), longitude: String(loc.longitude) });
                      setErrors((prev) => { const n = { ...prev }; delete n.latitude; delete n.longitude; return n; });
                    }}
                    height={240}
                    draggable
                    showSearch
                    showCurrentLocation={false}
                  />
                  {errors.latitude && <div className="create-error">{errors.latitude}</div>}
                </div>
              )}

              <div className="create-field-row">
                <div className="create-field">
                  <label>{t('incidents.category')}</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {Object.keys({
                      LIGHTING: 1, PLUMBING: 1, SECURITY: 1, FURNITURE: 1, ROAD: 1, EQUIPMENT: 1, HVAC: 1, OTHER: 1
                    }).map((k) => <option key={k} value={k}>{t(`categories.${k}` as any)}</option>)}
                  </select>
                </div>
                <div className="create-field">
                  <label>{t('incidents.priorityLabel')}</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    {Object.keys({
                      LOW: 1, MEDIUM: 1, HIGH: 1, CRITICAL: 1
                    }).map((k) => <option key={k} value={k}>{t(`priorities.${k}` as any)}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {apiErr && <div className="create-api-error">{apiErr}</div>}

          <div className="create-footer">
            <button className="button button-outline" onClick={onClose}>{t('incidents.cancel')}</button>
            <button className="button button-primary" onClick={step === 2 ? submit : next} disabled={submitting}>
              {submitting ? <Spinner size={16} /> : step === 1 ? t('incidents.continue') : t('incidents.submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
