import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import axios from 'axios';
import { Users, Calendar, DollarSign, Stethoscope, TrendingUp } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    patients: 0,
    appointments: 0,
    todayAppointments: 0,
    procedures: 0,
    users: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [patients, appointments, procedures, users] = await Promise.all([
        axios.get(`${API}/patients`, { withCredentials: true }),
        axios.get(`${API}/appointments`, { withCredentials: true }),
        axios.get(`${API}/procedures`, { withCredentials: true }),
        axios.get(`${API}/users`, { withCredentials: true }),
      ]);

      const today = new Date().toISOString().split('T')[0];
      const todayAppts = appointments.data.filter(a => a.appointment_date === today);

      setStats({
        patients: patients.data.length,
        appointments: appointments.data.length,
        todayAppointments: todayAppts.length,
        procedures: procedures.data.length,
        users: users.data.length,
      });

      setRecentAppointments(appointments.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { icon: Users, label: 'Total Patients', value: stats.patients, color: 'teal' },
    { icon: Calendar, label: 'Total Appointments', value: stats.appointments, color: 'blue' },
    { icon: TrendingUp, label: 'Today\'s Appointments', value: stats.todayAppointments, color: 'green' },
    { icon: Stethoscope, label: 'Procedures', value: stats.procedures, color: 'purple' },
    { icon: Users, label: 'Staff Members', value: stats.users, color: 'orange' },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="card p-6" data-testid={`stat-${stat.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 font-medium">{stat.label}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 text-${stat.color}-700`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Appointments */}
        <div className="card p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Appointments</h2>
          <div className="space-y-3">
            {recentAppointments.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No appointments yet</p>
            ) : (
              recentAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div>
                    <p className="font-medium text-slate-900">{apt.patient_name}</p>
                    <p className="text-sm text-slate-600">Dr. {apt.doctor_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">{apt.appointment_date}</p>
                    <p className="text-sm text-slate-600">{apt.appointment_time}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    apt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                    apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                    apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {apt.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
