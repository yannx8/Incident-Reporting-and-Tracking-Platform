import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Globe, Bell, Shield, Check } from 'lucide-react';
import { useAuth } from '../../store/authStore';
import { useI18n, type Locale } from '../../i18n';

export function SettingsPage() {
  const nav = useNavigate();
  const u = useAuth((s) => s.user)!;
  const { locale, setLocale } = useI18n();
  const t = useI18n((s) => s.t);

  const [saved, setSaved] = useState(false);
  const [notifInApp, setNotifInApp] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);

  const roleLabel: Record<string, string> = {
    ADMINISTRATOR: t('roles.ADMINISTRATOR'),
    RESPONSABLE: t('roles.RESPONSABLE'),
    USER: t('roles.USER')
  };

  /* Notification toggles are client-only for now (no backend persistence). */
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <button className="icon-button" onClick={() => nav(-1)}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title" style={{ marginBottom: 0 }}>{t('settings.title')}</h1>
          <p className="page-subtitle">{t('settings.subtitle')}</p>
        </div>
      </div>

      <div className="settings-sections">
        {/* Profile */}
        <div className="settings-card">
          <div className="settings-card-header">
            <User size={18} />
            <div>
              <h3>{t('settings.profile')}</h3>
              <p>{t('settings.profileDesc')}</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="settings-row">
              <label className="settings-label">{t('settings.fullName')}</label>
              <div className="settings-value">{u.name}</div>
            </div>
            <div className="settings-row">
              <label className="settings-label">{t('settings.email')}</label>
              <div className="settings-value">{u.email}</div>
            </div>
            <div className="settings-row">
              <label className="settings-label">{t('settings.role')}</label>
              <div className="settings-value">{roleLabel[u.roles[0]] || u.roles[0]}</div>
            </div>
            <div className="settings-row">
              <label className="settings-label">{t('settings.organization')}</label>
              <div className="settings-value">{u.organizationName}</div>
            </div>
            <div className="settings-card-footer">
              <button className="btn btn-ghost" onClick={() => nav('/profile')}>{t('settings.profile')}</button>
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Globe size={18} />
            <div>
              <h3>{t('settings.language')}</h3>
              <p>{t('settings.languageDesc')}</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="settings-lang-options">
              <button
                className={`settings-lang-btn ${locale === 'fr' ? 'settings-lang-active' : ''}`}
                onClick={() => handleLanguageChange('fr')}
              >
                <span className="settings-lang-flag">🇫🇷</span>
                <span>Français</span>
                {locale === 'fr' && <Check size={16} />}
              </button>
              <button
                className={`settings-lang-btn ${locale === 'en' ? 'settings-lang-active' : ''}`}
                onClick={() => handleLanguageChange('en')}
              >
                <span className="settings-lang-flag">🇬🇧</span>
                <span>English</span>
                {locale === 'en' && <Check size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Bell size={18} />
            <div>
              <h3>{t('settings.notifications')}</h3>
              <p>{t('settings.notificationsDesc')}</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="settings-toggle-row">
              <label>{t('settings.inAppNotifications')}</label>
              <button
                className={`settings-toggle ${notifInApp ? 'settings-toggle-on' : ''}`}
                onClick={() => setNotifInApp(!notifInApp)}
              >
                <div className="settings-toggle-thumb" />
              </button>
            </div>
            <div className="settings-toggle-row">
              <label>{t('settings.emailNotifications')}</label>
              <button
                className={`settings-toggle ${notifEmail ? 'settings-toggle-on' : ''}`}
                onClick={() => setNotifEmail(!notifEmail)}
              >
                <div className="settings-toggle-thumb" />
              </button>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Shield size={18} />
            <div>
              <h3>{t('settings.security')}</h3>
              <p>{t('settings.securityDesc')}</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="settings-row">
              <label className="settings-label">{t('settings.changePassword')}</label>
              <button className="btn btn-ghost">{t('settings.changePassword')}</button>
            </div>
            <div className="settings-row">
              <label className="settings-label">{t('settings.activeSessions')}</label>
              <span className="settings-value-muted">1</span>
            </div>
          </div>
        </div>

        {saved && (
          <div className="settings-saved-toast">
            <Check size={16} />
            {t('settings.saved')}
          </div>
        )}
      </div>
    </div>
  );
}
