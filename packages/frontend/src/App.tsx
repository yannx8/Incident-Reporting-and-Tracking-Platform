import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useI18n } from './i18n';
import { Spinner } from './components/shared/Spinner';
import { LoginPage, RegisterPage } from './components/auth';
import { AppShell } from './components/layout';
import { Dashboard } from './components/dashboard';
import { Incidents } from './components/incidents';
import { Team } from './components/team';
import { Sites } from './components/sites';
import { MapPage } from './components/map';
import { ProfilePage } from './components/profile/ProfilePage';
import { SettingsPage } from './components/settings/SettingsPage';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user?.roles.includes('ADMINISTRATOR')) return <Navigate to="/" />;
  return <>{children}</>;
}

function OperationalRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user?.roles.includes('ADMINISTRATOR') && !user?.roles.includes('RESPONSABLE')) return <Navigate to="/" />;
  return <>{children}</>;
}

export default function App() {
  const { user, isInitialized } = useAuthStore();
  const locale = useI18n((s) => s.locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  if (!isInitialized) {
    return (
      <div className="auth-shell">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <>
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <RegisterPage />} />
      <Route
        path="/*"
        element={
          user ? (
            <AppShell>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="/map" element={<OperationalRoute><MapPage /></OperationalRoute>} />
                <Route path="/team" element={<AdminRoute><Team /></AdminRoute>} />
                <Route path="/sites" element={<AdminRoute><Sites /></AdminRoute>} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </AppShell>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
    </>
  );
}
