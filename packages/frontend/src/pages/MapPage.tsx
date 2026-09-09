import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIncidents } from '../api/incidents';
import { sites, statusMeta, priorityMeta } from '../lib/mockData';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, AlertTriangle, Activity } from 'lucide-react';
import { Incident, Priority, Status } from '../types';

// Fix leaflet icon in React builds
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createIncidentIcon = (priority: string, status: string) => L.divIcon({
  className: '',
  html: `<div class="incident-marker ${priority === 'CRITICAL' ? 'marker-critical' : status === 'CLOSED' ? 'marker-closed' : ''}" style="position:relative;transform:translate(-50%,-50%)"><span>${
    priority === 'CRITICAL'
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>'
      : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>'
  }</span></div>`,
});

function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`priority-badge ${priorityMeta[priority].className}`}><i />{priorityMeta[priority].label}</span>;
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`status-badge ${statusMeta[status].className}`}><i />{statusMeta[status].label}</span>;
}

export function MapPage() {
  const { data: incidents, isLoading } = useIncidents();
  const navigate = useNavigate();
  const [showClosed, setShowClosed] = useState(false);
  const [selectedSite, setSelectedSite] = useState('ALL');

  if (isLoading || !incidents) return <div className="p-8">Chargement de la carte...</div>;

  const displayed = incidents.filter((i) =>
    (showClosed || i.status !== 'CLOSED') &&
    (selectedSite === 'ALL' || i.siteId === selectedSite)
  );

  const active = incidents.filter((i) => i.status !== 'CLOSED');
  const critical = active.filter((i) => i.priority === 'CRITICAL').length;

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" />VUE GÉOGRAPHIQUE</div>
          <h1>Carte des incidents</h1>
          <p>Visualisez et naviguez entre tous les incidents géolocalisés.</p>
        </div>
        <div className="map-actions">
          <select
            className="toolbar-filters"
            style={{ height: 36, border: '1px solid #dce5e6', background: '#fff', borderRadius: 7, padding: '0 10px', fontSize: 11, color: '#62767c' }}
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
          >
            <option value="ALL">Tous les sites</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button
            className={`toggle-button ${showClosed ? 'toggle-on' : ''}`}
            onClick={() => setShowClosed((v) => !v)}
          >
            <span className="toggle-dot" />Incidents clôturés
          </button>
        </div>
      </div>

      <section className="panel full-map-panel">
        <div className="full-map">
          <MapContainer
            center={[4.052, 9.773]}
            zoom={13}
            style={{ height: '100%', width: '100%', zIndex: 1 }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Site perimeter circles */}
            {sites.filter((s) => s.active).map((site) => (
              <Circle
                key={site.id}
                center={[site.lat, site.lng]}
                radius={200}
                pathOptions={{ color: site.color, fillColor: site.color, fillOpacity: 0.08, weight: 1.5 }}
              />
            ))}
            {/* Incident markers */}
            {displayed.map((incident) => (
              <Marker
                key={incident.id}
                position={[incident.lat, incident.lng]}
                icon={createIncidentIcon(incident.priority, incident.status)}
                eventHandlers={{ click: () => navigate(`/incidents/${incident.id}`) }}
              >
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <strong style={{ fontSize: 11, color: '#29444d' }}>{incident.title}</strong>
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <PriorityBadge priority={incident.priority} />
                      <StatusBadge status={incident.status} />
                    </div>
                    <div style={{ marginTop: 8, fontSize: 10, color: '#7f9195', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={11} />{incident.site} - {incident.location}
                    </div>
                    <button
                      style={{ marginTop: 10, background: '#286c61', color: 'white', border: 'none', borderRadius: 5, padding: '5px 10px', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}
                      onClick={() => navigate(`/incidents/${incident.id}`)}
                    >
                      Voir le dossier
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="full-map-footer">
          <div className="map-legend">
            <span><i className="map-legend i legend-active" style={{ background: '#5caa96', width: 7, height: 7, borderRadius: '50%', display: 'inline-block' }} /><b>{active.length - critical}</b> actifs</span>
            <span><i style={{ background: '#c96570', width: 7, height: 7, borderRadius: '50%', display: 'inline-block' }} /><b>{critical}</b> critique{critical !== 1 ? 's' : ''}</span>
            {showClosed && <span><i style={{ background: '#9eb0b4', width: 7, height: 7, borderRadius: '50%', display: 'inline-block' }} /><b>{incidents.filter((i) => i.status === 'CLOSED').length}</b> clôturé{incidents.filter((i) => i.status === 'CLOSED').length !== 1 ? 's' : ''}</span>}
          </div>
          <span className="map-attribution">Fond de carte &copy; OpenStreetMap contributors</span>
        </div>
      </section>

      {/* Site summary cards */}
      <div style={{ marginTop: 17 }}>
        <div className="site-grid">
          {sites.map((site) => {
            const siteIncidents = incidents.filter((i) => i.siteId === site.id && i.status !== 'CLOSED');
            const siteCritical = siteIncidents.filter((i) => i.priority === 'CRITICAL').length;
            return (
              <div key={site.id} className="panel site-card">
                <div className="site-card-top">
                  <div className="site-building" style={{ background: `${site.color}22`, color: site.color }}>
                    <Activity size={18} />
                  </div>
                  <div>
                    <div className={`site-state ${site.active ? 'site-active' : ''}`}><i />{site.active ? 'Opérationnel' : 'Inactif'}</div>
                  </div>
                  <button className="icon-button small" onClick={() => navigate(`/incidents?site=${site.id}`)}>
                    <AlertTriangle size={14} />
                  </button>
                </div>
                <h3>{site.name}</h3>
                <p><MapPin size={11} />{site.address}</p>
                <div className="site-metrics">
                  <div><strong>{siteIncidents.length}</strong><span>Actifs</span></div>
                  <div><strong style={{ color: siteCritical > 0 ? '#c96570' : undefined }}>{siteCritical}</strong><span>Critiques</span></div>
                  <div><strong>{site.incidents}</strong><span>Total</span></div>
                </div>
                <div className="site-bar">
                  <span style={{ width: `${Math.min(100, (siteIncidents.length / Math.max(site.incidents, 1)) * 100)}%`, background: site.color, height: '100%', display: 'block', borderRadius: 'inherit' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
