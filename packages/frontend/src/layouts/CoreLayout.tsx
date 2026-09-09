import React, { useState } from 'react';
import {
  Menu, X, Settings, LayoutDashboard, ClipboardList, Map,
  ChevronDown, Sparkles, Settings2, MoreHorizontal, ChevronRight,
  Search, Bell, AlertTriangle, CheckCircle2, Activity,
} from 'lucide-react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';

export interface CoreLayoutProps {
  children?: React.ReactNode;
}

// Notification data (in a real app this would come from an API hook)
const DEMO_NOTIFICATIONS = [
  { id: 'n1', type: 'critical', title: 'Nouvel incident critique', body: 'Fuite d\'eau - atelier mecanique', at: 'il y a 1 h', read: false, incidentId: 'INC-2408' },
  { id: 'n2', type: 'info', title: 'Resolution a verifier', body: 'Banc exterieur descelle', at: 'il y a 3 h', read: false, incidentId: 'INC-2406' },
  { id: 'n3', type: 'success', title: 'Intervention demarree', body: 'Eclairage defectueux - allee B', at: 'il y a 4 h', read: true, incidentId: 'INC-2409' },
];

function NotifIcon({ type }: { type: string }) {
  if (type === 'critical') return <AlertTriangle size={14} />;
  if (type === 'success') return <CheckCircle2 size={14} />;
  return <Activity size={14} />;
}

export function CoreLayout({ children }: CoreLayoutProps = {}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const closeMobile = () => setMobileOpen(false);

  const getPageTitle = (pathname: string) => {
    if (pathname.startsWith('/incidents/new')) return 'Nouveau signalement';
    if (pathname.startsWith('/incidents/')) return 'Details incident';
    if (pathname.startsWith('/incidents')) return 'Incidents';
    if (pathname.startsWith('/admin')) return 'Administration';
    if (pathname.startsWith('/responsable')) return 'Responsable';
    if (pathname.startsWith('/map')) return 'Carte';
    return 'Vue ensemble';
  };

  const unreadCount = DEMO_NOTIFICATIONS.filter((n) => !n.read).length;

  const isActive = (prefix: string) => location.pathname.startsWith(prefix);

  return (
    <div className="app-shell">
      {mobileOpen && <div className="mobile-overlay" onClick={closeMobile} />}
      {notifsOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 29 }}
          onClick={() => setNotifsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><span /><span /><span /></div>
          <div><strong>NEXUS</strong><small>INCIDENTS</small></div>
          <button className="close-mobile" onClick={closeMobile}><X size={17} /></button>
        </div>

        <div className="org-switcher">
          <div className="org-avatar">CH</div>
          <div className="org-copy"><span>Organisation</span><strong>Campus Horizon</strong></div>
          <ChevronDown size={15} />
        </div>

        <nav className="sidebar-nav">
          <p className="nav-label">OPERATIONS</p>
          <NavLink
            to="/incidents"
            className={() => `nav-item ${isActive('/incidents') ? 'nav-active' : ''}`}
            onClick={closeMobile}
          >
            <ClipboardList size={18} strokeWidth={isActive('/incidents') ? 2.3 : 1.8} />
            <span>Incidents</span>
          </NavLink>
          <NavLink
            to="/map"
            className={() => `nav-item ${isActive('/map') ? 'nav-active' : ''}`}
            onClick={closeMobile}
          >
            <Map size={18} strokeWidth={isActive('/map') ? 2.3 : 1.8} />
            <span>Carte</span>
          </NavLink>
          <NavLink
            to="/responsable"
            className={() => `nav-item ${isActive('/responsable') ? 'nav-active' : ''}`}
            onClick={closeMobile}
          >
            <LayoutDashboard size={18} strokeWidth={isActive('/responsable') ? 2.3 : 1.8} />
            <span>Responsable</span>
          </NavLink>

          <p className="nav-label nav-label-spaced">ADMINISTRATION</p>
          <NavLink
            to="/admin"
            className={() => `nav-item ${isActive('/admin') ? 'nav-active' : ''}`}
            onClick={closeMobile}
          >
            <Settings size={18} strokeWidth={isActive('/admin') ? 2.3 : 1.8} />
            <span>Admin</span>
          </NavLink>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <Sparkles size={16} />
            <div>
              <strong>Tout est sous controle</strong>
              <span>93% des incidents dans les delais.</span>
            </div>
          </div>
          <button className="nav-item">
            <Settings2 size={18} strokeWidth={1.8} />
            <span>Parametres</span>
          </button>
          <div className="user-mini">
            <div className="avatar avatar-green">SL</div>
            <div><strong>Sonia Leroy</strong><span>Administrator</span></div>
            <MoreHorizontal size={17} />
          </div>
        </div>
      </aside>

      {/* Content shell */}
      <div className="content-shell">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)}>
            <Menu size={21} />
          </button>
          <div className="breadcrumbs">
            <span>Workspace</span><ChevronRight size={14} />
            <strong>{getPageTitle(location.pathname)}</strong>
          </div>
          <div className="top-actions">
            <div className="top-search">
              <Search size={17} />
              <input placeholder="Rechercher..." />
              <kbd>Ctrl K</kbd>
            </div>

            {/* Notification bell */}
            <div style={{ position: 'relative' }}>
              <button className="icon-button notification-trigger" onClick={() => setNotifsOpen((v) => !v)}>
                <Bell size={19} />
                {unreadCount > 0 && <i>{unreadCount}</i>}
              </button>

              {notifsOpen && (
                <div className="notifications-panel">
                  <div className="notifications-header">
                    <div>
                      <strong>Notifications</strong>
                      <span>{unreadCount} non lue{unreadCount !== 1 ? 's' : ''}</span>
                    </div>
                    <button onClick={() => setNotifsOpen(false)}>Tout marquer lu</button>
                  </div>
                  {DEMO_NOTIFICATIONS.map((n) => (
                    <button
                      key={n.id}
                      className={`notification-row ${n.read ? 'notification-read' : ''}`}
                      onClick={() => {
                        setNotifsOpen(false);
                        if (n.incidentId) navigate(`/incidents/${n.incidentId}`);
                      }}
                    >
                      <div className={`notification-icon notif-${n.type}`}><NotifIcon type={n.type} /></div>
                      <div>
                        <strong>{n.title}</strong>
                        <span>{n.body}</span>
                        <time>{n.at}</time>
                      </div>
                      {!n.read && <span className="unread-dot" />}
                    </button>
                  ))}
                  <button className="notifications-footer" onClick={() => setNotifsOpen(false)}>
                    <Bell size={14} />Voir toutes les notifications
                  </button>
                </div>
              )}
            </div>

            <div className="top-divider" />
            <button className="profile-button">
              <div className="avatar avatar-orange">SL</div>
              <span>Sonia</span>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>

        <main className="main-content">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
