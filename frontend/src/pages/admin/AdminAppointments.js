import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import axios from 'axios';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingApt, setEditingApt] = useState(null);
  const [formData, setFormData] = useState({ patient_id: '', doctor_id: '', appointment_date: '', appointment_time: '', duration_minutes: 30, status: 'scheduled', notes: '' });

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
      if (editingApt) {
        await axios.put(`${API}/appointments/${editingApt.id}`, formData, { withCredentials: true });
        toast.success('Appointment updated');
      } else {
        await axios.post(`${API}/appointments`, formData, { withCredentials: true });
        toast.success('Appointment created');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this appointment?')) return;
    try {
      await axios.delete(`${API}/appointments/${id}`, { withCredentials: true });
      toast.success('Appointment deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const resetForm = () => {
    setFormData({ patient_id: '', doctor_id: '', appointment_date: '', appointment_time: '', duration_minutes: 30, status: 'scheduled', notes: '' });
    setEditingApt(null);
  };

  const openEditModal = (apt) => {
    setEditingApt(apt);
    setFormData({ patient_id: apt.patient_id, doctor_id: apt.doctor_id, appointment_date: apt.appointment_date, appointment_time: apt.appointment_time, duration_minutes: apt.duration_minutes, status: apt.status, notes: apt.notes || '' });
    setShowModal(true);
  };

  if (loading) return <DashboardLayout title="Appointments"><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700"></div></div></DashboardLayout>;

  return (
    <DashboardLayout title="Appointments">
      <div className="space-y-6">
        <div className="flex justify-end">
          <button onClick={() => { resetForm(); setShowModal(true); }} data-testid="add-apt-btn" className="btn-primary flex items-center gap-2"><Plus className="w-5 h-5" />Add Appointment</button>
        </div>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Doctor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {appointments.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-600">No appointments</td></tr>
                ) : (
                  appointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{apt.patient_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">Dr. {apt.doctor_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">{apt.appointment_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">{apt.appointment_time}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className={`px-3 py-1 rounded-full text-xs font-medium ${apt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : apt.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{apt.status}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditModal(apt)} data-testid={`edit-apt-${apt.id}-btn`} className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(apt.id)} data-testid={`delete-apt-${apt.id}-btn`} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200"><h2 className="text-2xl font-bold">{editingApt ? 'Edit' : 'Add'} Appointment</h2></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Patient *</label><select data-testid="apt-patient-select" value={formData.patient_id} onChange={(e) => setFormData({...formData, patient_id: parseInt(e.target.value)})} className="input-field" required><option value="">Select Patient</option>{patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Doctor *</label><select data-testid="apt-doctor-select" value={formData.doctor_id} onChange={(e) => setFormData({...formData, doctor_id: parseInt(e.target.value)})} className="input-field" required><option value="">Select Doctor</option>{doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Date *</label><input type="date" data-testid="apt-date-input" value={formData.appointment_date} onChange={(e) => setFormData({...formData, appointment_date: e.target.value})} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Time *</label><input type="time" data-testid="apt-time-input" value={formData.appointment_time} onChange={(e) => setFormData({...formData, appointment_time: e.target.value})} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Duration (minutes)</label><input type="number" data-testid="apt-duration-input" value={formData.duration_minutes} onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value)})} className="input-field" min="15" step="15" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Status</label><select data-testid="apt-status-select" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="input-field"><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Notes</label><textarea data-testid="apt-notes-input" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="input-field" rows="2" /></div>
              <div className="flex gap-3 pt-4">
                <button type="submit" data-testid="save-apt-btn" className="btn-primary flex-1">{editingApt ? 'Update' : 'Create'}</button>
                <button type="button" data-testid="cancel-apt-btn" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminAppointments;
