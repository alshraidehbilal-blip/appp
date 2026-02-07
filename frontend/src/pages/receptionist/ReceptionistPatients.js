import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import axios from 'axios';
import { Search, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ReceptionistPatients = () => {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadPatients(); }, []);

  const loadPatients = async () => {
    try {
      const response = await axios.get(`${API}/patients`, { withCredentials: true });
      setPatients(response.data);
    } catch (error) {
      console.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone.includes(searchTerm)
  );

  if (loading) return <DashboardLayout title="Patients"><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700"></div></div></DashboardLayout>;

  return (
    <DashboardLayout title="Patients">
      <div className="space-y-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" placeholder="Search patients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field pl-10" />
        </div>
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Balance (JOD)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredPatients.map(patient => (
                <tr key={patient.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{patient.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600">{patient.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`font-medium ${patient.balance_jod > 0 ? 'text-red-600' : 'text-green-600'}`}>{patient.balance_jod.toFixed(2)}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button onClick={() => navigate(`/receptionist/patients/${patient.id}`)} className="text-teal-600 hover:text-teal-900 p-2 hover:bg-teal-50 rounded"><Eye className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ReceptionistPatients;
