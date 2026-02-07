import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import axios from 'axios';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminProcedures = () => {
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState(null);
  const [formData, setFormData] = useState({ name: '', price_jod: '', description: '' });

  useEffect(() => { loadProcedures(); }, []);

  const loadProcedures = async () => {
    try {
      const response = await axios.get(`${API}/procedures`, { withCredentials: true });
      setProcedures(response.data);
    } catch (error) {
      toast.error('Failed to load procedures');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProcedure) {
        await axios.put(`${API}/procedures/${editingProcedure.id}`, formData, { withCredentials: true });
        toast.success('Procedure updated successfully');
      } else {
        await axios.post(`${API}/procedures`, formData, { withCredentials: true });
        toast.success('Procedure created successfully');
      }
      setShowModal(false);
      resetForm();
      loadProcedures();
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await axios.delete(`${API}/procedures/${id}`, { withCredentials: true });
      toast.success('Procedure deleted');
      loadProcedures();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', price_jod: '', description: '' });
    setEditingProcedure(null);
  };

  const openEditModal = (proc) => {
    setEditingProcedure(proc);
    setFormData({ name: proc.name, price_jod: proc.price_jod, description: proc.description || '' });
    setShowModal(true);
  };

  if (loading) return <DashboardLayout title="Procedures"><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700"></div></div></DashboardLayout>;

  return (
    <DashboardLayout title="Procedures & Pricing">
      <div className="space-y-6">
        <div className="flex justify-end">
          <button onClick={() => { resetForm(); setShowModal(true); }} data-testid="add-procedure-btn" className="btn-primary flex items-center gap-2"><Plus className="w-5 h-5" />Add Procedure</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {procedures.map((proc) => (
            <div key={proc.id} className="card p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-900">{proc.name}</h3>
                <span className="text-xl font-bold text-teal-700">{proc.price_jod} JOD</span>
              </div>
              {proc.description && <p className="text-sm text-slate-600 mb-4">{proc.description}</p>}
              <div className="flex gap-2">
                <button onClick={() => openEditModal(proc)} data-testid={`edit-proc-${proc.id}-btn`} className="btn-secondary flex-1 flex items-center justify-center gap-2"><Edit className="w-4 h-4" />Edit</button>
                <button onClick={() => handleDelete(proc.id)} data-testid={`delete-proc-${proc.id}-btn`} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200"><h2 className="text-2xl font-bold">{editingProcedure ? 'Edit' : 'Add'} Procedure</h2></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Name *</label><input type="text" data-testid="proc-name-input" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Price (JOD) *</label><input type="number" step="0.01" data-testid="proc-price-input" value={formData.price_jod} onChange={(e) => setFormData({...formData, price_jod: e.target.value})} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Description</label><textarea data-testid="proc-desc-input" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="input-field" rows="3" /></div>
              <div className="flex gap-3 pt-4">
                <button type="submit" data-testid="save-proc-btn" className="btn-primary flex-1">{editingProcedure ? 'Update' : 'Create'}</button>
                <button type="button" data-testid="cancel-proc-btn" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminProcedures;
