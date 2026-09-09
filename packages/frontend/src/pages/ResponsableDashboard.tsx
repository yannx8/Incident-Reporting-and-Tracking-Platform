import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useIncidents } from '../api/incidents';
import { categoryIcons, statusMeta, priorityMeta, relativeTime } from '../lib/mockData';
import { ChevronRight, ClipboardList, Clock3, ShieldAlert, Activity } from 'lucide-react';
import { Incident, Priority, Status } from '../types';

function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`priority-badge ${priorityMeta[priority].className}`}><i />{priorityMeta[priority].label}</span>;
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`status-badge ${statusMeta[status].className}`}><i />{statusMeta[status].label}</span>;
}

function AssignedRow({ incident, onClick }: { incident: Incident; onClick: () => void }) {
  const Icon = categoryIcons[incident.category];
  return (
    <button className="incident-compact" onClick={onClick}>
      <div className={`incident-category category-${incident.priority.toLowerCase()}`}><Icon size={17} /></div>
      <div className="incident-compact-main">
        <strong>{incident.title}</strong>
        <span>{incident.id} <i /> {incident.site} <i /> {relativeTime(incident.updatedAt)}</span>
      </div>
      <StatusBadge status={incident.status} />
      <ChevronRight size={16} className="row-chevron" />
    </button>
  );
}

export function ResponsableDashboard() {
  const { data: incidents, isLoading } = useIncidents();
  const navigate = useNavigate();

  if (isLoading || !incidents) return <div className="p-8">Chargement...</div>;

  // Show incidents that are assigned (in a real app this would be filtered by current user)
  const myIncidents = incidents.filter((i) => i.assignee === 'Jean Martin' || i.status === 'ASSIGNED' || i.status === 'IN_PROGRESS');
  const inProgress = myIncidents.filter((i) => i.status === 'IN_PROGRESS').length;
  const toAccept = myIncidents.filter((i) => i.assignmentStatus === 'PENDING_ACCEPTANCE').length;
  const toResolve = myIncidents.filter((i) => i.status === 'RESOLVED').length;

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" />MON ESPACE TRAVAIL</div>
          <h1>Bonjour, Jean <span className="wave">✦</span></h1>
          <p>Incidents qui vous sont assignés et en attente d'action.</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', marginBottom: 24 }}>
        <div className="kpi-card kpi-teal">
          <div className="kpi-top"><span>En cours</span><div className="kpi-icon"><Activity size={17} /></div></div>
          <div className="kpi-value-row"><strong>{String(inProgress).padStart(2, '0')}</strong></div>
          <div className="kpi-helper">Interventions actives</div>
          <div className="kpi-spark"><span /><span /><span /><span /><span /><span /><span /></div>
        </div>
        <div className="kpi-card kpi-orange">
          <div className="kpi-top"><span>À accepter</span><div className="kpi-icon"><ShieldAlert size={17} /></div></div>
          <div className="kpi-value-row"><strong>{String(toAccept).padStart(2, '0')}</strong></div>
          <div className="kpi-helper">Affectations en attente</div>
          <div className="kpi-spark"><span /><span /><span /><span /><span /><span /><span /></div>
        </div>
        <div className="kpi-card kpi-purple">
          <div className="kpi-top"><span>À vérifier</span><div className="kpi-icon"><Clock3 size={17} /></div></div>
          <div className="kpi-value-row"><strong>{String(toResolve).padStart(2, '0')}</strong></div>
          <div className="kpi-helper">Résolutions proposées</div>
          <div className="kpi-spark"><span /><span /><span /><span /><span /><span /><span /></div>
        </div>
      </div>

      {/* Assigned incidents list */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Mes incidents assignés</h2>
            <p>{myIncidents.length} incident(s) vous concernent actuellement</p>
          </div>
          <button className="text-button" onClick={() => navigate('/incidents')}>
            Voir tous <ChevronRight size={14} />
          </button>
        </div>
        <div className="watch-list">
          {myIncidents.map((incident) => (
            <AssignedRow
              key={incident.id}
              incident={incident}
              onClick={() => navigate(`/incidents/${incident.id}`)}
            />
          ))}
          {myIncidents.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon"><ClipboardList size={18} /></div>
              <strong>Aucun incident assigné</strong>
              <span>Vous serez notifié lors d'une nouvelle affectation.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
