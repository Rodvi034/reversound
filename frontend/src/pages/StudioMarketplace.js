import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Star, Clock, Plus, Search, Loader } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';
import { SkeletonCard } from '@/components/SkeletonLoader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Dynamic Leaflet import to avoid SSR issues
const MapView = React.lazy(() => import('./StudioMapView'));

const StudioMarketplace = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [studios, setStudios] = useState([]);
  const [mapStudios, setMapStudios] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid'); // grid | map
  const [page, setPage] = useState(1);

  const fetchStudios = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (city) params.append('city', city);
      if (search) params.append('search', search);
      const [listRes, mapRes] = await Promise.all([
        axios.get(`${API}/studios?${params}`),
        axios.get(`${API}/studios/map`),
      ]);
      setStudios(listRes.data.studios || []);
      setTotal(listRes.data.total || 0);
      setMapStudios(mapRes.data || []);
    } catch {} finally { setLoading(false); }
  }, [page, city, search]);

  useEffect(() => { fetchStudios(); }, [fetchStudios]);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading font-bold text-2xl text-white flex items-center gap-2">
              <MapPin size={22} className="text-[#8b5cf6]" /> Stüdyo Kirala
            </h1>
            <p className="text-[#a1a1aa] text-sm mt-0.5">Yakınındaki profesyonel kayıt stüdyolarını keşfet</p>
          </div>
          {user && (
            <button onClick={() => navigate('/studios/list')}
              className="flex items-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-medium px-4 py-2 rounded-md transition-all hover:shadow-glow"
              data-testid="list-studio-btn">
              <Plus size={14} /> Stüdyo Ekle
            </button>
          )}
        </div>

        {/* View toggle + Search */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="flex bg-[#141416] border border-white/5 rounded-lg p-1 gap-1">
            <button onClick={() => setView('grid')}
              className={`px-4 py-1.5 text-xs font-mono uppercase rounded-md transition-all ${view === 'grid' ? 'bg-[#8b5cf6] text-white' : 'text-[#a1a1aa] hover:text-white'}`}>
              Grid
            </button>
            <button onClick={() => setView('map')}
              className={`px-4 py-1.5 text-xs font-mono uppercase rounded-md transition-all ${view === 'map' ? 'bg-[#8b5cf6] text-white' : 'text-[#a1a1aa] hover:text-white'}`}
              data-testid="map-view-btn">
              Harita
            </button>
          </div>
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
            <input type="text" placeholder="Stüdyo ara..." value={search}
              onChange={e => setSearch(e.target.value)} className="rs-input pl-9 text-sm h-9" />
          </div>
          <input type="text" placeholder="Şehir..." value={city}
            onChange={e => setCity(e.target.value)} className="rs-input w-36 text-sm h-9" data-testid="studio-city-filter" />
        </div>

        {/* Map View */}
        {view === 'map' && (
          <div className="rs-card overflow-hidden mb-6 h-80 relative">
            <React.Suspense fallback={<div className="flex items-center justify-center h-full"><Loader size={24} className="text-[#8b5cf6] animate-spin" /></div>}>
              <MapView studios={mapStudios} onStudioClick={id => navigate(`/studios/${id}`)} />
            </React.Suspense>
          </div>
        )}

        {/* Grid View */}
        {view === 'grid' && (
          loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : studios.length === 0 ? (
            <div className="text-center py-16 text-[#a1a1aa]">Bu bölgede stüdyo bulunamadı.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {studios.map(studio => (
                <div key={studio.id} className="rs-card overflow-hidden cursor-pointer group hover:border-[#8b5cf6]/20 transition-all"
                  onClick={() => navigate(`/studios/${studio.id}`)} data-testid={`studio-${studio.id}`}>
                  {/* Cover */}
                  <div className="h-44 bg-[#0d0d0f] overflow-hidden">
                    {studio.photos?.[0] ? (
                      <img src={studio.photos[0]} alt={studio.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#a1a1aa]"><MapPin size={32} className="opacity-20" /></div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-semibold text-white mb-1">{studio.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-[#a1a1aa] mb-2">
                      <MapPin size={11} /> {studio.city}
                      {studio.rating > 0 && <><span className="mx-1">·</span><Star size={11} className="text-[#f59e0b] fill-[#f59e0b]" />{studio.rating}</>}
                    </div>
                    {studio.amenities?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {studio.amenities.slice(0, 3).map(a => (
                          <span key={a} className="badge-genre text-[9px]">{a}</span>
                        ))}
                        {studio.amenities.length > 3 && <span className="badge-genre text-[9px]">+{studio.amenities.length - 3}</span>}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="text-xs text-[#a1a1aa] flex items-center gap-1">
                        <Clock size={11} /> Saatlik
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-white">₺{studio.total_rate?.toFixed(0) || studio.hourly_rate?.toFixed(0)}</p>
                        <p className="text-[10px] text-[#a1a1aa]">komisyon dahil</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </Layout>
  );
};

export default StudioMarketplace;
