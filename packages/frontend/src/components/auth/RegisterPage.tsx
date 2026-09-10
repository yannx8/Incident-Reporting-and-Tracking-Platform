import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { BrandMark } from '../shared/BrandMark';
import { Spinner } from '../shared/Spinner';
import { useI18n } from '../../i18n';

interface Org {
  id: string;
  name: string;
  slug: string;
}

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [organizations, setOrganizations] = useState<Org[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const { register, isLoading, error, clearError, pendingVerification } = useAuthStore();
  const navigate = useNavigate();
  const t = useI18n((s) => s.t);

  useEffect(() => {
    if (pendingVerification) navigate('/verify');
  }, [pendingVerification, navigate]);

  useEffect(() => {
    fetch('/api/organizations')
      .then((r) => r.json())
      .then((d) => {
        setOrganizations(d);
        if (d.length === 1) setOrgSlug(d[0].slug);
      })
      .catch(() => {})
      .finally(() => setOrgsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await register(name, email, password, orgSlug); } catch {}
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

        <h1 className="auth-heading">{t('auth.createAccount')}</h1>
        <p className="auth-subtitle">{t('auth.joinSubtitle')}</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="name">{t('auth.name')}</label>
            <input id="name" type="text" required placeholder={t('auth.namePlaceholder')} value={name} onChange={(e) => { setName(e.target.value); clearError(); }} />
          </div>
          <div className="auth-field">
            <label htmlFor="reg-email">{t('auth.email')}</label>
            <input id="reg-email" type="email" required placeholder={t('auth.emailPlaceholder')} value={email} onChange={(e) => { setEmail(e.target.value); clearError(); }} />
          </div>
          <div className="auth-field">
            <label htmlFor="reg-password">{t('auth.password')}</label>
            <input id="reg-password" type="password" required minLength={12} placeholder={t('auth.minChars12')} value={password} onChange={(e) => { setPassword(e.target.value); clearError(); }} />
          </div>
          <div className="auth-field">
            <label htmlFor="org-slug">{t('auth.organization')}</label>
            {orgsLoading ? (
              <div style={{ padding: '14px 16px', background: '#fafafa', borderRadius: 10, border: '1.5px solid #e0e0e0' }}><Spinner size={16} /></div>
            ) : organizations.length === 0 ? (
              <input id="org-slug" type="text" required placeholder={t('auth.orgPlaceholder')} value={orgSlug} onChange={(e) => { setOrgSlug(e.target.value); clearError(); }} />
            ) : (
              <select id="org-slug" value={orgSlug} onChange={(e) => { setOrgSlug(e.target.value); clearError(); }} required style={{ width: '100%', border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '14px 16px', fontSize: 15, color: '#1a1a1a', background: '#fafafa', outline: 'none', appearance: 'auto' }}>
                <option value="">{t('auth.selectOrg')}</option>
                {organizations.map((o) => <option key={o.id} value={o.slug}>{o.name}</option>)}
              </select>
            )}
          </div>
          <button type="submit" className="button button-primary" style={{ width: '100%', marginTop: 8, padding: '14px 24px', fontSize: 15 }} disabled={isLoading || !orgSlug}>
            {isLoading ? <Spinner /> : t('auth.createAccount')}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <span className="auth-link">
            {t('auth.hasAccount')} <Link to="/login">{t('auth.signInLink')}</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
