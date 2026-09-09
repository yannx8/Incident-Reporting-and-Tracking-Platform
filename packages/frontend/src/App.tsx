import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { CoreLayout } from './layouts/CoreLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyPage } from './pages/VerifyPage';
import { IncidentListPage } from './pages/IncidentListPage';
import { NewIncidentPage } from './pages/NewIncidentPage';
import { IncidentDetailPage } from './pages/IncidentDetailPage';
import { ResponsableDashboard } from './pages/ResponsableDashboard';
import { AuthProvider, useAuth } from './lib/AuthContext';

const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const MapPage = React.lazy(() => import('./pages/MapPage').then(m => ({ default: m.MapPage })));
const ResponsableIncidentPage = React.lazy(() => import('./pages/ResponsableIncidentPage').then(m => ({ default: m.ResponsableIncidentPage })));

function ProtectedRoute() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading...</div>}>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify" element={<VerifyPage />} />
            </Route>
            
            <Route element={<ProtectedRoute />}>
              <Route element={<CoreLayout />}>
                <Route path="/" element={<Navigate to="/incidents" replace />} />
                <Route path="/incidents" element={<IncidentListPage />} />
                <Route path="/incidents/new" element={<NewIncidentPage />} />
                <Route path="/incidents/:id" element={<IncidentDetailPage />} />
                
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/map" element={<MapPage />} />
                
                <Route path="/responsable" element={<ResponsableDashboard />} />
                <Route path="/responsable/incidents/:id" element={<ResponsableIncidentPage />} />
              </Route>
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
