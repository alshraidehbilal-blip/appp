import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPatients from './pages/admin/AdminPatients';
import AdminAppointments from './pages/admin/AdminAppointments';
import AdminProcedures from './pages/admin/AdminProcedures';
import AdminUsers from './pages/admin/AdminUsers';
import AdminPayments from './pages/admin/AdminPayments';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorPatients from './pages/doctor/DoctorPatients';
import DoctorCalendar from './pages/doctor/DoctorCalendar';
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard';
import ReceptionistPatients from './pages/receptionist/ReceptionistPatients';
import ReceptionistCalendar from './pages/receptionist/ReceptionistCalendar';
import ReceptionistPayments from './pages/receptionist/ReceptionistPayments';
import PatientDetail from './pages/shared/PatientDetail';
import { Toaster } from './components/ui/sonner';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/patients" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPatients />
              </ProtectedRoute>
            } />
            <Route path="/admin/appointments" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAppointments />
              </ProtectedRoute>
            } />
            <Route path="/admin/procedures" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminProcedures />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminUsers />
              </ProtectedRoute>
            } />
            <Route path="/admin/payments" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPayments />
              </ProtectedRoute>
            } />
            <Route path="/admin/patients/:patientId" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PatientDetail />
              </ProtectedRoute>
            } />
            
            <Route path="/doctor/dashboard" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/doctor/patients" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorPatients />
              </ProtectedRoute>
            } />
            <Route path="/doctor/calendar" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorCalendar />
              </ProtectedRoute>
            } />
            <Route path="/doctor/patients/:patientId" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <PatientDetail />
              </ProtectedRoute>
            } />
            
            <Route path="/receptionist/dashboard" element={
              <ProtectedRoute allowedRoles={['receptionist']}>
                <ReceptionistDashboard />
              </ProtectedRoute>
            } />
            <Route path="/receptionist/patients" element={
              <ProtectedRoute allowedRoles={['receptionist']}>
                <ReceptionistPatients />
              </ProtectedRoute>
            } />
            <Route path="/receptionist/calendar" element={
              <ProtectedRoute allowedRoles={['receptionist']}>
                <ReceptionistCalendar />
              </ProtectedRoute>
            } />
            <Route path="/receptionist/payments" element={
              <ProtectedRoute allowedRoles={['receptionist']}>
                <ReceptionistPayments />
              </ProtectedRoute>
            } />
            <Route path="/receptionist/patients/:patientId" element={
              <ProtectedRoute allowedRoles={['receptionist']}>
                <PatientDetail />
              </ProtectedRoute>
            } />
            
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
