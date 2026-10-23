import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './components/ui/Toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import TemperatureTracking from './pages/TemperatureTracking';
import DoctorVisits from './pages/DoctorVisits';
import DischargeManagement from './pages/DischargeManagement';
import BedManagement from './pages/BedManagement';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import type { UserRole } from './types';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/" replace />;
  if (roles && !roles.includes(currentUser.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { currentUser } = useApp();
  return (
    <Routes>
      <Route path="/" element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/patients"    element={<ProtectedRoute><Patients /></ProtectedRoute>} />
      <Route path="/patients/:id" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
      <Route path="/temperature" element={<ProtectedRoute roles={['admin','nurse']}><TemperatureTracking /></ProtectedRoute>} />
      <Route path="/visits"      element={<ProtectedRoute roles={['admin','doctor']}><DoctorVisits /></ProtectedRoute>} />
      <Route path="/discharge"   element={<ProtectedRoute roles={['admin','doctor']}><DischargeManagement /></ProtectedRoute>} />
      <Route path="/beds"        element={<ProtectedRoute roles={['admin','nurse']}><BedManagement /></ProtectedRoute>} />
      <Route path="/reports"     element={<ProtectedRoute roles={['admin','doctor']}><Reports /></ProtectedRoute>} />
      <Route path="/users"       element={<ProtectedRoute roles={['admin']}><UserManagement /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AppProvider>
  );
}
