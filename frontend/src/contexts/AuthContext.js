import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true
      });
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const response = await axios.post(
      `${API}/auth/login`,
      { username, password },
      { withCredentials: true }
    );
    setUser(response.data.user);
    return response.data.user;
  };

  const logout = async () => {
    await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    setUser(null);
  };

  const changePassword = async (newPassword) => {
    await axios.post(
      `${API}/auth/change-password`,
      { new_password: newPassword },
      { withCredentials: true }
    );
    setUser({ ...user, is_first_login: false });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
