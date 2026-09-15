import { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { api } from '../../api/client';

import { useAuth } from '../../store/authStore';
import { useI18n } from '../../i18n';
import { timeAgo, useFormatDateTime } from '../../lib/utils';
import { CATEGORY_LABELS, timelineDotClass, statusLabels } from '../../constants';
import { StatusBadge } from '../shared/StatusBadge';
import { PriorityBadge } from '../shared/PriorityBadge';
import { Spinner } from '../shared/Spinner';
import { Toast } from '../shared/Toast';
import { DrawerActions } from './DrawerActions';
import { DrawerComments } from './DrawerComments';
import { DrawerAttachments } from './DrawerAttachments';
import { DrawerMiniMap } from './DrawerMiniMap';

const STATUS_ORDER = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

function getDrawerBadgeClass(status: string): string {
  const map: Record<string, string> = {
    NEW: 'drawer-badge-new',
    ASSIGNED: 'drawer-badge-assigned',
    IN_PROGRESS: 'drawer-badge-progress',
    RESOLVED: 'drawer-badge-resolved',
    CLOSED: 'drawer-badge-closed'
  };
  return map[status] || 'drawer-badge-new';
}

function getDrawerPriorityClass(priority: string): string {
  const map: Record<string, string> = {
    CRITICAL: 'drawer-badge-critical',
    HIGH: 'drawer-badge-critical',
    MEDIUM: 'drawer-badge-new',
    LOW: 'drawer-badge-progress'
  };
  return map[priority] || 'drawer-badge-new';
}

/** Side panel for viewing incident details, performing actions, and tracking history. */
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (error && !incident) {
    return (
      <>
        <div className="drawer-backdrop" onClick={onClose} />
        <div className="incident-drawer">
          <div className="drawer-header">
          <button className="drawer-close" onClick={onClose} aria-label={t('common.close')}>
              <X size={18} />
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
    try { await fn(); } finally { setActionLoading(false); }
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
      <div
        className="incident-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="incident-drawer-title"
      >
        <div className="drawer-header">
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{id.slice(0, 8).toUpperCase()}</span>
          <button className="drawer-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="drawer-content">
          <div className="drawer-title">
            <h2 id="incident-drawer-title">{incident.title}</h2>
            <div className="drawer-title-badges">
              <span className={`drawer-badge ${getDrawerPriorityClass(incident.priority)}`}>
                <i /> {incident.priority}
              </span>
              <span className={`drawer-badge ${getDrawerBadgeClass(incident.status)}`}>
                <i /> {t(`incidentStatuses.${incident.status}`) || incident.status}
              </span>
            </div>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-header">
              <h3>{t('drawer.originalReport')}</h3>
            </div>
            {incident.description && (
              <div className="drawer-description">
                <p>{incident.description}</p>
              </div>
            )}
            <div className="drawer-info-grid">
              <div className="drawer-info">
                <div className="drawer-info-label">{t('drawer.site')}</div>
                <div className="drawer-info-value">{incident.site.name}</div>
              </div>
              <div className="drawer-info">
                <div className="drawer-info-label">{t('drawer.exactLocation')}</div>
                <div className="drawer-info-value">{incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}</div>
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
            <div className="drawer-section-header">
              <h3>{t('drawer.assignedOwner')}</h3>
            </div>
            <div className="drawer-owner">
              <div className={`drawer-owner-avatar ${assignment ? '' : 'drawer-owner-avatar-unassigned'}`}>
                {assignment?.responsable?.user?.name
                  ? assignment.responsable.user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                  : '—'}
              </div>
              <div className="drawer-owner-info">
                <div className="drawer-owner-name">{assignment?.responsable?.user?.name || t('drawer.notAssigned')}</div>
                <div className="drawer-owner-hint">{assignment ? t('drawer.assignedTeamMember') : t('drawer.assignTeamMember')}</div>
              </div>
            </div>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-header">
              <h3>{t('drawer.activity')}</h3>
            </div>
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
            </div>
          </div>

          <DrawerActions
            incident={incident}
            assignment={assignment}
            responsables={responsables}
            actionLoading={actionLoading}
            onAssign={handleAssign}
            onAccept={handleAccept}
            onResolve={handleResolve}
            onClose={handleClose}
            onReject={handleReject}
            onReassign={handleReassign}
            onProgress={handleProgress}
            showReassign={showReassign}
            setShowReassign={setShowReassign}
            reassignReason={reassignReason}
            setReassignReason={setReassignReason}
            showReject={showReject}
            setShowReject={setShowReject}
            rejectReason={rejectReason}
            setRejectReason={setRejectReason}
            showResolve={showResolve}
            setShowResolve={setShowResolve}
            resolveText={resolveText}
            setResolveText={setResolveText}
            showProgress={showProgress}
            setShowProgress={setShowProgress}
            progressNote={progressNote}
            setProgressNote={setProgressNote}
            canProgress={canProgress}
          />

          <DrawerAttachments incidentId={id} attachments={incident.attachments || []} />

          <DrawerComments
            comments={incident.comments || []}
            status={incident.status}
            comment={comment}
            setComment={setComment}
            onSubmit={handleComment}
            actionLoading={actionLoading}
          />
        </div>

        <div className="drawer-footer">
          <button className="button button-outline" onClick={onClose}>{t('common.close')}</button>
          {incident.status === 'NEW' && (
            <button className="button button-primary" onClick={() => setShowReassign(true)}>{t('drawer.assignResponsable')}</button>
          )}
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
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
    REASSIGNMENT: t('eventTypes.REASSIGNMENT_REQUESTED')
  };
  return map[type] || type.replace(/_/g, ' ').toLowerCase();
}
