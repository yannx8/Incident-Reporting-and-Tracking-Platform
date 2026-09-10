import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import L from 'leaflet';
import { api } from '../../api/client';
import { useAuth } from '../../store/authStore';
import { useI18n } from '../../i18n';
import { PRIORITY_COLORS } from '../../constants';
import { escapeHtml, useFormatDate } from '../../lib/utils';
import { Spinner } from '../shared/Spinner';
import { Drawer } from '../drawer/IncidentDrawer';

interface MapIncident {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  priority: string;
  status: string;
  category: string;
  siteName: string;
  siteId: string;
  createdAt: string;
  assignedTo?: string;
  assignmentStatus?: string;
}

interface MapSite {
  id: string;
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  isActive: boolean;
  _count?: { incidents?: number };
}

export function MapPage() {
  const u = useAuth((s) => s.user)!;
  const t = useI18n((s) => s.t);
  const locale = useI18n((s) => s.locale);
  const isAdmin = u.roles.includes('ADMINISTRATOR');
  const isResp = u.roles.includes('RESPONSABLE');

  const [sites, setSites] = useState<MapSite[]>([]);
  const [incidents, setIncidents] = useState<MapIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [filterAssignment, setFilterAssignment] = useState('');
  const [search, setSearch] = useState('');

  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Layer>>(new Map());

  useEffect(() => {
    setLoading(true);
    setError('');
    api<any>('/map/data').then((mapData) => {
      setSites(mapData.sites || []);
      const raw = (mapData.incidents || []) as MapIncident[];
      const mapped = raw
        .filter((i: any) => i.latitude && i.longitude)
        .map((i: any) => ({
          id: i.id,
          title: i.title,
          latitude: i.latitude,
          longitude: i.longitude,
          priority: i.priority,
          status: i.status,
          category: i.category,
          siteName: i.site?.name || '',
          siteId: i.site?.id || '',
          createdAt: i.createdAt,
          assignedTo: i.assignments?.[0]?.responsableProfile?.user?.name,
          assignmentStatus: i.assignments?.[0]?.status
        }));
      setIncidents(mapped);
      setLoading(false);
    }).catch((err) => setError(err.message || t('map.loadError')));
  }, [t]);

  const filteredIncidents = useMemo(() => {
    let list = incidents;
    if (isResp) {
      list = list.filter((i) => i.assignedTo || i.status === 'NEW' || i.status === 'ASSIGNED');
    }
    if (filterPriority) list = list.filter((i) => i.priority === filterPriority);
    if (filterStatus) list = list.filter((i) => i.status === filterStatus);
    if (filterSite) list = list.filter((i) => i.siteId === filterSite);
    if (filterAssignment === 'mine') list = list.filter((i) => i.assignedTo);
    if (filterAssignment === 'unassigned') list = list.filter((i) => !i.assignedTo);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.title.toLowerCase().includes(q) || i.siteName.toLowerCase().includes(q) || i.id.slice(0, 8).toLowerCase().includes(q));
    }
    return list;
  }, [incidents, filterPriority, filterStatus, filterSite, filterAssignment, search, isResp]);

  const kpis = useMemo(() => {
    const active = filteredIncidents.filter((i) => i.status !== 'CLOSED');
    const critical = active.filter((i) => i.priority === 'CRITICAL');
    const inProg = active.filter((i) => i.status === 'IN_PROGRESS');
    const blocked = active.filter((i) => i.status === 'ASSIGNED');
    if (isResp) {
      return [
        { label: t('map.toProcess'), value: active.length, variant: 'teal' },
        { label: t('map.criticalCount'), value: critical.length, variant: 'coral' },
        { label: t('map.inProgress'), value: inProg.length, variant: 'orange' },
        { label: t('map.blocked'), value: blocked.length, variant: 'purple' }
      ];
    }
    return [
      { label: t('map.totalIncidents'), value: active.length, variant: 'teal' },
      { label: t('map.criticalCount'), value: critical.length, variant: 'coral' },
      { label: t('map.inProgress'), value: inProg.length, variant: 'orange' },
      { label: t('map.totalSites'), value: sites.filter((s) => s.isActive).length, variant: 'purple' }
    ];
  }, [filteredIncidents, sites, isResp, t]);

  const initMap = useCallback(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { zoomControl: false }).setView([4.052, 9.768], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    mapRef.current = map;
  }, []);

  useEffect(() => { initMap(); }, [initMap]);
  useEffect(() => {
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  const fitBounds = useCallback((items: { latitude: number; longitude: number }[]) => {
    const map = mapRef.current;
    if (!map || items.length === 0) return;
    if (items.length === 1) {
      map.setView([items[0].latitude, items[0].longitude], 14);
      return;
    }
    const bounds = L.latLngBounds(items.map((i) => [i.latitude, i.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || loading) return;

    markersRef.current.forEach((layer) => map.removeLayer(layer));
    markersRef.current.clear();

    sites.forEach((s) => {
      if (!s.latitude || !s.longitude) return;
      const activeCount = incidents.filter((i) => i.siteId === s.id && i.status !== 'CLOSED').length;
      const icon = L.divIcon({
        className: '',
        html: `<div class="map-site-marker">${activeCount > 0 ? `<span class="map-site-count">${activeCount}</span>` : ''}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      const m = L.marker([s.latitude, s.longitude], { icon }).addTo(map);
      m.bindPopup(`<div class="map-popup site-popup"><div class="map-popup-header">${t('map.siteLabel')}</div><strong>${escapeHtml(s.name)}</strong><div class="map-popup-meta">${escapeHtml(s.address || t('sites.noAddress'))}</div><div class="map-popup-stats">${activeCount} ${t('incidents.total')}</div></div>`);
      markersRef.current.set('site-' + s.id, m);
    });

    filteredIncidents.forEach((i) => {
      const color = PRIORITY_COLORS[i.priority] || '#4aae93';
      const isSelected = selectedId === i.id;
      const radius = isSelected ? 10 : 7;
      const weight = isSelected ? 3 : 2;
      const cm = L.circleMarker([i.latitude, i.longitude], {
        radius,
        color: isSelected ? '#1a2b32' : '#fff',
        weight,
        fillColor: color,
        fillOpacity: 0.9
      }).addTo(map);

      const assignedLabel = i.assignedTo ? `${t('map.assignedTo')}: ${escapeHtml(i.assignedTo)}` : t('map.notAssigned');
      cm.bindPopup(`<div class="map-popup incident-popup"><div class="map-popup-header">${t('map.incidentLabel')} #${i.id.slice(0, 8).toUpperCase()}</div><strong>${escapeHtml(i.title)}</strong><div class="map-popup-badges"><span class="map-popup-priority" style="background:${color}22;color:${color}">${t('priorities.' + i.priority as any)}</span><span class="map-popup-status">${t('incidentStatuses.' + i.status as any)}</span></div><div class="map-popup-row"><span class="map-popup-label">${t('drawer.site')}</span> ${escapeHtml(i.siteName)}</div><div class="map-popup-row"><span class="map-popup-label">${t('map.assignedTo')}</span> ${escapeHtml(i.assignedTo || t('map.notAssigned'))}</div><button class="map-popup-btn" onclick="window.__openDrawer('${i.id}')">${t('map.viewReport')}</button></div>`);

      cm.on('click', () => setSelectedId(i.id));
      markersRef.current.set('inc-' + i.id, cm);
    });

    if (filteredIncidents.length > 0) {
      fitBounds(filteredIncidents);
    } else if (sites.length > 0) {
      fitBounds(sites);
    }
  }, [filteredIncidents, sites, loading, selectedId, fitBounds, t]);

  useEffect(() => {
    (window as any).__openDrawer = (id: string) => { setDrawerId(id); };
    return () => { delete (window as any).__openDrawer; };
  }, []);

  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const m = markersRef.current.get('inc-' + selectedId);
    if (m && 'openPopup' in m) {
      (m as L.Marker).openPopup();
    }
  }, [selectedId]);

  const resetFilters = () => {
    setFilterPriority('');
    setFilterStatus('');
    setFilterSite('');
    setFilterAssignment('');
    setSearch('');
  };

  const hasFilters = filterPriority || filterStatus || filterSite || filterAssignment || search;

  const uniqueSites = useMemo(() => {
    const map = new Map<string, MapSite>();
    incidents.forEach((i) => {
      const s = sites.find((x) => x.id === i.siteId);
      if (s) map.set(s.id, s);
    });
    return Array.from(map.values());
  }, [incidents, sites]);

  const formatDateFn = useFormatDate();

  const priorityOptions = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const statusOptions = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

  return (
    <div className="page opmap-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> {t('map.eyebrow')}</div>
          <h1>{t('map.title')}</h1>
          <p>{isResp ? t('map.subtitleResp') : t('map.subtitle')}</p>
        </div>
      </div>

      <div className="opmap-kpis">
        {kpis.map((k, i) => (
          <div key={i} className={`opmap-kpi opmap-kpi-${k.variant}`}>
            <span className="opmap-kpi-label">{k.label}</span>
            <span className="opmap-kpi-value">{String(k.value).padStart(2, '0')}</span>
          </div>
        ))}
      </div>

      <div className="opmap-filters">
        <select className="filter-select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="">{t('map.filterPriority')}</option>
          {priorityOptions.map((p) => <option key={p} value={p}>{t('priorities.' + p as any)}</option>)}
        </select>
        <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">{t('map.filterStatus')}</option>
          {statusOptions.map((s) => <option key={s} value={s}>{t('incidentStatuses.' + s as any)}</option>)}
        </select>
        <select className="filter-select" value={filterSite} onChange={(e) => setFilterSite(e.target.value)}>
          <option value="">{t('map.filterSite')}</option>
          {uniqueSites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {isResp && (
          <select className="filter-select" value={filterAssignment} onChange={(e) => setFilterAssignment(e.target.value)}>
            <option value="">{t('map.filterAssignment')}</option>
            <option value="mine">{t('map.filterMyInterventions')}</option>
            <option value="unassigned">{t('map.filterUnassigned')}</option>
          </select>
        )}
        <div className="opmap-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input placeholder={t('map.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading && (
        <div className="opmap-loading">
          <Spinner size={24} />
        </div>
      )}

      {!loading && error && (
        <div className="opmap-error">
          <p>{error}</p>
          <button className="button button-outline" onClick={() => window.location.reload()}>{t('map.retry')}</button>
        </div>
      )}

      {!loading && !error && (
        <div className="opmap-layout">
          <div className="opmap-map-area">
            <div ref={ref} className="opmap-map" />
            <div className="opmap-legend">
              <div className="opmap-legend-title">{t('map.legend')}</div>
              <div className="opmap-legend-section">
                <div className="opmap-legend-subtitle">{t('map.legendPriority')}</div>
                {priorityOptions.map((p) => (
                  <div key={p} className="opmap-legend-item">
                    <span className="map-dot" style={{ background: PRIORITY_COLORS[p] }} />
                    <span>{t('priorities.' + p as any)}</span>
                  </div>
                ))}
              </div>
              <div className="opmap-legend-section">
                <div className="opmap-legend-subtitle">{t('map.legendType')}</div>
                <div className="opmap-legend-item">
                  <span className="map-site-marker-sm" />
                  <span>{t('map.site')}</span>
                </div>
                <div className="opmap-legend-item">
                  <span className="map-dot" style={{ background: '#4aae93' }} />
                  <span>{t('map.incident')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="opmap-panel">
            <div className="opmap-panel-header">
              <h3>{isResp ? t('map.interventions') : t('map.totalIncidents')}</h3>
              <span className="opmap-panel-count">{filteredIncidents.length}</span>
            </div>

            {filteredIncidents.length === 0 && !hasFilters && incidents.length === 0 && (
              <div className="opmap-empty">
                <p>{t('map.noIncidentsToDisplay')}</p>
              </div>
            )}

            {filteredIncidents.length === 0 && hasFilters && (
              <div className="opmap-empty">
                <p>{t('map.noIncidentsMatchFilters')}</p>
                <button className="button button-outline button-small" onClick={resetFilters}>{t('map.resetFilters')}</button>
              </div>
            )}

            <div className="opmap-panel-list">
              {filteredIncidents.map((i) => (
                <div
                  key={i.id}
                  className={`opmap-panel-item ${selectedId === i.id ? 'opmap-panel-item-active' : ''}`}
                  onClick={() => { setSelectedId(i.id); setDrawerId(i.id); }}
                >
                  <div className="opmap-panel-item-top">
                    <span className="opmap-panel-dot" style={{ background: PRIORITY_COLORS[i.priority] }} />
                    <span className="opmap-panel-priority">{t('priorities.' + i.priority as any)}</span>
                    <span className="opmap-panel-status">{t('incidentStatuses.' + i.status as any)}</span>
                  </div>
                  <div className="opmap-panel-title">{i.title}</div>
                  <div className="opmap-panel-meta">{i.siteName}</div>
                  {i.assignedTo && <div className="opmap-panel-assigned">{t('map.assignedTo')}: {i.assignedTo}</div>}
                  <div className="opmap-panel-date">{formatDateFn(i.createdAt)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {drawerId && (
        <Drawer id={drawerId} onClose={() => { setDrawerId(null); setSelectedId(null); }} />
      )}
    </div>
  );
}
