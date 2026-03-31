import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '@/contexts/PlayerContext';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { Play, Trash2, ShoppingCart, Loader, Heart, Music2, Briefcase } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';
import WaveformBars from '@/components/WaveformBars';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FavoritesPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { playBeat, currentBeat, isPlaying } = usePlayer();
  const { addItem, isInCart } = useCart();
  const { toggleFavorite } = useFavorites();
  const [favs, setFavs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('beat');

  useEffect(() => {
    if (!token) return;
    axios.get(`${API}/favorites?item_type=${activeTab}`, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true })
      .then(res => setFavs(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, activeTab]);

  const handleUnfavorite = async (itemId, itemType) => {
    await toggleFavorite(itemId, itemType);
    setFavs(prev => prev.filter(f => f.item_id !== itemId));
  };

  const beats = favs.filter(f => f.item_type === 'beat');
  const gigs = favs.filter(f => f.item_type === 'gig');

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Heart size={20} className="text-[#ec4899]" />
          <h1 className="font-heading font-bold text-2xl text-white">Favorilerim</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-[#141416] border border-white/5 rounded-lg p-1 mb-6 w-fit">
          <button onClick={() => setActiveTab('beat')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono uppercase transition-all ${activeTab === 'beat' ? 'bg-[#8b5cf6] text-white' : 'text-[#a1a1aa] hover:text-white'}`} data-testid="fav-tab-beat">
            <Music2 size={12} /> Beatler
          </button>
          <button onClick={() => setActiveTab('gig')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono uppercase transition-all ${activeTab === 'gig' ? 'bg-[#8b5cf6] text-white' : 'text-[#a1a1aa] hover:text-white'}`} data-testid="fav-tab-gig">
            <Briefcase size={12} /> Servisler
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader size={24} className="text-[#8b5cf6] animate-spin" /></div>
        ) : favs.length === 0 ? (
          <div className="text-center py-16">
            <Heart size={40} className="text-[#a1a1aa] mx-auto mb-4 opacity-20" />
            <p className="text-[#a1a1aa]">Henüz favori {activeTab === 'beat' ? 'beat' : 'servis'} yok.</p>
            <button onClick={() => navigate(activeTab === 'beat' ? '/beats' : '/gigs')} className="mt-3 text-[#8b5cf6] hover:text-[#7c3aed] text-sm transition-colors">
              {activeTab === 'beat' ? 'Beat Market\'e Git →' : 'Servis Market\'e Git →'}
            </button>
          </div>
        ) : activeTab === 'beat' ? (
          <div className="rs-card overflow-hidden">
            <div className="divide-y divide-white/5">
              {beats.map((fav, i) => {
                const beat = fav.item;
                if (!beat) return null;
                const active = currentBeat?.id === beat.id;
                return (
                  <div key={fav.id} className={`flex items-center gap-4 px-4 py-3 hover:bg-[#1a1a1f] transition-colors group ${active ? 'bg-[#8b5cf6]/5' : ''}`}>
                    <span className="text-xs text-[#a1a1aa] font-mono w-5">{i + 1}</span>
                    <button onClick={() => playBeat(beat)}
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: active ? '#8b5cf6' : 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)' }}>
                      {active && isPlaying ? <WaveformBars playing bars={3} height={12} /> : <Play size={12} className="text-[#8b5cf6] ml-0.5" />}
                    </button>
                    {beat.cover_url && <img src={beat.cover_url} alt="" className="w-9 h-9 rounded object-cover hidden sm:block" />}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${active ? 'text-[#8b5cf6]' : 'text-white'}`}>{beat.title}</p>
                      <p className="text-xs text-[#a1a1aa]">{beat.producer_name} · {beat.genre} · {beat.bpm} BPM</p>
                    </div>
                    <span className="text-sm font-bold text-[#10b981]">₺{beat.licenses?.[0]?.price}</span>
                    <button
                      onClick={() => addItem({ id: beat.id, type: 'beat', license_type: 'basic', price: beat.licenses?.[0]?.price, title: beat.title, cover_url: beat.cover_url, producer_name: beat.producer_name })}
                      disabled={isInCart(beat.id, 'basic')}
                      className="text-xs border px-3 py-1.5 rounded-md transition-all hidden sm:block disabled:opacity-40"
                      style={{ borderColor: isInCart(beat.id, 'basic') ? '#10b981' : 'rgba(139,92,246,0.3)', color: isInCart(beat.id, 'basic') ? '#10b981' : '#8b5cf6' }}
                    >
                      {isInCart(beat.id, 'basic') ? '✓ Sepette' : 'Sepete Ekle'}
                    </button>
                    <button onClick={() => handleUnfavorite(beat.id, 'beat')} className="text-[#ec4899] hover:text-[#ec4899]/70 transition-colors" data-testid={`unfav-${beat.id}`}>
                      <Heart size={15} fill="#ec4899" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {gigs.map(fav => {
              const gig = fav.item;
              if (!gig) return null;
              return (
                <div key={fav.id} className="rs-card overflow-hidden cursor-pointer group" onClick={() => navigate(`/gigs/${gig.id}`)}>
                  {gig.cover_url && <div className="h-32 overflow-hidden"><img src={gig.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /></div>}
                  <div className="p-4">
                    <p className="text-xs font-mono uppercase text-[#8b5cf6] mb-1">{gig.category}</p>
                    <p className="text-sm font-semibold text-white line-clamp-2 mb-2">{gig.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#a1a1aa]">₺{gig.tiers?.basic?.price}</span>
                      <button onClick={e => { e.stopPropagation(); handleUnfavorite(gig.id, 'gig'); }} className="text-[#ec4899]">
                        <Heart size={14} fill="#ec4899" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FavoritesPage;
