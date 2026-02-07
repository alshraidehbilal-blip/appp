import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import axios from 'axios';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ReceptionistCalendar = () => {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ patient_id: '', doctor_id: '', appointment_date: '', appointment_time: '', duration_minutes: 30, notes: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [aptsRes, patientsRes, doctorsRes] = await Promise.all([
        axios.get(`${API}/appointments`, { withCredentials: true }),
        axios.get(`${API}/patients`, { withCredentials: true }),
        axios.get(`${API}/doctors`, { withCredentials: true })
      ]);
      setAppointments(aptsRes.data);
      setPatients(patientsRes.data);
      setDoctors(doctorsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/appointments`, { ...formData, status: 'scheduled' }, { withCredentials: true });
      toast.success('Appointment scheduled');
      setShowModal(false);
      setFormData({ patient_id: '', doctor_id: '', appointment_date: '', appointment_time: '', duration_minutes: 30, notes: '' });
      loadData();
    } catch (error) {
      toast.error('Failed to schedule');
    }
  };

  if (loading) return <DashboardLayout title="Calendar"><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700"></div></div></DashboardLayout>;

  const groupedByDate = appointments.reduce((acc, apt) => {
    if (!acc[apt.appointment_date]) acc[apt.appointment_date] = [];
    acc[apt.appointment_date].push(apt);
    return acc;
  }, {});

  return (
    <DashboardLayout title="Appointments Calendar">
      <div className="space-y-6">
        <div className="flex justify-end">
          <button onClick={() => setShowModal(true)} data-testid="schedule-apt-btn" className="btn-primary flex items-center gap-2"><Plus className="w-5 h-5" />Schedule Appointment</button>
        </div>
        
        {Object.keys(groupedByDate).sort().map(date => (
          <div key={date} className="card p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
            <div className="space-y-3">
              {groupedByDate[date].map(apt => (
                <div key={apt.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">{apt.patient_name}</p>
                    <p className="text-sm text-slate-600">Dr. {apt.doctor_name} - {apt.appointment_time}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${apt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : apt.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{apt.status}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(groupedByDate).length === 0 && <p className="text-slate-600 text-center py-12">No appointments scheduled</p>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200"><h2 className="text-2xl font-bold">Schedule Appointment</h2></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Patient *</label><select data-testid="rec-apt-patient-select" value={formData.patient_id} onChange={(e) => setFormData({...formData, patient_id: parseInt(e.target.value)})} className="input-field" required><option value="">Select Patient</option>{patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Doctor *</label><select data-testid="rec-apt-doctor-select" value={formData.doctor_id} onChange={(e) => setFormData({...formData, doctor_id: parseInt(e.target.value)})} className="input-field" required><option value="">Select Doctor</option>{doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Date *</label><input type="date" data-testid="rec-apt-date-input" value={formData.appointment_date} onChange={(e) => setFormData({...formData, appointment_date: e.target.value})} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Time *</label><input type="time" data-testid="rec-apt-time-input" value={formData.appointment_time} onChange={(e) => setFormData({...formData, appointment_time: e.target.value})} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Duration (minutes)</label><input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value)})} className="input-field" min="15" step="15" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Notes</label><textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="input-field" rows="2" /></div>
              <div className="flex gap-3 pt-4">
                <button type="submit" data-testid="save-rec-apt-btn" className="btn-primary flex-1">Schedule</button>
                <button type="button" onClick={() => { setShowModal(false); setFormData({ patient_id: '', doctor_id: '', appointment_date: '', appointment_time: '', duration_minutes: 30, notes: '' }); }} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ReceptionistCalendar;
