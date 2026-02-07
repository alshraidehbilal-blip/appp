import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import axios from 'axios';
import { Plus, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ReceptionistPayments = () => {
  const [payments, setPayments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ patient_id: '', amount_jod: '', notes: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [paymentsRes, patientsRes] = await Promise.all([
        axios.get(`${API}/payments`, { withCredentials: true }),
        axios.get(`${API}/patients`, { withCredentials: true })
      ]);
      setPayments(paymentsRes.data);
      setPatients(patientsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/payments`, { ...formData, amount_jod: parseFloat(formData.amount_jod) }, { withCredentials: true });
      toast.success('Payment recorded');
      setShowModal(false);
      setFormData({ patient_id: '', amount_jod: '', notes: '' });
      loadData();
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  if (loading) return <DashboardLayout title="Payments"><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700"></div></div></DashboardLayout>;

  return (
    <DashboardLayout title="Record Payments">
      <div className="space-y-6">
        <div className="flex justify-end">
          <button onClick={() => setShowModal(true)} data-testid="record-payment-btn" className="btn-primary flex items-center gap-2"><Plus className="w-5 h-5" />Record Payment</button>
        </div>
        
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Amount (JOD)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {payments.map(payment => (
                <tr key={payment.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{payment.patient_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-green-600">{payment.amount_jod.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600">{new Date(payment.payment_date).toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-600">{payment.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200"><h2 className="text-2xl font-bold">Record Payment</h2></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Patient *</label><select data-testid="payment-patient-select" value={formData.patient_id} onChange={(e) => setFormData({...formData, patient_id: parseInt(e.target.value)})} className="input-field" required><option value="">Select Patient</option>{patients.map(p => <option key={p.id} value={p.id}>{p.name} - Balance: {p.balance_jod.toFixed(2)} JOD</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Amount (JOD) *</label><input type="number" step="0.01" data-testid="payment-amount-input" value={formData.amount_jod} onChange={(e) => setFormData({...formData, amount_jod: e.target.value})} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Notes</label><textarea data-testid="payment-notes-input" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="input-field" rows="2" /></div>
              <div className="flex gap-3 pt-4">
                <button type="submit" data-testid="save-payment-btn" className="btn-primary flex-1">Record</button>
                <button type="button" onClick={() => { setShowModal(false); setFormData({ patient_id: '', amount_jod: '', notes: '' }); }} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ReceptionistPayments;
