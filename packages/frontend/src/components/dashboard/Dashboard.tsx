import { useEffect, useState } from 'react';
import { Plus, AlertTriangle, ClipboardList, CheckCircle, Clock, ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../store/authStore';
import { useI18n } from '../../i18n';
import { Spinner } from '../shared/Spinner';
import { StatusBadge } from '../shared/StatusBadge';
import { PriorityBadge } from '../shared/PriorityBadge';
import { KpiCard } from './KpiCard';
import { WatchList } from './WatchList';
import { StatusDistribution } from './StatusDistribution';
import { PriorityDistribution } from './PriorityDistribution';
import { RecentActivity } from './RecentActivity';
import { Drawer } from '../drawer/IncidentDrawer';
import { timeAgo, useTimeAgo } from '../../lib/utils';
import { categoryPriorityClass } from '../../constants';

function getGreeting(t: (k: string) => string) {
  const h = new Date().getHours();
  if (h < 12) return t('dashboard.greeting.morning');
  if (h < 18) return t('dashboard.greeting.afternoon');
  return t('dashboard.greeting.evening');
}

export function Dashboard() {
  const u = useAuth((s) => s.user)!;
  const nav = useNavigate();
  const admin = u.roles.includes('ADMINISTRATOR');
  const responsable = u.roles.includes('RESPONSABLE');

  if (admin) return <AdminDashboard />;
  if (responsable) return <ResponsableDashboard />;
  return <UserDashboard />;
}

function UserDashboard() {
  const u = useAuth((s) => s.user)!;
  const nav = useNavigate();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const t = useI18n((s) => s.t);
  const timeAgoFn = useTimeAgo();

  useEffect(() => {
    setLoading(true);
    api<any>('/incidents?limit=20')
      .then((d) => setIncidents(d.items || []))
      .catch((err) => setError(err.message || t('dashboard.errorLoading')))
      .finally(() => setLoading(false));
  }, [t]);

  const greeting = getGreeting(t);

  return (
    <div className="page">
      <div className="page-heading dashboard-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> {t('dashboard.eyebrow')}
          </div>
          <h1>{greeting}, {u.name.split(' ')[0]} <span className="wave">&#10022;</span></h1>
          <p>{t('dashboard.userSubtitle')}</p>
        </div>
        <button className="button button-primary button-lg" onClick={() => nav('/incidents?new=1')}>
          <Plus size={18} /> {t('dashboard.reportIncident')}
        </button>
      </div>

      {loading && (
        <div className="loading-page"><Spinner size={32} /></div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <AlertTriangle size={40} className="empty-icon" />
          <div className="empty-title">{t('common.error')}</div>
          <div className="empty-desc">{error}</div>
          <button className="button button-outline" onClick={() => window.location.reload()}>{t('common.retry')}</button>
        </div>
      )}

      {!loading && !error && (
        <div className="kpi-grid">
          <KpiCard label={t('dashboard.kpi.myReports')} value={incidents.length} variant="teal" subtitle={t('dashboard.kpi.totalReports')} />
          <KpiCard label={t('dashboard.kpi.inProgress')} value={incidents.filter((i) => i.status === 'IN_PROGRESS').length} variant="orange" subtitle={t('dashboard.kpi.inProgressSub')} />
          <KpiCard label={t('dashboard.kpi.pending')} value={incidents.filter((i) => i.status === 'NEW' || i.status === 'ASSIGNED').length} variant="coral" subtitle={t('dashboard.kpi.pendingSub')} />
          <KpiCard label={t('dashboard.kpi.resolved')} value={incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length} variant="purple" subtitle={t('dashboard.kpi.resolvedRate')}
            trend={incidents.length > 0 ? Math.round((incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length / incidents.length) * 100) : 0}
          />
        </div>
      )}

      {!loading && !error && incidents.length === 0 && (
        <div className="empty-state">
          <ClipboardList size={40} className="empty-icon" />
          <div className="empty-title">{t('dashboard.empty.noIncidents')}</div>
          <div className="empty-desc">{t('dashboard.empty.noIncidentsDesc')}</div>
          <button className="button button-primary" onClick={() => nav('/incidents?new=1')}>
            <Plus size={16} /> {t('dashboard.reportIncident')}
          </button>
        </div>
      )}

      {!loading && !error && incidents.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <h2>{t('dashboard.sections.mesIncidents')}</h2>
            <p>{incidents.length} {t('dashboard.countSuffix')}</p>
          </div>
          <div className="user-incidents-list">
            {incidents.map((i) => (
              <button key={i.id} className="incident-compact" onClick={() => setSelected(i.id)}>
                <div className={`category-icon-box ${categoryPriorityClass[i.priority] || 'category-medium'}`}>
                  <ClipboardList size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="incident-compact-title">{i.title}</div>
                  <div className="incident-compact-meta">{i.site?.name} &middot; {timeAgoFn(i.createdAt)}</div>
                </div>
                <StatusBadge value={i.status} />
                <ChevronRight size={16} className="incident-compact-chevron" />
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && <Drawer id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ResponsableDashboard() {
  const u = useAuth((s) => s.user)!;
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const t = useI18n((s) => s.t);
  const timeAgoFn = useTimeAgo();

  const load = () => {
    setLoading(true);
    api<any>('/incidents?limit=50')
      .then((d) => setIncidents(d.items || []))
      .catch((err) => setError(err.message || t('dashboard.errorLoadingResp')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toAccept = incidents.filter((i) => i.status === 'ASSIGNED');
  const inProgress = incidents.filter((i) => i.status === 'IN_PROGRESS');
  const awaitingResolution = incidents.filter((i) => i.status === 'RESOLVED');
  const totalActions = toAccept.length + inProgress.length;
  const greeting = getGreeting(t);

  return (
    <div className="page">
      <div className="page-heading dashboard-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> {t('dashboard.eyebrow')}
          </div>
          <h1>{greeting}, {u.name.split(' ')[0]} <span className="wave">&#10022;</span></h1>
          <p>
            {totalActions > 0
              ? `${totalActions} ${t('dashboard.responsableSubtitle.attention')}`
              : t('dashboard.responsableSubtitle.noAction')}
          </p>
        </div>
      </div>

      {loading && (
        <div className="loading-page"><Spinner size={32} /></div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <AlertTriangle size={40} className="empty-icon" />
          <div className="empty-title">{t('common.error')}</div>
          <div className="empty-desc">{error}</div>
          <button className="button button-outline" onClick={load}>{t('common.retry')}</button>
        </div>
      )}

      {!loading && !error && (
        <div className="kpi-grid">
          <KpiCard label={t('dashboard.kpi.myAssignments')} value={incidents.length} variant="teal" subtitle={t('dashboard.kpi.totalAssigned')} />
          <KpiCard label={t('dashboard.kpi.inProgress')} value={inProgress.length} variant="orange" subtitle={t('dashboard.kpi.inProgressSub')} />
          <KpiCard label={t('dashboard.kpi.toAccept')} value={toAccept.length} variant="coral" subtitle={t('dashboard.kpi.toAcceptSub')} />
          <KpiCard label={t('dashboard.kpi.resolved')} value={awaitingResolution.length} variant="purple" subtitle={t('dashboard.kpi.awaitingVerification')} />
        </div>
      )}

      {!loading && !error && totalActions === 0 && inProgress.length === 0 && (
        <div className="empty-state">
          <CheckCircle size={40} className="empty-icon" style={{ color: 'var(--teal)' }} />
          <div className="empty-title">{t('dashboard.empty.upToDate')}</div>
          <div className="empty-desc">{t('dashboard.empty.upToDateDesc')}</div>
        </div>
      )}

      {!loading && !error && (
        <div className="responsable-dashboard">
          {toAccept.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <h2><span className="status-dot fill-orange" /> {t('dashboard.sections.toAccept')}</h2>
                <p>{toAccept.length} {t('dashboard.sections.toAcceptCount')}</p>
              </div>
              <div className="user-incidents-list">
                {toAccept.map((i) => (
                  <button key={i.id} className="incident-compact incident-compact-action" onClick={() => setSelected(i.id)}>
                    <PriorityBadge value={i.priority} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="incident-compact-title">{i.title}</div>
                      <div className="incident-compact-meta">{i.site?.name} &middot; {t('dashboard.sections.assigned')} {timeAgoFn(i.updatedAt)}</div>
                    </div>
                    <span className="button button-sm button-outline">{t('dashboard.actions.accept')}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {inProgress.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <h2><span className="status-dot fill-teal" /> {t('dashboard.sections.inProgress')}</h2>
                <p>{inProgress.length} {t('dashboard.sections.inProgressCount')}</p>
              </div>
              <div className="user-incidents-list">
                {inProgress.map((i) => (
                  <button key={i.id} className="incident-compact" onClick={() => setSelected(i.id)}>
                    <PriorityBadge value={i.priority} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="incident-compact-title">{i.title}</div>
                      <div className="incident-compact-meta">{i.site?.name} &middot; {timeAgoFn(i.updatedAt)}</div>
                    </div>
                    <StatusBadge value={i.status} />
                    <ChevronRight size={16} className="incident-compact-chevron" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {awaitingResolution.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <h2><span className="status-dot fill-blue" /> {t('dashboard.sections.resolutionPending')}</h2>
                <p>{awaitingResolution.length} {t('dashboard.sections.resolutionPendingCount')}</p>
              </div>
              <div className="user-incidents-list">
                {awaitingResolution.map((i) => (
                  <button key={i.id} className="incident-compact" onClick={() => setSelected(i.id)}>
                    <PriorityBadge value={i.priority} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="incident-compact-title">{i.title}</div>
                      <div className="incident-compact-meta">{i.site?.name} &middot; {t('dashboard.sections.submitted')} {timeAgoFn(i.updatedAt)}</div>
                    </div>
                    <StatusBadge value={i.status} />
                    <ChevronRight size={16} className="incident-compact-chevron" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selected && <Drawer id={selected} onClose={() => { setSelected(null); load(); }} />}
    </div>
  );
}

function AdminDashboard() {
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [toReview, setToReview] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const nav = useNavigate();
  const t = useI18n((s) => s.t);
  const timeAgoFn = useTimeAgo();

  useEffect(() => {
    Promise.all([
      api<any>('/dashboard'),
      api<any>('/incidents?status=NEW&limit=10'),
      api<any>('/incidents?status=RESOLVED&limit=10')
    ]).then(([dash, un, rev]) => {
      setD(dash);
      setUnassigned(un.items || []);
      setToReview(rev.items || []);
    }).catch((err) => setError(err.message || t('common.error')))
      .finally(() => setLoading(false));
  }, [t]);

  const greeting = getGreeting(t);

  if (loading) {
    return <div className="loading-page"><Spinner size={32} /></div>;
  }

  if (error) {
    return (
      <div className="page">
        <div className="empty-state">
          <AlertTriangle size={40} className="empty-icon" />
          <div className="empty-title">{t('common.error')}</div>
          <div className="empty-desc">{error}</div>
          <button className="button button-outline" onClick={() => window.location.reload()}>{t('common.retry')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-heading dashboard-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> {t('dashboard.eyebrow')}
          </div>
          <h1>{greeting} <span className="wave">&#10022;</span></h1>
          <p>{t('dashboard.adminSubtitle')}</p>
        </div>
        <button className="button button-primary" onClick={() => nav('/incidents?new=1')}>
          <Plus size={17} /> {t('dashboard.newIncident')}
        </button>
      </div>

      <div className="kpi-grid">
        <KpiCard label={t('dashboard.kpi.activeIncidents')} value={d.active ?? 0} variant="teal" subtitle={t('dashboard.kpi.activeSub')} />
        <KpiCard label={t('dashboard.kpi.inProgress')} value={d.inProgress ?? 0} variant="orange" subtitle={t('dashboard.kpi.inProgressSub')} />
        <KpiCard label={t('dashboard.kpi.pending')} value={unassigned.length} variant="coral" subtitle={t('dashboard.kpi.pendingSub')} />
        <KpiCard label={t('dashboard.kpi.resolved')} value={d.resolved ?? 0} variant="purple" subtitle={t('dashboard.kpi.resolvedRate')} trend={d.total > 0 ? Math.round(((d.resolved ?? 0) / d.total) * 100) : 0} />
      </div>

      {(unassigned.length > 0 || toReview.length > 0) && (
        <div className="dashboard-grid-top">
          {unassigned.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <h2><span className="status-dot fill-orange" /> {t('dashboard.sections.unassigned')}</h2>
                <p>{unassigned.length} {t('dashboard.sections.unassignedCount')}</p>
              </div>
              <div className="user-incidents-list">
                {unassigned.slice(0, 5).map((i) => (
                  <button key={i.id} className="incident-compact incident-compact-action" onClick={() => setSelected(i.id)}>
                    <PriorityBadge value={i.priority} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="incident-compact-title">{i.title}</div>
                      <div className="incident-compact-meta">{i.site?.name} &middot; {timeAgoFn(i.createdAt)}</div>
                    </div>
                    <span className="button button-sm button-outline">{t('dashboard.actions.assign')}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {toReview.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <h2><span className="status-dot fill-blue" /> {t('dashboard.sections.toReview')}</h2>
                <p>{toReview.length} {t('dashboard.sections.toReviewCount')}</p>
              </div>
              <div className="user-incidents-list">
                {toReview.slice(0, 5).map((i) => (
                  <button key={i.id} className="incident-compact" onClick={() => setSelected(i.id)}>
                    <PriorityBadge value={i.priority} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="incident-compact-title">{i.title}</div>
                      <div className="incident-compact-meta">{i.site?.name} &middot; {timeAgoFn(i.updatedAt)}</div>
                    </div>
                    <StatusBadge value={i.status} />
                    <ChevronRight size={16} className="incident-compact-chevron" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="dashboard-grid-bottom">
        <div className="panel">
          <div className="panel-header">
            <h2>{t('dashboard.sections.watchlist')}</h2>
            <p>{t('dashboard.sections.watchlistSub')}</p>
          </div>
          <WatchList />
        </div>
        <div className="panel">
          <div className="panel-header">
            <h2>{t('dashboard.sections.statusDistribution')}</h2>
            <p>{t('dashboard.sections.statusDistSub')}</p>
          </div>
          <StatusDistribution data={d.statuses || []} />
        </div>
      </div>

      <div className="dashboard-grid-bottom">
        <div className="panel">
          <div className="panel-header">
            <h2>{t('dashboard.sections.recentActivity')}</h2>
            <p>{t('dashboard.sections.recentActivitySub')}</p>
          </div>
          <RecentActivity />
        </div>
        <div className="panel">
          <div className="panel-header">
            <h2>{t('dashboard.sections.priorities')}</h2>
            <p>{t('dashboard.sections.prioritiesSub')}</p>
          </div>
          <PriorityDistribution data={d.priorities || []} />
        </div>
      </div>

      {selected && <Drawer id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
