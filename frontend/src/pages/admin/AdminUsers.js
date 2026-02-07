import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import axios from 'axios';
import { Plus, Edit, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'doctor',
    session_duration_hours: 8
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`, { withCredentials: true });
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const updateData = { full_name: formData.full_name, session_duration_hours: formData.session_duration_hours };
        if (formData.password) updateData.password = formData.password;
        await axios.put(`${API}/users/${editingUser.id}`, updateData, { withCredentials: true });
        toast.success('User updated successfully');
      } else {
        await axios.post(`${API}/users`, formData, { withCredentials: true });
        toast.success('User created successfully');
      }
      setShowModal(false);
      resetForm();
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`${API}/users/${id}`, { withCredentials: true });
      toast.success('User deleted successfully');
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const resetForm = () => {
    setFormData({ username: '', password: '', full_name: '', role: 'doctor', session_duration_hours: 8 });
    setEditingUser(null);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({ username: user.username, password: '', full_name: user.full_name, role: user.role, session_duration_hours: user.session_duration_hours });
    setShowModal(true);
  };

  if (loading) {
    return (
      <DashboardLayout title="Users">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Users">
      <div className="space-y-6">
        <div className="flex justify-end">
          <button onClick={() => { resetForm(); setShowModal(true); }} data-testid="add-user-btn" className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add User
          </button>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Full Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Session Duration</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-slate-400" />
                      <span className="font-medium text-slate-900">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600">{user.full_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'doctor' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>{user.role}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600">{user.session_duration_hours}h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEditModal(user)} data-testid={`edit-user-${user.id}-btn`} className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      {user.role !== 'admin' && (
                        <button onClick={() => handleDelete(user.id)} data-testid={`delete-user-${user.id}-btn`} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">{editingUser ? 'Edit User' : 'Add New User'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Username *</label>
                  <input type="text" data-testid="user-username-input" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="input-field" required />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{editingUser ? 'New Password (leave empty to keep current)' : 'Password *'}</label>
                <input type="password" data-testid="user-password-input" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="input-field" required={!editingUser} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
                <input type="text" data-testid="user-fullname-input" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} className="input-field" required />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Role *</label>
                  <select data-testid="user-role-select" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="input-field">
                    <option value="doctor">Doctor</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Session Duration (hours) *</label>
                <input type="number" data-testid="user-session-input" value={formData.session_duration_hours} onChange={(e) => setFormData({...formData, session_duration_hours: parseInt(e.target.value)})} className="input-field" min="1" max="24" required />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" data-testid="save-user-btn" className="btn-primary flex-1">{editingUser ? 'Update' : 'Create'} User</button>
                <button type="button" data-testid="cancel-user-btn" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminUsers;
