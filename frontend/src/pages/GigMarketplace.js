import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Star, Search, Loader } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CATEGORIES = ['All', 'Mixing & Mastering', 'Beat Production', 'Vocal Production', 'Cover Art', 'Music Video', 'Songwriting', 'Distribution', 'PR & Marketing'];

const GigMarketplace = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gigs, setGigs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchGigs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (category && category !== 'All') params.append('category', category);
      if (search) params.append('search', search);
      const res = await axios.get(`${API}/gigs?${params}`);
      setGigs(res.data.gigs || []);
      setTotal(res.data.total || 0);
    } catch {} finally { setLoading(false); }
  }, [page, category, search]);

  useEffect(() => { fetchGigs(); }, [fetchGigs]);

  const SELLER_ROLES = ['producer', 'artist', 'engineer', 'designer', 'admin'];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading font-bold text-2xl text-white">Servis Market</h1>
            <p className="text-[#a1a1aa] text-sm mt-0.5">{total.toLocaleString()} servis mevcut</p>
          </div>
          {user && SELLER_ROLES.includes(user.role) && (
            <button
              onClick={() => navigate('/gigs/create')}
              className="flex items-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-medium px-4 py-2 rounded-md transition-all hover:shadow-glow"
              data-testid="create-gig-btn"
            >
              <Plus size={14} /> Gig Oluştur
            </button>
          )}
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setPage(1); }}
              className={`flex-shrink-0 px-4 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-all ${
                category === cat ? 'bg-[#8b5cf6] text-white shadow-glow-sm' : 'bg-[#141416] border border-white/5 text-[#a1a1aa] hover:text-white'
              }`}
              data-testid={`cat-filter-${cat}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
          <input
            type="text"
            placeholder="Servis ara..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="rs-input pl-9 text-sm h-9"
            data-testid="gig-search"
          />
        </div>

        {/* Gigs grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader size={24} className="text-[#8b5cf6] animate-spin" />
          </div>
        ) : gigs.length === 0 ? (
          <div className="text-center py-16 text-[#a1a1aa]">Bu kategoride servis bulunamadı.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gigs.map((gig, i) => (
              <div
                key={gig.id}
                className="rs-card overflow-hidden cursor-pointer group animate-fade-up"
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => navigate(`/gigs/${gig.id}`)}
                data-testid={`gig-card-${gig.id}`}
              >
                <div className="h-44 overflow-hidden bg-[#0d0d0f]">
                  {gig.cover_url ? (
                    <img src={gig.cover_url} alt={gig.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#8b5cf6]">
                      <Plus size={32} className="opacity-20" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center text-xs font-bold text-[#8b5cf6]">
                      {gig.seller_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="text-xs text-[#a1a1aa]">{gig.seller_name}</span>
                    <span className="badge-genre ml-auto">{gig.category}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2 leading-snug">{gig.title}</h3>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-[#f59e0b] fill-[#f59e0b]" />
                      <span className="text-xs text-[#a1a1aa]">
                        {gig.rating > 0 ? `${gig.rating} (${gig.total_reviews})` : 'Yeni'}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[#a1a1aa]">Başlayan fiyat</p>
                      <p className="text-sm font-bold text-white">₺{gig.tiers?.basic?.price}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {total > 12 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 rounded-md border border-white/10 text-[#a1a1aa] hover:text-white disabled:opacity-30 text-sm">Önceki</button>
            <span className="text-sm text-[#a1a1aa] font-mono">Sayfa {page} / {Math.ceil(total / 12)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 12)}
              className="px-4 py-2 rounded-md border border-white/10 text-[#a1a1aa] hover:text-white disabled:opacity-30 text-sm">Sonraki</button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default GigMarketplace;
