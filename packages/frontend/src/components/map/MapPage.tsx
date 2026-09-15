import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import L from 'leaflet';
import { Layers, Navigation, Filter, AlertTriangle, Building2 } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../store/authStore';
import { useI18n } from '../../i18n';
import { PRIORITY_COLORS } from '../../constants';
import { escapeHtml } from '../../lib/utils';
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
}

interface MapSite {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  latitude: number;
  longitude: number;
  isActive: boolean;
  radiusMeters?: number;
}

const PRIORITY_COLORS_MAP: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#d97706',
  LOW: '#16a34a',
};

function createIncidentIcon(priority: string): L.DivIcon {
  const color = PRIORITY_COLORS_MAP[priority] || '#6b7280';
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function createSiteIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;background:#2563EB;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

export function MapPage() {
  const u = useAuth((s) => s.user)!;
  const t = useI18n((s) => s.t);
  const isAdmin = u.roles.includes('ADMINISTRATOR');

  const [sites, setSites] = useState<MapSite[]>([]);
  const [incidents, setIncidents] = useState<MapIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [showIncidents, setShowIncidents] = useState(true);
  const [showSites, setShowSites] = useState(true);
  const [mapLayer, setMapLayer] = useState<'standard' | 'satellite'>('standard');

  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Layer>>(new Map());
  const circlesRef = useRef<Map<string, L.Circle>>(new Map());
  const tileRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api<any>('/map/data'),
      api<{ items: any[] }>('/incidents?limit=200'),
    ]).then(([mapData, incData]) => {
      setSites(mapData.sites || []);
      const raw = (incData.items || []) as any[];
      const mapped = raw
        .filter((i) => i.latitude && i.longitude)
        .map((i) => ({
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
          assignedTo: i.assignments?.[0]?.responsable?.user?.name,
        }));
      setIncidents(mapped);
    }).catch((err) => setError(err.message || t('map.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  const filteredIncidents = useMemo(() => {
    let list = incidents;
    if (statusFilter !== 'ALL') list = list.filter((i) => i.status === statusFilter);
    if (priorityFilter !== 'ALL') list = list.filter((i) => i.priority === priorityFilter);
    return list;
  }, [incidents, statusFilter, priorityFilter]);

  const mapCenter: [number, number] = useMemo(() => {
    if (sites.length === 0) return [4.05, 9.70];
    const avgLat = sites.reduce((sum, s) => sum + s.latitude, 0) / sites.length;
    const avgLng = sites.reduce((sum, s) => sum + s.longitude, 0) / sites.length;
    return [avgLat, avgLng];
  }, [sites]);

  const initMap = useCallback(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { zoomControl: false }).setView(mapCenter, 13);
    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    tileRef.current = street;
    L.control.zoom({ position: 'topright' }).addTo(map);
    mapRef.current = map;
    requestAnimationFrame(() => { requestAnimationFrame(() => { map.invalidateSize(); }); });
  }, [mapCenter]);

  useEffect(() => { initMap(); }, [initMap]);
  useEffect(() => {
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileRef.current) return;
    map.removeLayer(tileRef.current);
    const layer = mapLayer === 'satellite'
      ? L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri'
        })
      : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        });
    layer.addTo(map);
    tileRef.current = layer;
  }, [mapLayer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || loading) return;

    markersRef.current.forEach((layer) => map.removeLayer(layer));
    markersRef.current.clear();
    circlesRef.current.forEach((c) => map.removeLayer(c));
    circlesRef.current.clear();

    if (showSites) {
      sites.forEach((s) => {
        if (!s.latitude || !s.longitude) return;
        const m = L.marker([s.latitude, s.longitude], { icon: createSiteIcon() }).addTo(map);
        m.bindPopup(`<div style="padding:4px"><strong style="font-size:13px">${escapeHtml(s.name)}</strong><div style="font-size:11px;color:#6b7280;margin-top:2px">${escapeHtml(s.address || '')}${s.city ? ', ' + escapeHtml(s.city) : ''}</div></div>`);
        markersRef.current.set('site-' + s.id, m);

        const radius = s.radiusMeters && s.radiusMeters > 0 ? s.radiusMeters : 250;
        if (radius > 0) {
          const circle = L.circle([s.latitude, s.longitude], {
            radius,
            color: '#0F766E',
            fillColor: '#0F766E',
            fillOpacity: 0.055,
            weight: 1.75,
            dashArray: '7, 5',
            opacity: 0.85,
            interactive: false,
          }).addTo(map);
          circlesRef.current.set('circle-' + s.id, circle);
        }
      });
    }

    if (showIncidents) {
      filteredIncidents.forEach((i) => {
        const cm = L.marker([i.latitude, i.longitude], { icon: createIncidentIcon(i.priority) }).addTo(map);
        const assignedLabel = i.assignedTo || t('map.notAssigned');
        cm.bindPopup(`<div style="padding:4px;min-width:180px">
          <div style="font-size:10px;color:#6b7280;font-family:monospace">${escapeHtml(i.siteName)}</div>
          <strong style="font-size:13px;margin:4px 0;display:block">${escapeHtml(i.title)}</strong>
          <div style="display:flex;gap:6px;margin:6px 0">
            <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${PRIORITY_COLORS_MAP[i.priority] || '#6b7280'}22;color:${PRIORITY_COLORS_MAP[i.priority] || '#6b7280'};font-weight:600">${t('priorities.' + i.priority as any)}</span>
            <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:#f1f5f9;color:#475569;font-weight:600">${t('incidentStatuses.' + i.status as any)}</span>
          </div>
          <div style="font-size:11px;color:#6b7280">${t('map.assignedTo')}: ${escapeHtml(assignedLabel)}</div>
          <button style="margin-top:8px;font-size:11px;color:#2563eb;font-weight:600;background:none;border:none;cursor:pointer;padding:0" onclick="window.__openMapDrawer('${i.id}')">${t('map.viewReport')} &rarr;</button>
        </div>`);
        markersRef.current.set('inc-' + i.id, cm);
      });
    }

    if (filteredIncidents.length > 0 && showIncidents) {
      const bounds = L.latLngBounds(filteredIncidents.map((i) => [i.latitude, i.longitude] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (sites.length > 0 && showSites) {
      const bounds = L.latLngBounds(sites.map((s) => [s.latitude, s.longitude] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [filteredIncidents, sites, loading, showIncidents, showSites, t]);

  useEffect(() => {
    (window as any).__openMapDrawer = (id: string) => { setDrawerId(id); };
    return () => { delete (window as any).__openMapDrawer; };
  }, []);

  const myLocation = () => {
    if (!mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current!.setView([pos.coords.latitude, pos.coords.longitude], 15);
      },
      () => {},
      { timeout: 8000 }
    );
  };

  const resetFilters = () => {
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
  };

  return (
    <div className="page" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-dark)', fontFamily: "'Manrope', sans-serif", margin: 0 }}>{t('map.title')}</h1>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>{t('map.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: showFilters ? '#EFF6FF' : '#fff', color: showFilters ? 'var(--blue)' : 'var(--text)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <Filter size={16} /> Filters
          </button>
          <button
            onClick={myLocation}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: '#fff', color: 'var(--text)', cursor: 'pointer',
            }}
          >
            <Navigation size={16} /> {t('map.myLocation')}
          </button>
        </div>
      </div>

      {showFilters && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid var(--border-light)',
        }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ height: 34, border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, padding: '0 10px', background: '#fff', cursor: 'pointer' }}
          >
            <option value="ALL">{t('map.filterStatus')}</option>
            {['NEW','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED'].map((s) => (
              <option key={s} value={s}>{t(`incidentStatuses.${s}` as any)}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ height: 34, border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, padding: '0 10px', background: '#fff', cursor: 'pointer' }}
          >
            <option value="ALL">{t('map.filterPriority')}</option>
            {['CRITICAL','HIGH','MEDIUM','LOW'].map((p) => (
              <option key={p} value={p}>{t(`priorities.${p}` as any)}</option>
            ))}
          </select>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748B', cursor: 'pointer' }}>
              <input type="checkbox" checked={showIncidents} onChange={(e) => setShowIncidents(e.target.checked)} style={{ accentColor: 'var(--blue)' }} />
              <AlertTriangle size={12} /> {t('map.incident')} ({filteredIncidents.length})
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748B', cursor: 'pointer' }}>
              <input type="checkbox" checked={showSites} onChange={(e) => setShowSites(e.target.checked)} style={{ accentColor: 'var(--blue)' }} />
              <Building2 size={12} /> {t('map.site')} ({sites.length})
            </label>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={24} /></div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-desc">{error}</div>
          <button className="button button-outline" onClick={() => window.location.reload()}>{t('common.retry')}</button>
        </div>
      )}

      {!loading && !error && (
        <div style={{ position: 'relative', height: 'calc(100vh - 240px)', minHeight: 400, borderRadius: 12, overflow: 'hidden', background: '#e2e8f0' }}>
          <div ref={ref} style={{ height: '100%', width: '100%' }} />

          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)', borderRadius: 8, padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
              {filteredIncidents.length} {t('incidents.total')} &middot; {sites.length} {t('map.site')}
            </span>
          </div>

          <button
            onClick={() => setMapLayer(mapLayer === 'standard' ? 'satellite' : 'standard')}
            style={{
              position: 'absolute', top: 12, right: 12, zIndex: 1000,
              background: '#fff', borderRadius: 8, padding: 8, border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer',
            }}
            title={mapLayer === 'satellite' ? 'Street view' : 'Satellite view'}
          >
            <Layers size={18} color="#475569" />
          </button>

          <div style={{
            position: 'absolute', bottom: 12, left: 12, zIndex: 1000,
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)',
            borderRadius: 8, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {t('map.legend')}
            </div>
            {(['CRITICAL','HIGH','MEDIUM','LOW'] as const).map((p) => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#475569', marginBottom: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: PRIORITY_COLORS_MAP[p], border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                {t(`priorities.${p}` as any)}
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#475569', marginTop: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3B82F6', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
              {t('map.site')}
            </div>
          </div>
        </div>
      )}

      {drawerId && (
        <Drawer id={drawerId} onClose={() => setDrawerId(null)} />
      )}
    </div>
  );
}
