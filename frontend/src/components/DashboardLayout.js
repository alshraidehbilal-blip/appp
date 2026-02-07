import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, Calendar, FileText, Settings, LogOut, Menu, X, 
  DollarSign, Activity, UserCog, Stethoscope 
} from 'lucide-react';
import { toast } from 'sonner';

const DashboardLayout = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const getMenuItems = () => {
    const baseRoute = `/${user.role}`;
    
    if (user.role === 'admin') {
      return [
        { icon: Activity, label: 'Dashboard', path: '/admin' },
        { icon: Users, label: 'Patients', path: '/admin/patients' },
        { icon: Calendar, label: 'Appointments', path: '/admin/appointments' },
        { icon: UserCog, label: 'Users', path: '/admin/users' },
        { icon: Stethoscope, label: 'Procedures', path: '/admin/procedures' },
        { icon: DollarSign, label: 'Payments', path: '/admin/payments' },
      ];
    } else if (user.role === 'doctor') {
      return [
        { icon: Activity, label: 'Dashboard', path: '/doctor' },
        { icon: Calendar, label: 'Calendar', path: '/doctor/calendar' },
        { icon: Users, label: 'Patients', path: '/doctor/patients' },
      ];
    } else if (user.role === 'receptionist') {
      return [
        { icon: Activity, label: 'Dashboard', path: '/receptionist' },
        { icon: Calendar, label: 'Calendar', path: '/receptionist/calendar' },
        { icon: Users, label: 'Patients', path: '/receptionist/patients' },
        { icon: DollarSign, label: 'Payments', path: '/receptionist/payments' },
      ];
    }
    return [];
  };

  const menuItems = getMenuItems();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Experts Dental</h2>
              <p className="text-xs text-slate-600 mt-1 capitalize">{user.role}</p>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-500 hover:text-slate-700"
              data-testid="close-sidebar-btn"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}-btn`}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${isActive 
                    ? 'bg-teal-700 text-white shadow-sm' 
                    : 'text-slate-700 hover:bg-slate-100'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
          <div className="mb-3 p-3 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
            <p className="text-xs text-slate-600">@{user.username}</p>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-btn"
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-700"
                data-testid="open-sidebar-btn"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
