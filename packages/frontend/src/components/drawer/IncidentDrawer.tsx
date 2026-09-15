import { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, Send } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../store/authStore';
import { useI18n } from '../../i18n';
import { timeAgo } from '../../lib/utils';
import { CATEGORY_LABELS, timelineDotClass } from '../../constants';
import { Spinner } from '../shared/Spinner';

function getDrawerBadgeClass(status: string): string {
  const map: Record<string, string> = {
    NEW: 'drawer-badge-new',
    ASSIGNED: 'drawer-badge-assigned',
    IN_PROGRESS: 'drawer-badge-progress',
    RESOLVED: 'drawer-badge-resolved',
    CLOSED: 'drawer-badge-closed',
  };
  return map[status] || 'drawer-badge-new';
}

function getDrawerPriorityClass(priority: string): string {
  const map: Record<string, string> = {
    CRITICAL: 'drawer-badge-critical',
    HIGH: 'drawer-badge-high',
    MEDIUM: 'drawer-badge-medium',
    LOW: 'drawer-badge-low',
  };
  return map[priority] || 'drawer-badge-new';
}

function formatEventType(type: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    CREATED: t('eventTypes.INCIDENT_CREATED'),
    TRIAGE: t('eventTypes.TRIAGE'),
    VERIFIED: t('eventTypes.VERIFIED'),
    ASSIGNMENT: t('eventTypes.INCIDENT_ASSIGNED'),
    ACCEPTANCE: t('eventTypes.INCIDENT_ACCEPTED'),
    STATUS: t('eventTypes.STATUS_CHANGED'),
    RESOLUTION: t('eventTypes.RESOLUTION_SUBMITTED'),
    REJECTED: t('eventTypes.RESOLUTION_REJECTED'),
    CLOSED: t('eventTypes.INCIDENT_CLOSED'),
    PROGRESS: t('eventTypes.PROGRESS_ADDED'),
    COMMENT: t('eventTypes.COMMENT_ADDED'),
    ATTACHMENT: t('eventTypes.ATTACHMENT_ADDED'),
    REASSIGNMENT: t('eventTypes.REASSIGNMENT_REQUESTED'),
  };
  return map[type] || type.replace(/_/g, ' ').toLowerCase();
}

export function Drawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [incident, setIncident] = useState<any>(null);
  const [error, setError] = useState('');
  const u = useAuth((s) => s.user)!;
  const t = useI18n((s) => s.t);
  const [responsables, setResponsables] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [selectedResp, setSelectedResp] = useState('');

  const load = useCallback(() => {
    setError('');
    api<any>('/incidents/' + id)
      .then(setIncident)
      .catch((err) => setError(err.message || t('drawer.error')));
  }, [id, t]);

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

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const withActionLoading = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    try { await fn(); } finally { setActionLoading(false); }
  };

  const handleAssign = async () => {
    if (!selectedResp) return;
    await withActionLoading(async () => {
      await api('/incidents/' + id + '/assign', {
        method: 'POST',
        body: JSON.stringify({ responsableProfileId: selectedResp, expectedVersion: incident.version }),
      });
      setShowAssign(false);
      setSelectedResp('');
      load();
    });
  };

  const handleAccept = async () => {
    const a = incident.assignments?.find((x: any) => x.isActive);
    if (!a) return;
    await withActionLoading(async () => {
      await api('/assignments/' + a.id + '/accept', {
        method: 'POST',
        body: JSON.stringify({ expectedVersion: incident.version }),
      });
      load();
    });
  };

  const handleResolve = async () => {
    await withActionLoading(async () => {
      await api('/incidents/' + id + '/resolution', {
        method: 'POST',
        body: JSON.stringify({ resolutionText: 'Resolved by ' + u.name, expectedVersion: incident.version }),
      });
      load();
    });
  };

  const handleCloseIncident = async () => {
    await withActionLoading(async () => {
      await api('/incidents/' + id + '/closure', {
        method: 'POST',
        body: JSON.stringify({ expectedVersion: incident.version }),
      });
      load();
    });
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim().length < 1) return;
    await withActionLoading(async () => {
      await api('/incidents/' + id + '/comments', {
        method: 'POST',
        body: JSON.stringify({ body: comment.trim() }),
      });
      setComment('');
      load();
    });
  };

  if (error && !incident) {
    return (
      <>
        <div className="drawer-backdrop" onClick={onClose} />
        <div className="incident-drawer">
          <div className="drawer-header">
            <div />
            <button className="drawer-close" onClick={onClose} aria-label={t('common.close')}><X size={18} /></button>
          </div>
          <div className="empty-state">
            <AlertTriangle size={32} className="empty-icon" />
            <div className="empty-title">{t('drawer.error')}</div>
            <div className="empty-desc">{error}</div>
            <button className="button button-outline" onClick={load}>{t('common.retry')}</button>
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
  const ownerName = assignment?.responsable?.user?.name;
  const ownerInitials = ownerName
    ? ownerName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : '\u2013';
  const issueCode = incident.incNumber || ('INC-' + String(id).slice(0, 4).toUpperCase());
  const exactLocation = incident.exactLocation || incident.site?.address || (incident.latitude != null ? `${Number(incident.latitude).toFixed(4)}, ${Number(incident.longitude).toFixed(4)}` : '\u2014');

  const canAssign = u.roles.includes('ADMINISTRATOR');

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="incident-drawer" role="dialog" aria-modal="true" aria-labelledby="incident-drawer-title">

        <div className="drawer-header">
          <div className="drawer-heading">
            <span>{issueCode}</span>
            <h2 id="incident-drawer-title">{incident.title}</h2>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        <div className="drawer-content">
          <div className="drawer-badges">
            <span className={`drawer-badge ${getDrawerPriorityClass(incident.priority)}`}>
              {t(`priorities.${incident.priority}`)}
            </span>
            <span className={`drawer-badge ${getDrawerBadgeClass(incident.status)}`}>
              <i /> {t(`incidentStatuses.${incident.status}`)}
            </span>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-label">{t('drawer.incidentDetails')}</div>
            {incident.description && (
              <div className="drawer-description">
                <p>{incident.description}</p>
              </div>
            )}
            <div className="drawer-info-grid">
              <div className="drawer-info">
                <div className="drawer-info-label">{t('drawer.site')}</div>
                <div className="drawer-info-value">{incident.site?.name || '\u2014'}</div>
              </div>
              <div className="drawer-info">
                <div className="drawer-info-label">{t('drawer.exactLocation')}</div>
                <div className="drawer-info-value">{exactLocation}</div>
              </div>
              <div className="drawer-info">
                <div className="drawer-info-label">{t('drawer.category')}</div>
                <div className="drawer-info-value">{CATEGORY_LABELS[incident.category] || incident.category}</div>
              </div>
              <div className="drawer-info">
                <div className="drawer-info-label">{t('drawer.reported')}</div>
                <div className="drawer-info-value">{timeAgo(incident.createdAt)}</div>
              </div>
            </div>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-label">{t('drawer.assignedOwner')}</div>
            <div className="drawer-owner">
              <div className={`drawer-owner-avatar ${assignment ? 'drawer-owner-avatar-assigned' : 'drawer-owner-avatar-unassigned'}`}>
                {ownerInitials}
              </div>
              <div className="drawer-owner-info">
                <div className="drawer-owner-name">{ownerName || t('drawer.notAssigned')}</div>
                <div className="drawer-owner-hint">{assignment ? t('drawer.assignedTeamMember') : t('drawer.assignTeamMember')}</div>
              </div>
            </div>
          </div>

          <div className="drawer-section" style={{ borderBottom: 'none', marginBottom: 0 }}>
            <div className="drawer-section-label">{t('drawer.activity')}</div>
            <div className="timeline">
              {(incident.auditEvents || []).map((a: any) => (
                <div key={a.id} className="timeline-event">
                  <div className={`timeline-dot ${timelineDotClass[a.eventType] || 'dot-status'}`} />
                  <div className="timeline-label">{formatEventType(a.eventType, t)}</div>
                  <div className="timeline-meta">
                    <span>{a.actor?.name}</span>
                    <span>{timeAgo(a.createdAt)}</span>
                  </div>
                </div>
              ))}
              {(!incident.auditEvents || incident.auditEvents.length === 0) && (
                <div style={{ fontSize: 12, color: '#94A3B8', padding: '8px 0' }}>{t('drawer.noActivity')}</div>
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
            <form onSubmit={handleComment} style={{ display: 'flex', gap: 8 }}>
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('drawer.addComment') || 'Add a comment...'}
                style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }}
              />
              <button type="submit" className="button button-primary button-small" disabled={!comment.trim() || actionLoading}>
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>

        <div className="drawer-footer">
          <button className="button button-outline" onClick={onClose}>{t('common.close')}</button>

          {canAssign && incident.status === 'NEW' && !showAssign && (
            <button className="button button-primary" onClick={() => setShowAssign(true)}>
              {t('drawer.assignIncident')}
            </button>
          )}

          {canAssign && showAssign && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={selectedResp}
                onChange={(e) => setSelectedResp(e.target.value)}
                style={{ height: 38, border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, padding: '0 10px', background: '#fff', minWidth: 160 }}
              >
                <option value="">{t('drawer.chooseResponsable')}</option>
                {responsables.filter((r: any) => r.isActive).map((r: any) => (
                  <option key={r.id} value={r.id}>{r.user.name}</option>
                ))}
              </select>
              <button className="button button-primary button-small" onClick={handleAssign} disabled={!selectedResp || actionLoading}>
                {actionLoading ? <Spinner size={14} /> : <Send size={14} />}
              </button>
            </div>
          )}

          {incident.status === 'ASSIGNED' && assignment && (
            <button className="button button-primary" onClick={handleAccept} disabled={actionLoading}>
              {t('drawer.acceptAssignment')}
            </button>
          )}

          {incident.status === 'IN_PROGRESS' && (
            <button className="button button-primary" onClick={handleResolve} disabled={actionLoading}>
              {t('drawer.submitResolution')}
            </button>
          )}

          {incident.status === 'RESOLVED' && (
            <button className="button button-primary" onClick={handleCloseIncident} disabled={actionLoading}>
              {t('drawer.closeIncident')}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
