import { useState, useEffect, useCallback } from 'react';
import { Clock, Send, AlertTriangle, Play, MapPin, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';

import { useAuth } from '../../store/authStore';
import { useI18n } from '../../i18n';
import { timeAgo, useFormatDateTime } from '../../lib/utils';
import { CATEGORY_LABELS, timelineDotClass, statusLabels } from '../../constants';
import { StatusBadge } from '../shared/StatusBadge';
import { PriorityBadge } from '../shared/PriorityBadge';
import { Spinner } from '../shared/Spinner';
import { Toast } from '../shared/Toast';

const STATUS_ORDER = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const PROGRESS_TYPES = [
  { value: 'STARTED', label: 'Début intervention', icon: Play, color: '#2d8a5e' },
  { value: 'ON_SITE', label: 'Sur site', icon: MapPin, color: '#2d8a5e' },
  { value: 'BLOCKED', label: 'Bloqué', icon: AlertTriangle, color: '#c87a2a' },
  { value: 'UPDATE', label: 'Mise à jour', icon: RefreshCw, color: '#3b7dd8' },
];

export function Drawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [incident, setIncident] = useState<any>(null);
  const [error, setError] = useState('');
  const u = useAuth((s) => s.user)!;
  const t = useI18n((s) => s.t);
  const formatDateTime = useFormatDateTime();
  const [responsables, setResponsables] = useState<any[]>([]);
  const [comment, setComment] = useState('');
  const [showReassign, setShowReassign] = useState(false);
  const [reassignReason, setReassignReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showResolve, setShowResolve] = useState(false);
  const [resolveText, setResolveText] = useState('');
  const [showProgress, setShowProgress] = useState<string | null>(null);
  const [progressNote, setProgressNote] = useState('');
  const [toast, setToast] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(() => {
    setError('');
    api<any>('/incidents/' + id)
      .then(setIncident)
      .catch((err) => setError(err.message || t('drawer.error')));
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (u.roles.includes('ADMINISTRATOR')) {
      api<any[]>('/responsables').then(setResponsables).catch(() => setResponsables([]));
    }
  }, [u.roles]);

  useEffect(() => {
    document.body.classList.add('no-scroll');
    return () => { document.body.classList.remove('no-scroll'); };
  }, []);

  if (error && !incident) {
    return (
      <>
        <div className="drawer-backdrop" onClick={onClose} />
        <div className="incident-drawer">
          <div className="drawer-header">
            <button className="drawer-back" onClick={onClose}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              {t('drawer.back')}
            </button>
          </div>
          <div className="empty-state">
            <AlertTriangle size={32} className="empty-icon" />
            <div className="empty-title">{t('drawer.error')}</div>
            <div className="empty-desc">{error}</div>
            <button className="button button-outline" onClick={load}>{t('drawer.retry')}</button>
          </div>
        </div>
      </>
    );
  }

  if (!incident) {
    return (
      <>
        <div className="drawer-backdrop" onClick={onClose} />
        <div className="incident-drawer">
          <div className="loading-page"><Spinner size={24} /></div>
        </div>
      </>
    );
  }

  const assignment = incident.assignments?.find((a: any) => a.isActive);
  const currentStep = STATUS_ORDER.indexOf(incident.status);

  const withActionLoading = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    try {
      await fn();
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssign = async (respId: string) => {
    await withActionLoading(async () => {
      await api('/incidents/' + id + '/assign', {
        method: 'POST',
        body: JSON.stringify({ responsableProfileId: respId, expectedVersion: incident.version })
      });
      setShowReassign(false);
      setToast(t('toasts.responsableAssigned'));
      load();
    });
  };

  const handleAccept = async () => {
    await withActionLoading(async () => {
      await api('/assignments/' + assignment.id + '/accept', {
        method: 'POST',
        body: JSON.stringify({ expectedVersion: incident.version })
      });
      setToast(t('toasts.assignmentAccepted'));
      load();
    });
  };

  const handleResolve = async () => {
    if (resolveText.trim().length < 10 || resolveText.trim().length > 3000) return;
    await withActionLoading(async () => {
      await api('/incidents/' + id + '/resolution', {
        method: 'POST',
        body: JSON.stringify({ resolutionText: resolveText.trim(), expectedVersion: incident.version })
      });
      setShowResolve(false);
      setResolveText('');
      setToast(t('toasts.resolutionSubmitted'));
      load();
    });
  };

  const handleClose = async () => {
    await withActionLoading(async () => {
      await api('/incidents/' + id + '/closure', {
        method: 'POST',
        body: JSON.stringify({ expectedVersion: incident.version })
      });
      setToast(t('toasts.incidentClosed'));
      load();
    });
  };

  const handleReject = async () => {
    if (rejectReason.trim().length < 5 || rejectReason.trim().length > 500) return;
    await withActionLoading(async () => {
      await api('/incidents/' + id + '/reject-resolution', {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim(), expectedVersion: incident.version })
      });
      setShowReject(false);
      setRejectReason('');
      setToast(t('toasts.resolutionRejected'));
      load();
    });
  };

  const handleReassign = async () => {
    if (reassignReason.trim().length < 5 || reassignReason.trim().length > 500) return;
    if (!assignment) return;
    await withActionLoading(async () => {
      await api('/assignments/' + assignment.id + '/reassign', {
        method: 'POST',
        body: JSON.stringify({ reason: reassignReason.trim() })
      });
      setShowReassign(false);
      setReassignReason('');
      setToast(t('toasts.reassignmentRequested'));
      load();
    });
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim().length < 1 || comment.trim().length > 2000) return;
    await withActionLoading(async () => {
      await api('/incidents/' + id + '/comments', {
        method: 'POST',
        body: JSON.stringify({ body: comment.trim() })
      });
      setComment('');
      setToast(t('toasts.commentAdded'));
      load();
    });
  };

  const handleProgress = async () => {
    if (!showProgress || progressNote.trim().length < 1 || progressNote.trim().length > 2000) return;
    await withActionLoading(async () => {
      await api('/incidents/' + id + '/progress', {
        method: 'POST',
        body: JSON.stringify({ type: showProgress, note: progressNote.trim() })
      });
      setShowProgress(null);
      setProgressNote('');
      setToast(t('toasts.progressPublished'));
      load();
    });
  };

  const canProgress = incident.status === 'IN_PROGRESS' && u.roles.includes('RESPONSABLE');

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="incident-drawer">
        <div className="drawer-header">
          <button className="drawer-back" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            {t('drawer.back')}
          </button>
          <div className="drawer-header-right">
            <StatusBadge value={incident.status} />
          </div>
        </div>

        <div className="drawer-content">
          <div className="drawer-kicker">
            <span className="drawer-kicker-id">{id.slice(0, 8).toUpperCase()}</span>
            <span style={{ flex: 1 }} />
            <Clock size={12} /> {timeAgo(incident.createdAt)}
          </div>

          <div className="drawer-title-row">
            <div className="drawer-title">
              <h2>{incident.title}</h2>
              <div className="drawer-title-meta">
                <PriorityBadge value={incident.priority} />
                <span style={{ color: '#c8d0d2' }}>&middot;</span>
                <span>{CATEGORY_LABELS[incident.category] || incident.category}</span>
              </div>
            </div>
          </div>

          <div className="drawer-location">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#77a194' }}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            {incident.site.name} &middot; {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}
          </div>

          {/* Status stepper */}
          <div className="status-stepper">
            {STATUS_ORDER.map((s, i) => (
              <div key={s} className={`stepper-step ${i <= currentStep ? 'stepper-active' : ''} ${i < currentStep ? 'stepper-done' : ''}`}>
                <div className="stepper-dot" />
                {i < STATUS_ORDER.length - 1 && <div className="stepper-line" />}
                <div className="stepper-label">{statusLabels[s] || s}</div>
              </div>
            ))}
          </div>

          {/* Role actions */}
          <div className="drawer-action-wrap">
            {incident.status === 'CLOSED' && (
              <div className="closed-message">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                {t('drawer.closedNotice')}
              </div>
            )}

            {u.roles.includes('ADMINISTRATOR') && incident.status === 'NEW' && (
              <div className="drawer-actions-row">
                <button className="button button-primary drawer-action" onClick={() => setShowReassign(!showReassign)} disabled={actionLoading}>
                  {t('drawer.assignResponsable')}
                </button>
              </div>
            )}

            {u.roles.includes('RESPONSABLE') && incident.status === 'ASSIGNED' && assignment && (
              <div className="drawer-actions-row">
                <button className="button button-primary drawer-action" onClick={handleAccept} disabled={actionLoading}>
                  {actionLoading ? t('drawer.loading') : t('drawer.acceptAssignment')}
                </button>
                <button className="button button-outline drawer-action" onClick={() => setShowReassign(!showReassign)} disabled={actionLoading}>
                  {t('drawer.requestReassignment')}
                </button>
              </div>
            )}

            {u.roles.includes('RESPONSABLE') && incident.status === 'IN_PROGRESS' && (
              <div className="drawer-actions-row">
                <button className="button button-primary drawer-action" onClick={() => setShowResolve(true)} disabled={actionLoading}>
                  {t('drawer.submitResolution')}
                </button>
              </div>
            )}

            {u.roles.includes('ADMINISTRATOR') && incident.status === 'RESOLVED' && (
              <div className="drawer-actions-row">
                <button className="button button-primary drawer-action" onClick={handleClose} disabled={actionLoading}>
                  {actionLoading ? t('drawer.loading') : t('drawer.closeIncident')}
                </button>
                <button className="button button-danger drawer-action" onClick={() => setShowReject(!showReject)} disabled={actionLoading}>
                  {t('drawer.rejectResolution')}
                </button>
              </div>
            )}

            {/* Assign modal (Admin, NEW) */}
            {showReassign && incident.status === 'NEW' && (
              <div className="reassign-section" style={{ marginTop: 12 }}>
                <div className="reassign-title">{t('drawer.assignResponsable')}</div>
                <select style={{ width: '100%', padding: '8px 10px', border: '1px solid #e0d0b8', borderRadius: 6, fontSize: 11, marginBottom: 8 }}
                  onChange={(e) => e.target.value && handleAssign(e.target.value)}>
                  <option value="">{t('drawer.chooseResponsable')}</option>
                  {responsables.filter((r) => r.isActive).map((r) => (
                    <option key={r.id} value={r.id}>{r.user.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Reassign modal (Responsable, ASSIGNED) */}
            {showReassign && incident.status === 'ASSIGNED' && (
              <div className="reassign-section" style={{ marginTop: 12 }}>
                <div className="reassign-title">{t('drawer.requestReassignment')}</div>
                <textarea placeholder={t('drawer.reassignmentReason')} value={reassignReason} onChange={(e) => setReassignReason(e.target.value)} maxLength={500} />
                {reassignReason.trim().length > 0 && reassignReason.trim().length < 5 && (
                  <div style={{ color: '#b91c1c', fontSize: 11, marginTop: 4 }}>{t('drawer.minChars5')}</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 10, color: '#98a5a8' }}>{reassignReason.length}/500</span>
                  <button className="button button-primary button-small" disabled={reassignReason.trim().length < 5 || reassignReason.trim().length > 500 || actionLoading} onClick={handleReassign}>
                    {actionLoading ? t('drawer.sending') : t('drawer.send')}
                  </button>
                </div>
              </div>
            )}

            {/* Resolve modal (Responsable, IN_PROGRESS) */}
            {showResolve && (
              <div className="reassign-section" style={{ marginTop: 12 }}>
                <div className="reassign-title">{t('drawer.submitResolution')}</div>
                <textarea placeholder={t('drawer.resolutionReport')} value={resolveText} onChange={(e) => setResolveText(e.target.value)} style={{ minHeight: 80 }} maxLength={3000} />
                {resolveText.trim().length > 0 && (resolveText.trim().length < 10 || resolveText.trim().length > 3000) && (
                  <div style={{ color: '#b91c1c', fontSize: 11, marginTop: 4 }}>
                    {resolveText.trim().length < 10 ? t('drawer.minChars10') : t('drawer.maxChars3000')}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 10, color: '#98a5a8' }}>{resolveText.length}/3000</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="button button-ghost button-small" onClick={() => { setShowResolve(false); setResolveText(''); }}>{t('common.cancel')}</button>
                    <button className="button button-primary button-small" disabled={resolveText.trim().length < 10 || resolveText.trim().length > 3000 || actionLoading} onClick={handleResolve}>
                      {actionLoading ? t('drawer.sending') : t('drawer.submitAction')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Reject modal (Admin, RESOLVED) */}
            {showReject && (
              <div className="reassign-section reassign-reject" style={{ marginTop: 12 }}>
                <div className="reassign-title">{t('drawer.rejectResolution')}</div>
                <textarea placeholder={t('drawer.rejectReason')} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} maxLength={500} />
                {rejectReason.trim().length > 0 && (rejectReason.trim().length < 5 || rejectReason.trim().length > 500) && (
                  <div style={{ color: '#b91c1c', fontSize: 11, marginTop: 4 }}>
                    {rejectReason.trim().length < 5 ? t('drawer.minChars5') : t('drawer.maxChars500')}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 10, color: '#98a5a8' }}>{rejectReason.length}/500</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="button button-ghost button-small" onClick={() => { setShowReject(false); setRejectReason(''); }}>{t('common.cancel')}</button>
                    <button className="button button-danger button-small" disabled={rejectReason.trim().length < 5 || rejectReason.trim().length > 500 || actionLoading} onClick={handleReject}>
                      {actionLoading ? t('drawer.sending') : t('drawer.rejectAction')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Progress update modal (Responsable, IN_PROGRESS) */}
            {showProgress && (
              <div className="reassign-section" style={{ marginTop: 12 }}>
                <div className="reassign-title">{t('drawer.progressUpdate')} {PROGRESS_TYPES.find(p => p.value === showProgress)?.label}</div>
                <textarea placeholder={t('drawer.progressPlaceholder')} value={progressNote} onChange={(e) => setProgressNote(e.target.value)} style={{ minHeight: 80 }} maxLength={2000} />
                {progressNote.trim().length > 0 && progressNote.trim().length > 2000 && (
                  <div style={{ color: '#b91c1c', fontSize: 11, marginTop: 4 }}>{t('drawer.maxChars2000')}</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 10, color: '#98a5a8' }}>{progressNote.length}/2000</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="button button-ghost button-small" onClick={() => { setShowProgress(null); setProgressNote(''); }}>{t('common.cancel')}</button>
                    <button className="button button-primary button-small" disabled={progressNote.trim().length < 1 || progressNote.trim().length > 2000 || actionLoading} onClick={handleProgress}>
                      {actionLoading ? t('drawer.sending') : t('drawer.publish')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Original report section */}
          <div className="drawer-section">
            <div className="drawer-section-header">
              <h3>{t('drawer.originalReport')}</h3>
              <span className="drawer-section-date">{formatDateTime(incident.createdAt)}</span>
            </div>
            <div className="drawer-info-grid">
              <div className="drawer-info">
                <div className="drawer-info-label">{t('drawer.reportedBy')}</div>
                <div className="drawer-info-value">{incident.reporter.name}</div>
              </div>
              <div className="drawer-info">
                <div className="drawer-info-label">{t('drawer.site')}</div>
                <div className="drawer-info-value">{incident.site.name}</div>
              </div>
              <div className="drawer-info">
                <div className="drawer-info-label">{t('drawer.category')}</div>
                <div className="drawer-info-value">{CATEGORY_LABELS[incident.category] || incident.category}</div>
              </div>
              <div className="drawer-info">
                <div className="drawer-info-label">{t('drawer.coordinates')}</div>
                <div className="drawer-info-value">{incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}</div>
              </div>
            </div>
            {incident.description && (
              <div className="drawer-description">
                <div className="drawer-info-label">{t('drawer.description')}</div>
                <p>{incident.description}</p>
              </div>
            )}
          </div>

          {/* Operational handling section */}
          <div className="drawer-section">
            <div className="drawer-section-header">
              <h3>{t('drawer.operationalTracking')}</h3>
            </div>
            <div className="drawer-info-grid">
              <div className="drawer-info">
                <div className="drawer-info-label">{t('drawer.responsable')}</div>
                <div className="drawer-info-value">{assignment?.responsable?.user?.name || t('drawer.notAssigned')}</div>
              </div>
              <div className="drawer-info">
                <div className="drawer-info-label">{t('drawer.status')}</div>
                <div className="drawer-info-value"><StatusBadge value={incident.status} /></div>
              </div>
              {incident.verifiedAt && (
                <div className="drawer-info">
                  <div className="drawer-info-label">{t('drawer.verifiedAt')}</div>
                  <div className="drawer-info-value">{formatDateTime(incident.verifiedAt)}</div>
                </div>
              )}
              {incident.updatedAt !== incident.createdAt && (
                <div className="drawer-info">
                  <div className="drawer-info-label">{t('drawer.lastUpdate')}</div>
                  <div className="drawer-info-value">{timeAgo(incident.updatedAt)}</div>
                </div>
              )}
            </div>

            {incident.resolutionText && (
              <div className="drawer-resolution">
                <div className="drawer-info-label">{t('drawer.resolution')}</div>
                <p>{incident.resolutionText}</p>
              </div>
            )}
          </div>

          {/* Progress updates (Responsable, IN_PROGRESS) */}
          {canProgress && (
            <div className="drawer-section">
              <div className="drawer-section-header">
                <h3>{t('drawer.progressUpdates')}</h3>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PROGRESS_TYPES.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.value}
                      className="button button-outline button-small"
                      onClick={() => { setShowProgress(p.value); setProgressNote(''); }}
                      disabled={actionLoading}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Icon size={13} color={p.color} /> {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="drawer-section">
            <div className="drawer-section-header">
              <h3>{t('drawer.history')}</h3>
            </div>
            <div className="timeline">
              {(incident.auditEvents || []).map((a: any) => (
                <div key={a.id} className="timeline-event">
                  <div className={`timeline-dot ${timelineDotClass[a.eventType] || 'dot-status'}`} />
                  <div className="timeline-label">{formatEventType(a.eventType, t)}</div>
                  <div className="timeline-meta">
                    <span>{a.actor?.name}</span>
                    <span>{formatDateTime(a.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="drawer-section">
            <div className="drawer-section-header">
              <h3>{t('drawer.comments')}</h3>
              {(incident.comments || []).length > 0 && (
                <span className="drawer-section-count">{incident.comments.length}</span>
              )}
            </div>
            {(incident.comments || []).length === 0 && (
              <div className="empty-compact" style={{ padding: '12px 0' }}>
                <div className="empty-title" style={{ fontSize: 11 }}>{t('drawer.noComments')}</div>
              </div>
            )}
            {(incident.comments || []).map((c: any) => (
              <div key={c.id} className="comment">
                <div className="avatar avatar-green" style={{ width: 28, height: 28, fontSize: 9 }}>
                  {c.author.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div>
                    <span className="comment-author">{c.author.name}</span>
                    <span className="comment-time">{timeAgo(c.createdAt)}</span>
                  </div>
                  <div className="comment-body">{c.body}</div>
                </div>
              </div>
            ))}
            {incident.status !== 'CLOSED' && (
              <form className="comment-form" onSubmit={handleComment}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    placeholder={t('drawer.addComment')}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={actionLoading}
                    maxLength={2000}
                  />
                  {comment.length > 0 && (
                    <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: comment.length > 2000 ? '#b91c1c' : '#98a5a8' }}>
                      {comment.length}/2000
                    </span>
                  )}
                </div>
                <button type="submit" className="button button-primary button-small" disabled={comment.trim().length < 1 || comment.trim().length > 2000 || actionLoading}>
                  <Send size={14} />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
}

function formatEventType(type: string, t: any): string {
  const map: Record<string, string> = {
    CREATED: t('eventTypes.INCIDENT_CREATED'),
    TRIAGE: 'Triage effectué',
    VERIFIED: 'Vérifié',
    ASSIGNMENT: t('eventTypes.INCIDENT_ASSIGNED'),
    STATUS: t('eventTypes.STATUS_CHANGED'),
    RESOLUTION: t('eventTypes.RESOLUTION_SUBMITTED'),
    REJECTED: t('eventTypes.RESOLUTION_REJECTED'),
    CLOSED: t('eventTypes.INCIDENT_CLOSED'),
    PROGRESS: t('eventTypes.PROGRESS_ADDED'),
    COMMENT: t('eventTypes.COMMENT_ADDED'),
    ATTACHMENT: t('eventTypes.ATTACHMENT_ADDED'),
    REASSIGNMENT: t('eventTypes.REASSIGNMENT_REQUESTED')
  };
  return map[type] || type.replace(/_/g, ' ').toLowerCase();
}
