import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { Play, Upload, Search, Heart, ShoppingBag, Loader } from 'lucide-react';
import axios from 'axios';
import WaveformBars from '@/components/WaveformBars';
import Layout from '@/components/Layout';
import LicenseModal from '@/components/LicenseModal';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const GENRES = ['All', 'Trap', 'Hip-Hop', 'Pop', 'Drill', 'R&B', 'Techno', 'Lo-Fi', 'EDM', 'Rock', 'Afrobeat'];
const ITEM_TYPES = [
  { value: 'all', label: 'Tümü' },
  { value: 'beat', label: 'Beat' },
  { value: 'pack', label: 'Sound Pack' },
];

const BeatMarketplace = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { playBeat, currentBeat, isPlaying } = usePlayer();
  const { isFavorited, toggleFavorite } = useFavorites();

  // Initialize from URL params
  const [beats, setBeats] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [genre, setGenre] = useState(() => searchParams.get('genre') || 'All');
  const [itemType, setItemType] = useState(() => {
    const t = searchParams.get('type');
    return t ? t : 'all';
  });
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [bpmMin, setBpmMin] = useState('');
  const [bpmMax, setBpmMax] = useState('');
  const [licenseModal, setLicenseModal] = useState(null); // beat to show licensing for

  const fetchBeats = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (genre && genre !== 'All') params.append('genre', genre);
      if (search) params.append('search', search);
      if (bpmMin) params.append('bpm_min', bpmMin);
      if (bpmMax) params.append('bpm_max', bpmMax);
      if (itemType && itemType !== 'all') params.append('item_type', itemType);
      const res = await axios.get(`${API}/beats?${params}`);
      setBeats(res.data.beats || []);
      setTotal(res.data.total || 0);
    } catch {} finally { setLoading(false); }
  }, [page, genre, search, bpmMin, bpmMax, itemType]);

  useEffect(() => { fetchBeats(); }, [fetchBeats]);

  const handleBuyClick = (beat) => {
    if (!user) { navigate('/auth'); return; }
    if (beat.item_type === 'pack') { navigate(`/packs/${beat.id}`); return; }
    setLicenseModal(beat);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading font-bold text-2xl text-white">Beat Market</h1>
            <p className="text-[#a1a1aa] text-sm mt-0.5">{total.toLocaleString()} beat mevcut</p>
          </div>
          {(user?.role === 'producer' || user?.role === 'admin') && (
            <button
              onClick={() => navigate('/beats/upload')}
              className="flex items-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-medium px-4 py-2 rounded-md transition-all hover:shadow-glow"
              data-testid="upload-beat-btn"
            >
              <Upload size={14} /> Beat Yükle
            </button>
          )}
        </div>

        {/* Item Type filter */}
        <div className="flex gap-2 mb-3">
          {ITEM_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => { setItemType(t.value); setPage(1); }}
              className={`px-4 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-all ${itemType === t.value ? 'bg-[#ec4899] text-white' : 'bg-[#141416] border border-white/5 text-[#a1a1aa] hover:text-white'}`}
              data-testid={`type-filter-${t.value}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Genre Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {GENRES.map(g => (
            <button
              key={g}
              onClick={() => { setGenre(g); setPage(1); }}
              className={`flex-shrink-0 px-4 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-all ${genre === g ? 'bg-[#8b5cf6] text-white shadow-glow-sm' : 'bg-[#141416] border border-white/5 text-[#a1a1aa] hover:text-white hover:border-white/10'}`}
              data-testid={`genre-filter-${g}`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Search + BPM */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
            <input type="text" placeholder="Beat ara..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="rs-input pl-9 text-sm h-9" data-testid="beat-search-input" />
          </div>
          <input type="number" placeholder="BPM min" value={bpmMin} onChange={e => setBpmMin(e.target.value)} className="rs-input w-24 text-sm h-9" data-testid="bpm-min-input" />
          <input type="number" placeholder="BPM max" value={bpmMax} onChange={e => setBpmMax(e.target.value)} className="rs-input w-24 text-sm h-9" data-testid="bpm-max-input" />
        </div>

        {/* Beat Table */}
        <div className="rs-card overflow-hidden">
          <div className="hidden md:grid grid-cols-[24px_40px_1fr_80px_70px_50px_80px_120px_40px] gap-3 px-4 py-2 border-b border-white/5 text-xs font-mono uppercase text-[#a1a1aa] tracking-wider">
            <span>#</span><span></span><span>Başlık / Prodüktör</span>
            <span>Tür</span><span>BPM</span><span>Key</span><span>Çalınma</span><span>Fiyat</span><span></span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex gap-1">{[...Array(5)].map((_, i) => <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />)}</div>
            </div>
          ) : beats.length === 0 ? (
            <div className="text-center py-16 text-[#a1a1aa]">Beat bulunamadı.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {beats.map((beat, i) => {
                const active = currentBeat?.id === beat.id;
                const favorited = isFavorited(beat.id, 'beat');
                return (
                  <div key={beat.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1f] transition-colors group ${active ? 'bg-[#8b5cf6]/5' : ''}`}>
                    <span className="text-xs text-[#a1a1aa] font-mono w-5 text-center flex-shrink-0">{(page - 1) * 20 + i + 1}</span>

                    {/* Play */}
                    <button
                      onClick={() => playBeat(beat)}
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ background: active ? '#8b5cf6' : 'rgba(139,92,246,0.08)', border: `1px solid ${active ? '#8b5cf6' : 'rgba(139,92,246,0.2)'}` }}
                      data-testid={`beat-play-btn-${beat.id}`}
                    >
                      {active && isPlaying ? <WaveformBars playing bars={3} height={12} /> : <Play size={12} className="text-[#8b5cf6] ml-0.5" />}
                    </button>

                    {/* Cover + Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => beat.item_type === 'pack' ? navigate(`/packs/${beat.id}`) : null}>
                      {beat.cover_url && <img src={beat.cover_url} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0 hidden sm:block border border-white/10" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm font-medium truncate ${active ? 'text-[#8b5cf6]' : 'text-white'}`}>{beat.title}</p>
                          {beat.item_type === 'pack' && <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#ec4899]/10 text-[#ec4899] border border-[#ec4899]/20 flex-shrink-0">PACK</span>}
                        </div>
                        <p className="text-xs text-[#a1a1aa] truncate">{beat.producer_name}</p>
                      </div>
                    </div>

                    {/* Meta */}
                    <span className="badge-genre hidden md:block w-20 text-center flex-shrink-0">{beat.genre}</span>
                    <span className="font-mono text-xs text-[#a1a1aa] hidden md:block w-12 text-center flex-shrink-0">{beat.bpm}</span>
                    <span className="font-mono text-xs text-[#8b5cf6] hidden md:block w-8 flex-shrink-0">{beat.key}</span>
                    <span className="text-xs text-[#a1a1aa] hidden md:flex items-center gap-1 w-16 flex-shrink-0">
                      <Play size={9} /> {beat.plays?.toLocaleString()}
                    </span>

                    {/* Price + Buy */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold text-[#10b981] w-16 text-right hidden sm:block">₺{beat.licenses?.[0]?.price || 0}</span>
                      <button
                        onClick={() => handleBuyClick(beat)}
                        className="flex items-center gap-1.5 text-xs bg-[#8b5cf6]/10 hover:bg-[#8b5cf6] text-[#8b5cf6] hover:text-white border border-[#8b5cf6]/20 hover:border-[#8b5cf6] px-3 py-1.5 rounded-md transition-all hidden sm:flex"
                        data-testid={`buy-btn-${beat.id}`}
                      >
                        <ShoppingBag size={11} /> Satın Al
                      </button>
                    </div>

                    {/* Heart / Favorites */}
                    <button
                      onClick={() => user ? toggleFavorite(beat.id, 'beat') : navigate('/auth')}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all flex-shrink-0 opacity-0 group-hover:opacity-100 ${favorited ? 'opacity-100' : ''}`}
                      style={{ background: favorited ? 'rgba(236,72,153,0.1)' : 'transparent' }}
                      data-testid={`heart-btn-${beat.id}`}
                    >
                      <Heart size={13} fill={favorited ? '#ec4899' : 'none'} className={favorited ? 'text-[#ec4899]' : 'text-[#a1a1aa]'} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 rounded-md border border-white/10 text-[#a1a1aa] hover:text-white disabled:opacity-30 transition-colors text-sm">Önceki</button>
            <span className="text-sm text-[#a1a1aa] font-mono">Sayfa {page} / {Math.ceil(total / 20)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)}
              className="px-4 py-2 rounded-md border border-white/10 text-[#a1a1aa] hover:text-white disabled:opacity-30 transition-colors text-sm">Sonraki</button>
          </div>
        )}
      </div>

      {/* LicenseModal — replaces BuyModal for cart flow */}
      {licenseModal && (
        <LicenseModal beat={licenseModal} onClose={() => setLicenseModal(null)} />
      )}
    </Layout>
  );
};

export default BeatMarketplace;
