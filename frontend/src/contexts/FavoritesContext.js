import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const FavoritesContext = createContext(null);

export const FavoritesProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState(new Set());

  const loadFavorites = useCallback(async () => {
    if (!user || !token) { setFavoriteIds(new Set()); return; }
    try {
      const res = await axios.get(`${API}/favorites/ids`, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true
      });
      setFavoriteIds(new Set(res.data.map(f => `${f.id}-${f.type}`)));
    } catch {}
  }, [user, token]);

  useEffect(() => { loadFavorites(); }, [loadFavorites]);

  const isFavorited = (id, type = 'beat') => favoriteIds.has(`${id}-${type}`);

  const toggleFavorite = async (id, type = 'beat') => {
    if (!user) return false;
    try {
      const res = await axios.post(`${API}/favorites/${type}/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true
      });
      const key = `${id}-${type}`;
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (res.data.favorited) next.add(key); else next.delete(key);
        return next;
      });
      return res.data.favorited;
    } catch { return false; }
  };

  return (
    <FavoritesContext.Provider value={{ isFavorited, toggleFavorite, loadFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
};

export default FavoritesContext;
