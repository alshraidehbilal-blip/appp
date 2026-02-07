import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from 'sonner';
import '@/App.css';

// Pages
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPatients from './pages/admin/AdminPatients';
import AdminAppointments from './pages/admin/AdminAppointments';
import AdminUsers from './pages/admin/AdminUsers';
import AdminProcedures from './pages/admin/AdminProcedures';
import AdminPayments from './pages/admin/AdminPayments';
import PatientDetail from './pages/shared/PatientDetail';

// Doctor pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorCalendar from './pages/doctor/DoctorCalendar';
import DoctorPatients from './pages/doctor/DoctorPatients';

// Receptionist pages
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard';
import ReceptionistCalendar from './pages/receptionist/ReceptionistCalendar';
import ReceptionistPatients from './pages/receptionist/ReceptionistPatients';
import ReceptionistPayments from './pages/receptionist/ReceptionistPayments';

const RoleRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'doctor':
      return <Navigate to="/doctor" replace />;
    case 'receptionist':
      return <Navigate to="/receptionist" replace />;
    default:
      return <Navigate to="/" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<Login />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/patients" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPatients />
            </ProtectedRoute>
          } />
          <Route path="/admin/patients/:id" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <PatientDetail />
            </ProtectedRoute>
          } />
          <Route path="/admin/appointments" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminAppointments />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminUsers />
            </ProtectedRoute>
          } />
          <Route path="/admin/procedures" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminProcedures />
            </ProtectedRoute>
          } />
          <Route path="/admin/payments" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPayments />
            </ProtectedRoute>
          } />

          {/* Doctor Routes */}
          <Route path="/doctor" element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/doctor/calendar" element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorCalendar />
            </ProtectedRoute>
          } />
          <Route path="/doctor/patients" element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorPatients />
            </ProtectedRoute>
          } />
          <Route path="/doctor/patients/:id" element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <PatientDetail />
            </ProtectedRoute>
          } />

          {/* Receptionist Routes */}
          <Route path="/receptionist" element={
            <ProtectedRoute allowedRoles={['receptionist']}>
              <ReceptionistDashboard />
            </ProtectedRoute>
          } />
          <Route path="/receptionist/calendar" element={
            <ProtectedRoute allowedRoles={['receptionist']}>
              <ReceptionistCalendar />
            </ProtectedRoute>
          } />
          <Route path="/receptionist/patients" element={
            <ProtectedRoute allowedRoles={['receptionist']}>
              <ReceptionistPatients />
            </ProtectedRoute>
          } />
          <Route path="/receptionist/patients/:id" element={
            <ProtectedRoute allowedRoles={['receptionist']}>
              <PatientDetail />
            </ProtectedRoute>
          } />
          <Route path="/receptionist/payments" element={
            <ProtectedRoute allowedRoles={['receptionist']}>
              <ReceptionistPayments />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={<RoleRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
