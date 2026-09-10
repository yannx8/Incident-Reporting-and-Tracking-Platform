import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Globe,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  Settings,
  Users
} from 'lucide-react';
import { useAuth } from '../../store/authStore';
import { useNotifications } from '../../store/notificationStore';
import { useI18n } from '../../i18n';
import { BrandMark } from '../shared/BrandMark';
import { NavItem } from './NavItem';
import { NotificationsPanel } from './NotificationsPanel';



export function AppShell({ children }: { children: React.ReactNode }) {
  const u = useAuth((s) => s.user)!;
  const logout = useAuth((s) => s.logout);
  const nav = useNavigate();
  const loc = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { items, load } = useNotifications();
  const { locale, setLocale } = useI18n();
  const t = useI18n((s) => s.t);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const unread = items.filter((x) => !x.readAt).length;
  const admin = u.roles.includes('ADMINISTRATOR');
  const responsable = u.roles.includes('RESPONSABLE');
  const canSeeMap = admin || responsable;
  const initials = u.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const viewTitle = useMemo(() => {
    const map: Record<string, string> = {
      '/': t('dashboard.title'),
      '/incidents': t('incidents.title'),
      '/map': t('map.title'),
      '/team': t('team.title'),
      '/sites': t('sites.title'),
      '/profile': t('profile.title'),
      '/settings': t('settings.title')
    };
    return map[loc.pathname] || loc.pathname.slice(1);
  }, [loc.pathname, t]);

  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = () => {
    logout().then(() => nav('/login'));
  };

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="mobile-overlay" onClick={closeSidebar} />}

      <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
        <div className="brand">
          <BrandMark />
          <div>
            <strong>NEXUS</strong>
            <small>INCIDENTS</small>
          </div>
        </div>

        <div className="org-badge">
          <div className="org-avatar">
            {u.organizationName[0]}
          </div>
          <div className="org-copy">
            <strong>{u.organizationName}</strong>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">{t('nav.navigation')}</div>
          <NavItem to="/" icon={<LayoutDashboard />} text={t('nav.dashboard')} active={loc.pathname === '/'} />
          <NavItem to="/incidents" icon={<ClipboardList />} text={t('nav.incidents')} active={loc.pathname === '/incidents'} />
          {canSeeMap && (
            <NavItem to="/map" icon={<MapIcon />} text={t('nav.map')} active={loc.pathname === '/map'} />
          )}
          {admin && (
            <>
              <div className="nav-label nav-label-spaced">{t('nav.administration')}</div>
              <NavItem to="/team" icon={<Users />} text={t('nav.team')} active={loc.pathname === '/team'} />
              <NavItem to="/sites" icon={<Building2 />} text={t('nav.sites')} active={loc.pathname === '/sites'} />
            </>
          )}
        </nav>

        <div className="sidebar-bottom">
          <NavItem to="/settings" icon={<Settings />} text={t('nav.settings')} active={loc.pathname === '/settings'} />
          <button className="nav-item" onClick={handleLogout}>
            <LogOut size={18} strokeWidth={1.8} />
            <span>{t('nav.logout')}</span>
          </button>
          <button className="user-mini" onClick={() => { closeSidebar(); nav('/profile'); }}>
            <div className="avatar-green">{initials}</div>
            <div className="user-mini-info">
              <span className="user-mini-name">{u.name}</span>
              <span className="user-mini-role">{t(`roles.${u.roles[0]}` as any) || u.roles[0]}</span>
            </div>
          </button>
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <button className="icon-button mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={21} />
          </button>
          <div className="breadcrumbs">
            <span>{u.organizationName}</span>
            <ChevronRight size={14} />
            <strong>{viewTitle}</strong>
          </div>
          <div className="top-actions">
            <button className="icon-button" onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')} title={locale === 'fr' ? 'Switch to English' : 'Passer en français'}>
              <Globe size={18} />
              <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 2 }}>{locale.toUpperCase()}</span>
            </button>
            <button className="icon-button" onClick={() => setNotifOpen(!notifOpen)} style={{ position: 'relative' }}>
              <Bell size={19} />
              {unread > 0 && <i className="notification-badge">{unread}</i>}
            </button>
            <div className="top-divider" />
            <button className="profile-button" onClick={() => nav('/profile')}>
              <div className="avatar avatar-orange">{initials}</div>
              <span>{u.name.split(' ')[0]}</span>
              <ChevronDown size={14} color="#8b9a9e" />
            </button>
          </div>
        </header>

        {notifOpen && (
          <NotificationsPanel onClose={() => setNotifOpen(false)} />
        )}

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
