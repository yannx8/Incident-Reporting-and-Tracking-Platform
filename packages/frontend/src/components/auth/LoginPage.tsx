import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { BrandMark } from '../shared/BrandMark';
import { Spinner } from '../shared/Spinner';
import { useI18n } from '../../i18n';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const t = useI18n((s) => s.t);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password, rememberMe);
      // Read user directly from the store after login to confirm auth succeeded
      // before navigating, avoiding a flash of unauthenticated state.
      if (useAuthStore.getState().user) navigate('/');
    } catch {}
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <BrandMark />
          <div>
            <strong>NEXUS</strong>
            <small>INCIDENTS</small>
          </div>
        </div>

        <h1 className="auth-heading">{t('auth.welcomeBack')}</h1>
        <p className="auth-subtitle">{t('auth.welcomeSubtitle')}</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              type="email"
              required
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError(); }}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">{t('auth.password')}</label>
            <div className="auth-pwd-wrapper">
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                required
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError(); }}
              />
              <button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}>
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="auth-row">
            <label className="auth-checkbox">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              <span>{t('auth.rememberMe')}</span>
            </label>
            <a href="#" className="auth-forgot">{t('auth.forgotPassword')}</a>
          </div>

          <button type="submit" className="button button-primary" style={{ width: '100%', marginTop: 8, padding: '14px 24px', fontSize: 15 }} disabled={isLoading}>
            {isLoading ? <Spinner /> : t('auth.signIn')}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <span className="auth-link">
            {t('auth.noAccount')} <Link to="/register">{t('auth.createOne')}</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
