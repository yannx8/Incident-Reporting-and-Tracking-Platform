import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Building2, Shield, Save, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../store/authStore';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { Spinner } from '../shared/Spinner';


export function ProfilePage() {
  const u = useAuth((s) => s.user)!;
  const nav = useNavigate();
  const t = useI18n((s) => s.t);
  const [name, setName] = useState(u.name);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api('/auth/me', { method: 'PATCH', body: JSON.stringify({ name }) });
      setSuccess(t('profile.saved'));
    } catch (err: any) {
      setError(err.message || t('profile.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const initials = u.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> {t('profile.title')}</div>
          <h1>{t('profile.title')}</h1>
          <p>{t('profile.subtitle')}</p>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 560 }}>
        <div style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
            <div className="avatar-green" style={{ width: 64, height: 64, fontSize: 22, borderRadius: 16 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 20, fontWeight: 700, color: '#1a2b32' }}>{u.name}</div>
              <div style={{ fontSize: 13, color: '#6b7e83', marginTop: 2 }}>{u.email}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {u.roles.map((r) => (
                  <span key={r} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: r === 'ADMINISTRATOR' ? '#e8f2ef' : r === 'RESPONSABLE' ? '#efecf7' : '#f0f5f4', color: r === 'ADMINISTRATOR' ? '#286c61' : r === 'RESPONSABLE' ? '#75629a' : '#4d7d77' }}>
                    {t(`roles.${r}` as any) || r}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#e8f2ef', border: '1px solid #c0e6da', borderRadius: 10, marginBottom: 20, color: '#286c61', fontSize: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              {success}
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 20, color: '#b91c1c', fontSize: 14 }}>
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSave}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3a3a3a', marginBottom: 6 }}>{t('profile.name')}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#f7f9f9', borderRadius: 8, border: '1px solid #e4eaeb' }}>
                  <User size={16} color="#7a8e93" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: '#1a2b32', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3a3a3a', marginBottom: 6 }}>{t('settings.email')}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#f7f9f9', borderRadius: 8, border: '1px solid #e4eaeb' }}>
                  <Mail size={16} color="#7a8e93" />
                  <span style={{ fontSize: 14, color: '#6b7e83' }}>{u.email}</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3a3a3a', marginBottom: 6 }}>{t('settings.organization')}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#f7f9f9', borderRadius: 8, border: '1px solid #e4eaeb' }}>
                  <Building2 size={16} color="#7a8e93" />
                  <span style={{ fontSize: 14, color: '#6b7e83' }}>{u.organizationName}</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3a3a3a', marginBottom: 6 }}>{t('settings.role')}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#f7f9f9', borderRadius: 8, border: '1px solid #e4eaeb' }}>
                  <Shield size={16} color="#7a8e93" />
                  <span style={{ fontSize: 14, color: '#6b7e83' }}>{t(`roles.${u.roles[0]}` as any) || u.roles[0]}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 28, display: 'flex', gap: 10 }}>
              <button type="submit" className="button button-primary" disabled={saving || name === u.name}>
                {saving ? <Spinner size={14} /> : <><Save size={15} /> {t('profile.save')}</>}
              </button>
              <button type="button" className="button button-outline" onClick={() => nav('/')}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
