import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Star, Clock, Plus, Search, Loader, Heart, SlidersHorizontal } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';
import { useFavorites } from '@/contexts/FavoritesContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Dynamic Leaflet map (lazy loaded)
const MapView = React.lazy(() => import('./StudioMapView'));

const StudioCard = ({ studio, onSelect, isSelected }) => {
  const navigate = useNavigate();
  const { isFavorited, toggleFavorite } = useFavorites();
  const { user } = useAuth();
  const favorited = isFavorited(studio.id, 'studio');

  return (
    <div
      className={`rs-card overflow-hidden cursor-pointer group transition-all ${isSelected ? 'border-[#8b5cf6] shadow-glow-sm' : 'hover:border-[#8b5cf6]/20'}`}
      onClick={() => navigate(`/studios/${studio.id}`)}
      data-testid={`studio-card-${studio.id}`}
    >
      {/* Cover photo */}
      <div className="relative h-44 overflow-hidden bg-[#0d0d0f]">
        {studio.photos?.[0] ? (
          <img src={studio.photos[0]} alt={studio.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><MapPin size={32} className="text-[#a1a1aa] opacity-20" /></div>
        )}
        {/* Heart */}
        <button
          onClick={e => { e.stopPropagation(); user ? toggleFavorite(studio.id, 'studio') : navigate('/auth'); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-black/70"
        >
          <Heart size={14} fill={favorited ? '#ec4899' : 'none'} className={favorited ? 'text-[#ec4899]' : 'text-white'} />
        </button>
        {/* Distance badge if available */}
        {studio.distance_km && (
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono px-2 py-0.5 rounded-full">
            {studio.distance_km} km
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-semibold text-white leading-tight flex-1">{studio.name}</h3>
          {studio.rating > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star size={11} className="text-[#f59e0b] fill-[#f59e0b]" />
              <span className="text-xs text-[#a1a1aa]">{studio.rating}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-[#a1a1aa] mb-2">
          <MapPin size={10} /> {studio.address?.split(',')[0] || studio.city}
        </div>
        {studio.amenities?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {studio.amenities.slice(0, 2).map(a => <span key={a} className="badge-genre text-[9px]">{a}</span>)}
            {studio.amenities.length > 2 && <span className="badge-genre text-[9px]">+{studio.amenities.length - 2}</span>}
          </div>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="flex items-center gap-1 text-xs text-[#a1a1aa]"><Clock size={10} /> Saatlik</div>
          <div>
            <span className="text-sm font-bold text-white">₺{studio.total_rate?.toFixed(0) || studio.hourly_rate?.toFixed(0)}</span>
            <span className="text-[10px] text-[#a1a1aa] ml-1">/ saat</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudioMarketplace = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [studios, setStudios] = useState([]);
  const [mapStudios, setMapStudios] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [showMap, setShowMap] = useState(true);

  const fetchStudios = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (city) params.append('city', city);
      if (search) params.append('search', search);
      const [listRes, mapRes] = await Promise.all([
        axios.get(`${API}/studios?${params}`),
        axios.get(`${API}/studios/map?radius_km=1000`),
      ]);
      setStudios(listRes.data.studios || []);
      setTotal(listRes.data.total || 0);
      setMapStudios(mapRes.data || []);
    } catch {} finally { setLoading(false); }
  }, [page, city, search]);

  useEffect(() => { fetchStudios(); }, [fetchStudios]);

  return (
    <div className="bg-[#0d0d0f] min-h-screen">
      {/* Sticky search bar */}
      <div className="sticky top-14 z-30 bg-[#0d0d0f]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
            <input type="text" placeholder="Stüdyo veya şehir ara..." value={search}
              onChange={e => setSearch(e.target.value)} className="rs-input pl-9 text-sm h-9" data-testid="studio-search" />
          </div>
          <input type="text" placeholder="Şehir" value={city}
            onChange={e => setCity(e.target.value)} className="rs-input w-32 text-sm h-9" data-testid="studio-city" />
          <div className="flex bg-[#141416] border border-white/5 rounded-lg p-1 gap-1">
            <button onClick={() => setShowMap(false)} className={`px-3 py-1 rounded-md text-xs transition-all ${!showMap ? 'bg-[#8b5cf6] text-white' : 'text-[#a1a1aa] hover:text-white'}`}>
              Liste
            </button>
            <button onClick={() => setShowMap(true)} className={`px-3 py-1 rounded-md text-xs transition-all ${showMap ? 'bg-[#8b5cf6] text-white' : 'text-[#a1a1aa] hover:text-white'}`} data-testid="map-view-btn">
              Harita
            </button>
          </div>
          {user && (
            <button onClick={() => navigate('/studios/list')}
              className="flex items-center gap-1.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-xs font-bold px-4 py-2 rounded-md transition-all hover:shadow-glow uppercase tracking-wide flex-shrink-0"
              data-testid="list-studio-btn">
              <Plus size={12} /> Stüdyo Ekle
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5">
        {/* Stats line */}
        <div className="flex items-center gap-2 mb-5 text-sm text-[#a1a1aa]">
          <MapPin size={14} className="text-[#8b5cf6]" />
          <span>{total > 0 ? `${total} stüdyo bulundu` : 'Stüdyo aranıyor...'}</span>
        </div>

        {/* Airbnb-style: Cards + Map split view */}
        <div className={`${showMap ? 'grid grid-cols-1 lg:grid-cols-2 gap-5' : ''}`}>
          {/* Left: Card grid */}
          <div className={showMap ? 'overflow-y-auto' : ''} style={showMap ? { maxHeight: 'calc(100vh - 12rem)' } : {}}>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rs-card overflow-hidden animate-pulse">
                    <div className="h-44 bg-white/5" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 bg-white/5 rounded w-3/4" />
                      <div className="h-2.5 bg-white/5 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : studios.length === 0 ? (
              <div className="text-center py-16 text-[#a1a1aa]">
                <MapPin size={40} className="mx-auto mb-4 opacity-20" />
                <p>Bu bölgede stüdyo bulunamadı.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {studios.map(studio => (
                  <StudioCard
                    key={studio.id}
                    studio={studio}
                    isSelected={selectedId === studio.id}
                    onSelect={() => setSelectedId(studio.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Sticky Map (desktop only) */}
          {showMap && (
            <div className="hidden lg:block sticky top-36 rounded-2xl overflow-hidden border border-white/8"
              style={{ height: 'calc(100vh - 12rem)' }}>
              <React.Suspense fallback={<div className="flex items-center justify-center h-full bg-[#141416]"><Loader size={24} className="text-[#8b5cf6] animate-spin" /></div>}>
                <MapView
                  studios={mapStudios}
                  selectedId={selectedId}
                  onStudioClick={id => { setSelectedId(id); navigate(`/studios/${id}`); }}
                />
              </React.Suspense>
            </div>
          )}

          {/* Mobile map */}
          {showMap && (
            <div className="lg:hidden rounded-xl overflow-hidden h-64 border border-white/8 mt-4">
              <React.Suspense fallback={<div className="flex items-center justify-center h-full"><Loader size={20} className="text-[#8b5cf6] animate-spin" /></div>}>
                <MapView studios={mapStudios} onStudioClick={id => navigate(`/studios/${id}`)} />
              </React.Suspense>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudioMarketplace;
