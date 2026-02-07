import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import axios from 'axios';
import { DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPayments(); }, []);

  const loadPayments = async () => {
    try {
      const response = await axios.get(`${API}/payments`, { withCredentials: true });
      setPayments(response.data);
    } catch (error) {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <DashboardLayout title="Payments"><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700"></div></div></DashboardLayout>;

  const totalAmount = payments.reduce((sum, p) => sum + p.amount_jod, 0);

  return (
    <DashboardLayout title="Payment History">
      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Payments Received</p>
              <p className="text-3xl font-bold text-teal-700 mt-2">{totalAmount.toFixed(2)} JOD</p>
            </div>
            <DollarSign className="w-12 h-12 text-teal-500" />
          </div>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Amount (JOD)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Recorded By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {payments.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-600">No payments recorded</td></tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{payment.patient_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-green-600">{payment.amount_jod.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">{new Date(payment.payment_date).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">{payment.recorded_by_name}</td>
                    <td className="px-6 py-4 text-slate-600">{payment.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminPayments;
