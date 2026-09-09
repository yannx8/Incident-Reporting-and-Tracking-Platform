import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIncidents } from '../api/incidents';
import { sites, statusMeta, categoryIcons, relativeTime, priorityMeta } from '../lib/mockData';
import { Plus, Search, SlidersHorizontal, ChevronRight, MapPin, ClipboardList } from 'lucide-react';
import { Status, Priority } from '../types';

function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`priority-badge ${priorityMeta[priority].className}`}><i />{priorityMeta[priority].label}</span>;
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`status-badge ${statusMeta[status].className}`}><i />{statusMeta[status].label}</span>;
}

function IncidentTableRow({ incident, onClick }: { incident: import('../types').Incident, onClick: () => void }) {
  const Icon = categoryIcons[incident.category];
  return (
    <button className="table-row w-full text-left" onClick={onClick}>
      <div className="table-incident">
        <div className={`table-category category-${incident.priority.toLowerCase()}`}><Icon size={16} /></div>
        <div><strong>{incident.title}</strong><span>{incident.id} · {incident.category}</span></div>
      </div>
      <span className="table-site"><MapPin size={14} />{incident.site}</span>
      <PriorityBadge priority={incident.priority} />
      <StatusBadge status={incident.status} />
      <span className="table-date">{relativeTime(incident.updatedAt)}</span>
      <ChevronRight size={16} className="row-chevron" />
    </button>
  );
}

export function IncidentListPage() {
  const { data: incidents, isLoading } = useIncidents();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'ALL' | Status>('ALL');
  const [priority, setPriority] = useState<'ALL' | Priority>('ALL');
  const [site, setSite] = useState('ALL');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!incidents) return [];
    return incidents.filter((item) => 
      (!query || `${item.title} ${item.description} ${item.id}`.toLowerCase().includes(query.toLowerCase())) && 
      (status === 'ALL' || item.status === status) && 
      (priority === 'ALL' || item.priority === priority) && 
      (site === 'ALL' || item.siteId === site)
    );
  }, [incidents, query, status, priority, site]);

  const pages = Math.max(1, Math.ceil(filtered.length / 6));
  const shown = filtered.slice((page - 1) * 6, page * 6);

  useEffect(() => setPage(1), [query, status, priority, site]);

  if (isLoading || !incidents) return <div className="p-8">Chargement...</div>;

  return (
    <div className="page incidents-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" />CENTRE OPÉRATIONNEL</div>
          <h1>Incidents</h1>
          <p>Suivez, qualifiez et coordonnez les interventions de votre organisation.</p>
        </div>
        <button className="button button-primary" onClick={() => navigate('/incidents/new')}>
          <Plus size={17} />Nouveau signalement
        </button>
      </div>

      <div className="list-kpis">
        <div><span>Tout</span><strong>{incidents.length}</strong></div>
        <div><span>Actifs</span><strong>{incidents.filter((i) => i.status !== 'CLOSED').length}</strong></div>
        <div><span>Critiques</span><strong className="text-critical">{incidents.filter((i) => i.priority === 'CRITICAL' && i.status !== 'CLOSED').length}</strong></div>
        <div><span>À vérifier</span><strong className="text-purple">{incidents.filter((i) => i.status === 'RESOLVED').length}</strong></div>
      </div>

      <section className="panel incidents-table-panel">
        <div className="table-toolbar">
          <div className="table-search">
            <Search size={17} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher par titre, description ou identifiant…" />
          </div>
          <div className="toolbar-filters">
            <select value={status} onChange={(e) => setStatus(e.target.value as 'ALL' | Status)}>
              <option value="ALL">Tous les statuts</option>
              {Object.entries(statusMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value as 'ALL' | Priority)}>
              <option value="ALL">Toutes priorités</option>
              {Object.entries(priorityMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
            </select>
            <select value={site} onChange={(e) => setSite(e.target.value)}>
              <option value="ALL">Tous les sites</option>
              {sites.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button className="filter-icon-button">
              <SlidersHorizontal size={16} /><span>Filtres</span>
            </button>
          </div>
        </div>

        <div className="table-head">
          <span>Incident</span>
          <span>Site</span>
          <span>Priorité</span>
          <span>Statut</span>
          <span>Mis à jour</span>
          <span />
        </div>

        {shown.map((incident) => (
          <IncidentTableRow key={incident.id} incident={incident} onClick={() => navigate(`/incidents/${incident.id}`)} />
        ))}

        {shown.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon"><ClipboardList size={18} /></div>
            <strong>Aucun incident trouvé</strong>
            <span>Les éléments apparaîtront ici.</span>
          </div>
        )}

        <div className="table-footer">
          <span>Affichage de <b>{shown.length ? (page - 1) * 6 + 1 : 0}–{Math.min(page * 6, filtered.length)}</b> sur <b>{filtered.length}</b> incidents</span>
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage((c) => c - 1)}><ChevronRight size={15} className="rotate-180" /></button>
            {Array.from({ length: pages }, (_, index) => (
              <button key={index} className={page === index + 1 ? 'current' : ''} onClick={() => setPage(index + 1)}>{index + 1}</button>
            ))}
            <button disabled={page === pages} onClick={() => setPage((c) => c + 1)}><ChevronRight size={15} /></button>
          </div>
        </div>
      </section>
    </div>
  );
}
