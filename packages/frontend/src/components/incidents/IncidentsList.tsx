import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, ChevronRight, ClipboardList, Send, Crosshair, X, CheckCircle, AlertTriangle, ArrowLeft, Upload } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../store/authStore';
import { Incident, Site } from '../../types';
import { useI18n } from '../../i18n';
import { CATEGORY_LABELS } from '../../constants';
import { StatusBadge } from '../shared/StatusBadge';
import { PriorityBadge } from '../shared/PriorityBadge';
import { Spinner } from '../shared/Spinner';
import { Drawer } from '../drawer/IncidentDrawer';
import { MapLocationPicker } from '../map/MapLocationPicker';
import { useFormatDate } from '../../lib/utils';

export function Incidents() {
  const u = useAuth((s) => s.user)!;
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [create, setCreate] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const t = useI18n((s) => s.t);
  const formatDate = useFormatDate();

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api(
      `/incidents?limit=50&page=${page}` +
      (q ? '&search=' + encodeURIComponent(q) : '') +
      (status ? '&status=' + status : '') +
      (priority ? '&priority=' + priority : '')
    ).then(setData)
      .catch((err) => setError(err.message || t('errors.loadFailed')))
      .finally(() => setLoading(false));
  }, [page, q, status, priority, t]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (searchParams.get('new')) setCreate(true);
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
        <div className="table-toolbar">
          <div className="table-search">
            <Search size={15} />
            <input
              placeholder={t('incidents.search')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="filter-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">{t('incidents.filterStatus')}</option>
              {['NEW','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED'].map((k) => (
                <option key={k} value={k}>{t(`incidentStatuses.${k}` as any)}</option>
              ))}
            </select>
            <select className="filter-select" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
              <option value="">{t('incidents.filterPriority')}</option>
              {['LOW','MEDIUM','HIGH','CRITICAL'].map((k) => (
                <option key={k} value={k}>{t(`priorities.${k}` as any)}</option>
              ))}
            </select>
          </div>
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

        {!loading && !error && data.items.length === 0 && (
          <div className="empty-state">
            <ClipboardList size={32} className="empty-icon" />
            <div className="empty-title">{t('incidents.empty')}</div>
            <div className="empty-desc">
              {q || status || priority
                ? t('incidents.emptyFiltered')
                : t('incidents.emptyCreate')}
            </div>
            {!(q || status || priority) && (
              <button className="button button-primary" onClick={() => setCreate(true)}>
                <Plus size={16} /> {t('incidents.create')}
              </button>
            )}
          </div>
        )}

        {!loading && !error && data.items.length > 0 && (
          <>
            <div className="table-head">
              <span>{t('incidents.incident')}</span>
              <span>{t('incidents.site')}</span>
              <span>{t('incidents.status')}</span>
              <span>{t('incidents.priority')}</span>
              <span>{t('incidents.date')}</span>
              <span />
            </div>

            {data.items.map((i: Incident) => (
              <div key={i.id} className="table-row" onClick={() => setSelected(i.id)}>
                <div>
                  <div className="table-incident-title">{i.title}</div>
                  <div className="table-incident-meta">{i.id.slice(0, 8).toUpperCase()} &middot; {t(`categories.${i.category}` as any)}</div>
                </div>
                <div style={{ fontSize: 11, color: '#5a6e75' }}>{i.site.name}</div>
                <div><StatusBadge value={i.status} /></div>
                <div><PriorityBadge value={i.priority} /></div>
                <div style={{ fontSize: 10, color: '#98a5a8' }}>{formatDate(i.createdAt)}</div>
                <div><ChevronRight size={14} color="#b3bfc1" /></div>
              </div>
            ))}

            <div className="table-footer">
              <span>{data.total || 0} {t('incidents.total')}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>&lsaquo;</button>
                <button className="page-btn page-btn-active">{page}</button>
                <button className="page-btn" disabled={data.items.length < 50} onClick={() => setPage((p) => p + 1)}>&rsaquo;</button>
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
  const [aiClassifying, setAiClassifying] = useState(false);
  const [aiResult, setAiResult] = useState<{ priority: string; category: string } | null>(null);
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
    if (step === 1) {
      setAiClassifying(true);
      const siteName = sites.find((s) => s.id === form.siteId)?.name || '';
      api<{ priority: string; category: string; confidence: number }>('/incidents/classify', {
        method: 'POST',
        body: JSON.stringify({ description: form.description, siteName })
      }).then((r) => {
        if (r.priority && r.confidence >= 0.6) {
          setAiResult({ priority: r.priority, category: r.category });
          setForm((f) => ({ ...f, priority: r.priority, category: r.category }));
        }
      }).catch(() => {}).finally(() => setAiClassifying(false));
    }
    setStep((s) => Math.min(s + 1, 3));
  };

  const submit = async () => {
    setSubmitting(true);
    setApiErr('');
    try {
      const d = await api<Incident>('/incidents', {
        method: 'POST',
        body: JSON.stringify({
          title: form.description.slice(0, 80),
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
              {aiClassifying && (
                <div className="create-ai-badge"><Spinner size={12} /> {t('incidents.aiClassifying')}</div>
              )}
              {aiResult && (
                <div className="create-ai-result">
                  <span className="create-ai-dot" />
                  {t('incidents.aiResult')} {t(`priorities.${aiResult.priority}` as any)} / {t(`categories.${aiResult.category}` as any)}
                </div>
              )}
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