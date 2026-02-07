import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import axios from 'axios';
import { Calendar as CalendarIcon, Users, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DoctorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAppointments(); }, []);

  const loadAppointments = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(`${API}/appointments?doctor_id=${user.id}&date=${today}`, { withCredentials: true });
      setAppointments(response.data);
    } catch (error) {
      console.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <DashboardLayout title="Dashboard"><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700"></div></div></DashboardLayout>;

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Today's Appointments</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{appointments.length}</p>
              </div>
              <CalendarIcon className="w-10 h-10 text-teal-500" />
            </div>
          </div>
        </div>
        
        <div className="card p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Today's Schedule</h2>
          <div className="space-y-3">
            {appointments.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No appointments for today</p>
            ) : (
              appointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => navigate(`/doctor/patients/${apt.patient_id}`)}>
                  <div>
                    <p className="font-medium text-slate-900">{apt.patient_name}</p>
                    <p className="text-sm text-slate-600">{apt.appointment_time} - {apt.duration_minutes} min</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${apt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : apt.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{apt.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DoctorDashboard;
