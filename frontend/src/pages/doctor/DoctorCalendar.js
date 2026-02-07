import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DoctorCalendar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAppointments(); }, []);

  const loadAppointments = async () => {
    try {
      const response = await axios.get(`${API}/appointments?doctor_id=${user.id}`, { withCredentials: true });
      setAppointments(response.data);
    } catch (error) {
      console.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <DashboardLayout title="Calendar"><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700"></div></div></DashboardLayout>;

  const groupedByDate = appointments.reduce((acc, apt) => {
    if (!acc[apt.appointment_date]) acc[apt.appointment_date] = [];
    acc[apt.appointment_date].push(apt);
    return acc;
  }, {});

  return (
    <DashboardLayout title="My Calendar">
      <div className="space-y-6">
        {Object.keys(groupedByDate).sort().map(date => (
          <div key={date} className="card p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
            <div className="space-y-3">
              {groupedByDate[date].map(apt => (
                <div key={apt.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => navigate(`/doctor/patients/${apt.patient_id}`)}>
                  <div>
                    <p className="font-medium text-slate-900">{apt.patient_name}</p>
                    <p className="text-sm text-slate-600">{apt.appointment_time}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${apt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : apt.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{apt.status}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(groupedByDate).length === 0 && <p className="text-slate-600 text-center py-12">No appointments scheduled</p>}
      </div>
    </DashboardLayout>
  );
};

export default DoctorCalendar;
