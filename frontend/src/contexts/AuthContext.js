import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [token, setToken] = useState(() => localStorage.getItem('rs_token'));

  const apiClient = useCallback(() => {
    const instance = axios.create({ baseURL: API, withCredentials: true });
    if (token) {
      instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    return instance;
  }, [token]);

  useEffect(() => {
    if (token) {
      axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      })
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('rs_token');
          setToken(null);
          setUser(null);
        });
    } else {
      setUser(null);
    }
  }, [token]);

  const login = async (email, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
    setToken(data.access_token);
    localStorage.setItem('rs_token', data.access_token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await axios.post(`${API}/auth/register`, payload, { withCredentials: true });
    setToken(data.access_token);
    localStorage.setItem('rs_token', data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await axios.post(`${API}/auth/logout`, {}, { withCredentials: true }); } catch {}
    localStorage.removeItem('rs_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setUser(data);
    } catch {}
  };

  const authHeader = () => token ? { Authorization: `Bearer ${token}` } : {};

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, refreshUser, apiClient, authHeader, loading: user === undefined }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
