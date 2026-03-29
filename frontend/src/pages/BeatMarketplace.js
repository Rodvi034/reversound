import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { Play, Pause, ShoppingCart, Upload, Filter, Search, ChevronDown, Loader } from 'lucide-react';
import axios from 'axios';
import WaveformBars from '@/components/WaveformBars';
import Layout from '@/components/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const GENRES = ['All', 'Trap', 'Hip-Hop', 'Pop', 'Drill', 'R&B', 'Techno', 'Lo-Fi', 'EDM', 'Rock', 'Afrobeat'];
const ITEM_TYPES = [
  { value: 'all', label: 'Tümü' },
  { value: 'beat', label: 'Beat' },
  { value: 'pack', label: 'Sound Pack' },
];

const BuyModal = ({ beat, onClose, token }) => {
  const [selectedLicense, setSelectedLicense] = useState(beat.licenses?.[0]?.type || 'basic');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleBuy = async () => {
    setLoading(true);
    try {
      const res = await axios.post(
        `${API}/beats/${beat.id}/purchase?license_type=${selectedLicense}`,
        {},
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      setMessage(res.data.message + ' — Hak: ' + res.data.rights);
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Satın alma başarısız');
    } finally {
      setLoading(false);
    }
  };

  const license = beat.licenses?.find(l => l.type === selectedLicense);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#141416] border border-white/10 rounded-lg p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-heading font-bold text-white text-lg mb-1">{beat.title}</h3>
        <p className="text-[#a1a1aa] text-sm mb-5">{beat.producer_name}</p>
        {message ? (
          <div className={`p-3 rounded-md text-sm mb-4 ${message.includes('başarısız') || message.includes('hatası') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20'}`}>
            {message}
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-5">
              {beat.licenses?.map(l => (
                <button
                  key={l.type}
                  onClick={() => setSelectedLicense(l.type)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-md border transition-all ${selectedLicense === l.type ? 'border-[#8b5cf6] bg-[#8b5cf6]/10' : 'border-white/5 hover:border-white/10'}`}
                  data-testid={`license-${l.type}`}
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white capitalize">{l.type}</p>
                    <p className="text-xs text-[#a1a1aa]">{l.rights}</p>
                  </div>
                  <span className="text-[#10b981] font-bold">₺{l.price}</span>
                </button>
              ))}
            </div>
            <button
              onClick={handleBuy}
              disabled={loading}
              className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-semibold py-3 rounded-md transition-all flex items-center justify-center gap-2"
              data-testid="buy-confirm-btn"
            >
              {loading ? <Loader size={16} className="animate-spin" /> : <><ShoppingCart size={16} /> Satın Al — ₺{license?.price}</>}
            </button>
          </>
        )}
        <button onClick={onClose} className="w-full mt-2 text-[#a1a1aa] hover:text-white text-sm py-2 transition-colors">İptal</button>
      </div>
    </div>
  );
};

const BeatMarketplace = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, token } = useAuth();
  const { playBeat, currentBeat, isPlaying } = usePlayer();

  const [beats, setBeats] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [genre, setGenre] = useState('All');
  const [itemType, setItemType] = useState('all');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [bpmMin, setBpmMin] = useState('');
  const [bpmMax, setBpmMax] = useState('');
  const [buyBeat, setBuyBeat] = useState(null);

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

        {/* Type filter */}
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
              className={`flex-shrink-0 px-4 py-1.5 rounded-md text-sm font-medium transition-all font-mono uppercase text-xs tracking-wider ${
                genre === g ? 'bg-[#8b5cf6] text-white shadow-glow-sm' : 'bg-[#141416] border border-white/5 text-[#a1a1aa] hover:text-white hover:border-white/10'
              }`}
              data-testid={`genre-filter-${g}`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Search + BPM Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
            <input
              type="text"
              placeholder="Beat ara..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="rs-input pl-9 text-sm h-9"
              data-testid="beat-search-input"
            />
          </div>
          <input
            type="number" placeholder="BPM min" value={bpmMin}
            onChange={e => setBpmMin(e.target.value)}
            className="rs-input w-24 text-sm h-9"
            data-testid="bpm-min-input"
          />
          <input
            type="number" placeholder="BPM max" value={bpmMax}
            onChange={e => setBpmMax(e.target.value)}
            className="rs-input w-24 text-sm h-9"
            data-testid="bpm-max-input"
          />
        </div>

        {/* Beat Table */}
        <div className="rs-card overflow-hidden">
          <div className="hidden md:grid grid-cols-[24px_40px_1fr_80px_80px_60px_120px_100px] gap-4 px-4 py-2 border-b border-white/5 text-xs font-mono uppercase text-[#a1a1aa] tracking-wider">
            <span>#</span>
            <span></span>
            <span>Başlık / Prodüktör</span>
            <span>Tür</span>
            <span>BPM</span>
            <span>Key</span>
            <span>Çalınma</span>
            <span>Fiyat</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            </div>
          ) : beats.length === 0 ? (
            <div className="text-center py-16 text-[#a1a1aa]">Beat bulunamadı.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {beats.map((beat, i) => {
                const active = currentBeat?.id === beat.id;
                return (
                  <div
                    key={beat.id}
                    className={`flex items-center gap-4 px-4 py-3 hover:bg-[#1a1a1f] transition-colors group ${active ? 'bg-[#8b5cf6]/5' : ''}`}
                  >
                    <span className="text-xs text-[#a1a1aa] font-mono w-5 text-center flex-shrink-0">{(page - 1) * 20 + i + 1}</span>

                    {/* Play button */}
                    <button
                      onClick={() => playBeat(beat)}
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        background: active ? '#8b5cf6' : 'rgba(139,92,246,0.08)',
                        border: `1px solid ${active ? '#8b5cf6' : 'rgba(139,92,246,0.2)'}`,
                      }}
                      data-testid={`beat-play-btn-${beat.id}`}
                    >
                      {active && isPlaying
                        ? <WaveformBars playing bars={3} height={12} />
                        : <Play size={12} className="text-[#8b5cf6] ml-0.5" />
                      }
                    </button>

                    {/* Cover + Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {beat.cover_url && (
                        <img src={beat.cover_url} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0 hidden sm:block" />
                      )}
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${active ? 'text-[#8b5cf6]' : 'text-white'}`}>{beat.title}</p>
                        <p className="text-xs text-[#a1a1aa] truncate">{beat.producer_name}</p>
                      </div>
                    </div>

                    {/* Meta */}
                    <span className="badge-genre hidden md:block w-20 text-center flex-shrink-0">{beat.genre}</span>
                    <span className="font-mono text-xs text-[#a1a1aa] hidden md:block w-16 text-center flex-shrink-0">{beat.bpm}</span>
                    <span className="font-mono text-xs text-[#8b5cf6] hidden md:block w-12 flex-shrink-0">{beat.key}</span>
                    <span className="text-xs text-[#a1a1aa] hidden md:flex items-center gap-1 w-20 flex-shrink-0">
                      <Play size={10} /> {beat.plays?.toLocaleString()}
                    </span>

                    {/* Price + Buy */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold text-[#10b981] w-16 text-right">
                        ₺{beat.licenses?.[0]?.price || 0}
                      </span>
                      <button
                        onClick={() => user ? setBuyBeat(beat) : navigate('/auth')}
                        className="text-xs bg-[#8b5cf6]/10 hover:bg-[#8b5cf6] text-[#8b5cf6] hover:text-white border border-[#8b5cf6]/20 hover:border-[#8b5cf6] px-3 py-1.5 rounded-md transition-all hidden sm:block"
                        data-testid={`buy-btn-${beat.id}`}
                      >
                        Satın Al
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-md border border-white/10 text-[#a1a1aa] hover:text-white disabled:opacity-30 transition-colors text-sm"
            >
              Önceki
            </button>
            <span className="text-sm text-[#a1a1aa] font-mono">Sayfa {page} / {Math.ceil(total / 20)}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 20)}
              className="px-4 py-2 rounded-md border border-white/10 text-[#a1a1aa] hover:text-white disabled:opacity-30 transition-colors text-sm"
            >
              Sonraki
            </button>
          </div>
        )}
      </div>

      {buyBeat && <BuyModal beat={buyBeat} onClose={() => setBuyBeat(null)} token={token} />}
    </Layout>
  );
};

export default BeatMarketplace;
