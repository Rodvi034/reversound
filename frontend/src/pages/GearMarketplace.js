import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Heart, Eye, MapPin, Tag, Loader } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';
import { SkeletonCard } from '@/components/SkeletonLoader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATS = ['All', 'guitars', 'synths', 'microphones', 'studio', 'effects', 'drums', 'dj', 'other'];
const CAT_LABELS = { All: 'Tümü', guitars: 'Gitarlar', synths: 'Synth/Klavye', microphones: 'Mikrofonlar', studio: 'Stüdyo Ekipmanı', effects: 'Efektler', drums: 'Davul', dj: 'DJ Ekipmanı', other: 'Diğer' };
const COND_COLORS = { 'Sıfır': '#10b981', 'Sıfır Gibi': '#8b5cf6', 'İyi': '#f59e0b', 'Orta': '#f97316', 'Parça İçin': '#ec4899' };

const GearMarketplace = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 18 });
      if (category !== 'All') params.append('category', category);
      if (search) params.append('search', search);
      const res = await axios.get(`${API}/gear?${params}`);
      setListings(res.data.listings || []);
      setTotal(res.data.total || 0);
    } catch {} finally { setLoading(false); }
  }, [page, category, search]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading font-bold text-2xl text-white">Gear Market</h1>
            <p className="text-[#a1a1aa] text-sm mt-0.5">{total.toLocaleString()} ikinci el müzik aleti</p>
          </div>
          {user && (
            <button onClick={() => navigate('/gear/sell')}
              className="flex items-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-medium px-4 py-2 rounded-md transition-all hover:shadow-glow"
              data-testid="sell-gear-btn">
              <Plus size={14} /> Sat
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {CATS.map(cat => (
            <button key={cat} onClick={() => { setCategory(cat); setPage(1); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-all ${category === cat ? 'bg-[#8b5cf6] text-white shadow-glow-sm' : 'bg-[#141416] border border-white/5 text-[#a1a1aa] hover:text-white'}`}
              data-testid={`gear-cat-${cat}`}>
              {CAT_LABELS[cat] || cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
          <input type="text" placeholder="Alet, marka ara..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="rs-input pl-9 text-sm h-9" data-testid="gear-search" />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 text-[#a1a1aa]">Bu kategoride ilan bulunamadı.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map(item => (
              <div key={item.id} className="rs-card overflow-hidden cursor-pointer group hover:border-[#8b5cf6]/20 transition-all"
                onClick={() => navigate(`/gear/${item.id}`)} data-testid={`gear-${item.id}`}>
                {/* Image */}
                <div className="h-40 bg-[#0d0d0f] overflow-hidden relative">
                  {item.images?.[0] ? (
                    <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Tag size={32} className="text-[#a1a1aa] opacity-20" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full" style={{ background: `${COND_COLORS[item.condition] || '#a1a1aa'}20`, color: COND_COLORS[item.condition] || '#a1a1aa', border: `1px solid ${COND_COLORS[item.condition] || '#a1a1aa'}30` }}>
                      {item.condition}
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs text-[#8b5cf6] font-mono uppercase mb-1">{item.brand}</p>
                  <p className="text-sm font-semibold text-white line-clamp-2 mb-2 leading-snug">{item.title}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-[#10b981]">
                      ₺{item.price?.toLocaleString()}
                      {item.is_negotiable && <span className="text-[10px] text-[#a1a1aa] ml-1">Pazarlık</span>}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-[#a1a1aa]">
                      <MapPin size={9} /> {item.city}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default GearMarketplace;
