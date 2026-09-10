import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { BrandMark } from '../shared/BrandMark';
import { Spinner } from '../shared/Spinner';
import { useI18n } from '../../i18n';

export function VerifyPage() {
  const [code, setCode] = useState('');
  const { verify, isLoading, error, clearError, pendingVerification } = useAuthStore();
  const navigate = useNavigate();
  const t = useI18n((s) => s.t);

  useEffect(() => {
    if (!pendingVerification) navigate('/login');
  }, [pendingVerification, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verify(code);
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

        <h1 className="auth-heading">{t('auth.verifyTitle')}</h1>
        <p className="auth-subtitle">{t('auth.enterCode')}</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <input
              type="text"
              required
              maxLength={6}
              placeholder="------"
              style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8, padding: '16px' }}
              value={code}
              onChange={(e) => { setCode(e.target.value); clearError(); }}
            />
          </div>
          <button type="submit" className="button button-primary" style={{ width: '100%', marginTop: 8, padding: '14px 24px', fontSize: 15 }} disabled={isLoading}>
            {isLoading ? <Spinner /> : t('auth.verifyEmail')}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <span className="auth-link">
            <Link to="/login">{t('auth.backToLogin')}</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
