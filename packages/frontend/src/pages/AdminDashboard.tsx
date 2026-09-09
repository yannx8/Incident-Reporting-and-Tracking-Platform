import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useIncidents } from '../api/incidents';
import { sites, statusMeta, categoryIcons, relativeTime } from '../lib/mockData';
import { Activity, AlertTriangle, ShieldAlert, Clock3, ChevronRight, Plus, MapPin, CircleDot, TrendingUp, Check, CheckCircle2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Incident, Priority, Status } from '../types';

function StatusIcon({ status }: { status: Status }) {
  if (status === 'CLOSED') return <Check size={14} />;
  if (status === 'RESOLVED') return <CheckCircle2 size={14} />;
  if (status === 'NEW') return <AlertTriangle size={14} />;
  return <Activity size={14} />;
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const meta = {
    LOW: { label: 'Basse', className: 'priority-low' },
    MEDIUM: { label: 'Moyenne', className: 'priority-medium' },
    HIGH: { label: 'Haute', className: 'priority-high' },
    CRITICAL: { label: 'Critique', className: 'priority-critical' },
  };
  return <span className={`priority-badge ${meta[priority].className}`}><i />{meta[priority].label}</span>;
}

function KpiCard({ label, value, change, trend, helper, accent, icon: Icon }: { label: string, value: string, change: string, trend: string, helper: string, accent: string, icon: any }) {
  return (
    <div className={`kpi-card kpi-${accent}`}>
      <div className="kpi-top"><span>{label}</span><div className="kpi-icon"><Icon size={17} /></div></div>
      <div className="kpi-value-row"><strong>{value}</strong><span className={`kpi-change trend-${trend}`}>{change}</span></div>
      <div className="kpi-helper">{helper}</div>
      <div className="kpi-spark"><span /><span /><span /><span /><span /><span /><span /></div>
    </div>
  );
}

function PanelHeader({ title, subtitle, action, onAction }: { title: string, subtitle: string, action: string, onAction: () => void }) {
  return (
    <div className="panel-header">
      <div><h2>{title}</h2><p>{subtitle}</p></div>
      <button className="text-button" onClick={onAction}>{action}<ChevronRight size={14} /></button>
    </div>
  );
}

function IncidentCompactRow({ incident, onClick }: { incident: Incident, onClick: () => void }) {
  const Icon = categoryIcons[incident.category];
  return (
    <button className="incident-compact" onClick={onClick}>
      <div className={`incident-category category-${incident.priority.toLowerCase()}`}><Icon size={17} /></div>
      <div className="incident-compact-main"><strong>{incident.title}</strong><span>{incident.id} <i /> {incident.site} <i /> {relativeTime(incident.updatedAt)}</span></div>
      <PriorityBadge priority={incident.priority} /><ChevronRight size={16} className="row-chevron" />
    </button>
  );
}

function ActivityRow({ incident, onClick }: { incident: Incident, onClick: () => void }) {
  return (
    <button className="activity-row" onClick={onClick}>
      <div className={`activity-symbol ${statusMeta[incident.status].className}`}><StatusIcon status={incident.status} /></div>
      <div className="activity-copy"><strong>{incident.audit[0]?.label ?? 'Signalement mis à jour'}</strong><span><b>{incident.id}</b> · {incident.title}</span></div>
      <time>{relativeTime(incident.updatedAt)}</time><ChevronRight size={15} />
    </button>
  );
}

// Custom DivIcons for react-leaflet to match the MVP styling
const createIncidentIcon = (priority: string, status: string) => L.divIcon({
  className: '',
  html: `<div class="incident-marker ${priority === 'CRITICAL' ? 'marker-critical' : status === 'CLOSED' ? 'marker-closed' : ''}" style="position: relative; transform: translate(-50%, -50%);"><span>${priority === 'CRITICAL' ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>' : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>'}</span></div>`
});

export function AdminDashboard() {
  const { data: incidents, isLoading } = useIncidents();
  const navigate = useNavigate();

  if (isLoading || !incidents) return <div className="p-8">Chargement...</div>;

  const active = incidents.filter((item) => item.status !== 'CLOSED');
  const critical = active.filter((item) => item.priority === 'CRITICAL').length;
  const toReview = incidents.filter((item) => item.status === 'NEW' || item.status === 'RESOLVED');
  const latest = [...incidents].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 5);

  const onOpen = (id: string) => navigate(`/incidents/${id}`);
  const onCreate = () => navigate('/incidents/new');
  const onViewAll = () => navigate('/incidents');

  return (
    <div className="page dashboard-page">
      <div className="page-heading dashboard-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" />MARDI 03 SEPTEMBRE 2026 <span className="eyebrow-separator">·</span> RAPPORT DU JOUR</div>
          <h1>Bonjour, Sonia <span className="wave">✦</span></h1>
          <p>Voici ce qui se passe sur vos sites aujourd’hui.</p>
        </div>
        <button className="button button-primary" onClick={onCreate}><Plus size={17} />Nouveau signalement</button>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Incidents actifs" value={String(active.length).padStart(2, '0')} change="12%" trend="up" helper="vs. mois dernier" accent="teal" icon={Activity} />
        <KpiCard label="À traiter aujourd’hui" value={String(toReview.length).padStart(2, '0')} change="4" trend="neutral" helper="nouveaux ou à vérifier" accent="orange" icon={AlertTriangle} />
        <KpiCard label="Incidents critiques" value={String(critical).padStart(2, '0')} change="2" trend="down" helper="vs. semaine dernière" accent="rose" icon={ShieldAlert} />
        <KpiCard label="Délai moyen" value="2,4 j" change="18%" trend="up" helper="de la création à la clôture" accent="purple" icon={Clock3} />
      </div>

      <div className="dashboard-grid-top">
        <section className="panel watch-panel">
          <PanelHeader title="À surveiller" subtitle={`${toReview.length} actions nécessitent votre attention`} action="Voir tous les incidents" onAction={onViewAll} />
          <div className="watch-list">
            {toReview.slice(0, 4).map((incident) => <IncidentCompactRow key={incident.id} incident={incident} onClick={() => onOpen(incident.id)} />)}
          </div>
          {toReview.length === 0 && <div className="empty-state compact"><strong>Aucune action en attente</strong></div>}
        </section>

        <section className="panel map-panel">
          <PanelHeader title="Vue géographique" subtitle="Incidents actifs sur vos sites" action="Ouvrir la carte" onAction={onViewAll} />
          <div className="mini-map h-48 relative rounded-md overflow-hidden z-0">
             <MapContainer center={[4.05, 9.77]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {active.map(incident => (
                  <Marker 
                    key={incident.id} 
                    position={[incident.lat, incident.lng]} 
                    icon={createIncidentIcon(incident.priority, incident.status)}
                    eventHandlers={{ click: () => onOpen(incident.id) }}
                  >
                  </Marker>
                ))}
             </MapContainer>
          </div>
          <div className="map-footer">
            <span><i className="map-dot dot-critical" />Critique <b>{critical}</b></span>
            <span><i className="map-dot dot-active" />Actif <b>{active.length - critical}</b></span>
            <span><MapPin size={13} />4 sites</span>
          </div>
        </section>
      </div>

      <div className="dashboard-grid-bottom">
        <section className="panel activity-panel">
          <PanelHeader title="Activité récente" subtitle="Les dernières actions de votre organisation" action="Voir l’historique" onAction={onViewAll} />
          <div className="activity-list">
            {latest.map((incident) => <ActivityRow key={incident.id} incident={incident} onClick={() => onOpen(incident.id)} />)}
          </div>
        </section>

        <section className="panel workload-panel">
          <PanelHeader title="Charge de l’équipe" subtitle="Répartition des incidents actifs" action="Gérer l’équipe" onAction={() => {}} />
          <div className="workload-summary">
            <div><strong>{active.length}</strong><span>incidents actifs</span></div>
            <div className="workload-average"><TrendingUp size={15} /><span>+8,4%</span><small>ce mois</small></div>
          </div>
          <div className="stacked-bar">
            <span style={{ width: '39%', background: '#2f7a6d' }} />
            <span style={{ width: '28%', background: '#e7a85f' }} />
            <span style={{ width: '20%', background: '#8c7ab4' }} />
            <span style={{ width: '13%', background: '#d3dce0' }} />
          </div>
          <div className="workload-legend">
            <span><i style={{ background: '#2f7a6d' }} />Jean Martin <b>5</b></span>
            <span><i style={{ background: '#e7a85f' }} />Aïcha Kamara <b>4</b></span>
            <span><i style={{ background: '#8c7ab4' }} />Non assignés <b>3</b></span>
          </div>
          <div className="workload-note"><CircleDot size={14} /><span>La charge moyenne reste <strong>équilibrée</strong> cette semaine.</span></div>
        </section>
      </div>
    </div>
  );
}
