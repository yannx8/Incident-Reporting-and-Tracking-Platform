import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
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
  const roles = u.roles;
  const admin = roles.includes('ADMINISTRATOR');
  const responsable = roles.includes('RESPONSABLE');
  const canSeeMap = admin || responsable;
  const roleLabel: Record<string, string> = { ADMINISTRATOR: 'Admin', RESPONSABLE: 'Responsable', USER: 'User' };
  const initials = u.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const viewTitle = useMemo(() => {
    const map: Record<string, string> = {
      '/': t('nav.overview'),
      '/incidents': t('nav.incidents'),
      '/map': t('nav.map'),
      '/team': t('nav.teams'),
      '/sites': t('nav.sites'),
      '/profile': t('profile.title'),
      '/settings': t('nav.settings')
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
            <small>INCIDENT CONTROL</small>
          </div>
        </div>

        <div className="org-badge">
          <div className="org-avatar">
            {u.organizationName[0]}
          </div>
          <div className="org-copy">
            <strong>{u.organizationName}</strong>
            <small>{admin ? 'Operational workspace' : 'Incident workspace'}</small>
          </div>
          <ChevronRight size={15} className="org-chevron" />
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">WORKSPACE</div>
          <NavItem to="/" icon={<LayoutDashboard />} text={t('nav.overview')} active={loc.pathname === '/'} />
          <NavItem to="/incidents" icon={<ClipboardList />} text={t('nav.incidents')} active={loc.pathname === '/incidents'} />
          {canSeeMap && (
            <NavItem to="/map" icon={<MapIcon />} text={t('nav.map')} active={loc.pathname === '/map'} />
          )}
          {admin && (
            <>
              <NavItem to="/team" icon={<Users />} text={t('nav.teams')} active={loc.pathname === '/team'} />
              <NavItem to="/sites" icon={<Building2 />} text={t('nav.sites')} active={loc.pathname === '/sites'} />
            </>
          )}
        </nav>

        <div className="sidebar-bottom">
          <NavItem to="/settings" icon={<Settings />} text={t('nav.settings')} active={loc.pathname === '/settings'} />
          <button className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={14} />
            {t('nav.logout')}
          </button>
          <button className="user-mini" onClick={() => { closeSidebar(); nav('/profile'); }}>
            <div className="avatar-green">{initials}</div>
            <div className="user-mini-info">
              <span className="user-mini-name">{u.name}</span>
              <span className="user-mini-role">{roleLabel[roles[0]] || roles[0]}</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#64748B', flexShrink: 0 }}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </button>
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="breadcrumbs">
              <span>{t('nav.workspace')}</span>
              <ChevronRight size={14} />
              <strong>{viewTitle}</strong>
            </div>
          </div>
          <div className="top-actions">
            <button className="icon-button" onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')} title={locale === 'fr' ? 'Switch to English' : 'Passer en français'}>
              <Globe size={18} />
              <span className="lang-toggle">{locale.toUpperCase()}</span>
            </button>
            <button className="icon-button" onClick={() => setNotifOpen(!notifOpen)} style={{ position: 'relative' }}>
              <Bell size={19} />
              {unread > 0 && <i className="notification-badge">{unread}</i>}
            </button>
            <div className="top-divider" />
            <button className="profile-button" onClick={() => nav('/profile')}>
              <div className="avatar avatar-green" style={{ background: '#2563EB', color: '#fff' }}>{initials}</div>
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
