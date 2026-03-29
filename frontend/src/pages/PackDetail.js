import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { Play, Pause, Package, Download, ShoppingCart, ChevronLeft, Loader, Music2 } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';
import WaveformBars from '@/components/WaveformBars';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Mini audio player for individual preview tracks
const TrackPreview = ({ track, index, currentPreview, onPlay, onPause }) => {
  const isActive = currentPreview === index;

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-all ${isActive ? 'bg-[#8b5cf6]/10 border border-[#8b5cf6]/20' : 'hover:bg-[#1a1a1f]'}`}>
      <span className="text-xs text-[#a1a1aa] font-mono w-5 text-center">{index + 1}</span>
      <button
        onClick={() => isActive ? onPause() : onPlay(index, track.url)}
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
        style={{ background: isActive ? '#8b5cf6' : 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)' }}
        data-testid={`preview-track-${index}`}
      >
        {isActive
          ? <WaveformBars playing bars={3} height={10} />
          : <Play size={10} className="text-[#8b5cf6] ml-0.5" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? 'text-[#8b5cf6]' : 'text-white'}`}>{track.title}</p>
        {track.duration && <p className="text-xs text-[#a1a1aa]">{track.duration}</p>}
      </div>
    </div>
  );
};

const PackDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { playBeat, currentBeat, isPlaying } = usePlayer();

  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLicense, setSelectedLicense] = useState('basic');
  const [buying, setBuying] = useState(false);
  const [buyMsg, setBuyMsg] = useState('');
  const [currentPreview, setCurrentPreview] = useState(null);
  const [previewAudio] = useState(() => new Audio());

  useEffect(() => {
    axios.get(`${API}/beats/${id}`)
      .then(res => { setPack(res.data); setLoading(false); })
      .catch(() => setLoading(false));

    return () => { previewAudio.pause(); previewAudio.src = ''; };
  }, [id]);

  const playPreview = (index, url) => {
    if (!url) return;
    previewAudio.pause();
    previewAudio.src = url;
    previewAudio.play().catch(() => {});
    setCurrentPreview(index);
    previewAudio.onended = () => setCurrentPreview(null);
  };

  const pausePreview = () => {
    previewAudio.pause();
    setCurrentPreview(null);
  };

  const handleBuy = async () => {
    if (!user) { navigate('/auth'); return; }
    setBuying(true);
    try {
      const res = await axios.post(`${API}/beats/${id}/purchase?license_type=${selectedLicense}`,
        {},
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      setBuyMsg(res.data.message + ' — ' + res.data.rights);
    } catch (err) {
      setBuyMsg(err.response?.data?.detail || 'Satın alma başarısız');
    } finally { setBuying(false); }
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center py-24"><Loader size={24} className="text-[#8b5cf6] animate-spin" /></div>
    </Layout>
  );

  if (!pack || pack.item_type !== 'pack') return (
    <Layout>
      <div className="text-center py-24 text-[#a1a1aa]">Pack bulunamadı.</div>
    </Layout>
  );

  const license = pack.licenses?.find(l => l.type === selectedLicense);
  const previewTracks = pack.preview_tracks || [];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <button onClick={() => navigate('/beats')} className="flex items-center gap-2 text-[#a1a1aa] hover:text-white text-sm mb-6 transition-colors">
          <ChevronLeft size={16} /> Beat Marketine Dön
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Pack info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Header card */}
            <div className="rs-card p-6">
              <div className="flex items-start gap-4">
                {pack.cover_url ? (
                  <img src={pack.cover_url} alt={pack.title} className="w-24 h-24 rounded-lg object-cover flex-shrink-0 border border-white/10" />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center flex-shrink-0">
                    <Package size={32} className="text-[#8b5cf6]" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge-genre text-xs text-[#ec4899] border-[#ec4899]/20 bg-[#ec4899]/5">Sound Pack</span>
                    <span className="badge-genre">{pack.genre}</span>
                  </div>
                  <h1 className="font-heading font-bold text-xl text-white mb-1">{pack.title}</h1>
                  <p className="text-sm text-[#a1a1aa] mb-3">{pack.producer_name} · {pack.bpm} BPM · {pack.key}</p>
                  {pack.description && <p className="text-sm text-[#a1a1aa] leading-relaxed">{pack.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {pack.tags?.map(tag => <span key={tag} className="badge-genre">#{tag}</span>)}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Tracks — Mini Playlist Player */}
            <div className="rs-card overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <Music2 size={14} className="text-[#8b5cf6]" />
                <p className="text-xs font-mono uppercase text-white">Önizleme Parçaları</p>
                <span className="text-xs text-[#a1a1aa] ml-auto">{previewTracks.length} parça</span>
              </div>
              {previewTracks.length === 0 ? (
                <div className="text-center py-8 text-[#a1a1aa] text-sm">
                  <Music2 size={24} className="mx-auto mb-2 opacity-30" />
                  <p>Önizleme parçaları yüklenmemiş.</p>
                </div>
              ) : (
                <div className="p-2 space-y-0.5">
                  {previewTracks.map((track, i) => (
                    <TrackPreview
                      key={i}
                      track={track}
                      index={i}
                      currentPreview={currentPreview}
                      onPlay={playPreview}
                      onPause={pausePreview}
                    />
                  ))}
                </div>
              )}
              {/* Full beat audio preview */}
              {pack.audio_url && (
                <div className="px-4 pb-4 pt-2 border-t border-white/5">
                  <button
                    onClick={() => playBeat(pack)}
                    className="flex items-center gap-2 text-xs text-[#8b5cf6] hover:text-[#7c3aed] transition-colors"
                    data-testid="pack-play-full-btn"
                  >
                    {currentBeat?.id === pack.id && isPlaying
                      ? <><WaveformBars playing bars={3} height={10} /> Demo Çalıyor</>
                      : <><Play size={12} /> Demo Beat'i Çal</>
                    }
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Purchase panel */}
          <div className="space-y-4">
            <div className="rs-card p-5">
              <p className="text-xs font-mono uppercase text-[#a1a1aa] mb-3">Lisans Seç</p>
              <div className="space-y-2 mb-4">
                {pack.licenses?.map(lic => (
                  <button
                    key={lic.type}
                    onClick={() => setSelectedLicense(lic.type)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-md border text-left transition-all ${selectedLicense === lic.type ? 'border-[#8b5cf6] bg-[#8b5cf6]/10' : 'border-white/5 hover:border-white/10'}`}
                    data-testid={`pack-license-${lic.type}`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white capitalize">{lic.type}</p>
                      <p className="text-xs text-[#a1a1aa]">{lic.rights}</p>
                    </div>
                    <span className="text-[#10b981] font-bold">₺{lic.price}</span>
                  </button>
                ))}
              </div>

              {buyMsg && (
                <div className={`p-3 rounded-md text-xs mb-3 ${buyMsg.includes('başarı') ? 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  {buyMsg}
                </div>
              )}

              <button
                onClick={handleBuy}
                disabled={buying || !!buyMsg.includes('başarı')}
                className="w-full bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white font-semibold py-3 rounded-md transition-all flex items-center justify-center gap-2"
                data-testid="pack-buy-btn"
              >
                {buying ? <Loader size={16} className="animate-spin" /> : <><ShoppingCart size={16} /> Satın Al — ₺{license?.price}</>}
              </button>
              <p className="text-xs text-center text-[#a1a1aa] mt-2">İndirme linki satın alma sonrası gönderilir.</p>
            </div>

            {/* Pack info */}
            <div className="rs-card p-4 space-y-3">
              <p className="text-xs font-mono uppercase text-[#a1a1aa]">Pack İçeriği</p>
              <div className="space-y-2 text-xs text-[#a1a1aa]">
                <div className="flex justify-between"><span>Parça Sayısı</span><span className="text-white">{previewTracks.length || '?'}</span></div>
                <div className="flex justify-between"><span>Format</span><span className="text-white">WAV / MP3</span></div>
                <div className="flex justify-between"><span>Tempo</span><span className="text-white">{pack.bpm} BPM</span></div>
                <div className="flex justify-between"><span>Key</span><span className="text-white">{pack.key}</span></div>
                {pack.pack_file_url && (
                  <div className="flex justify-between"><span>Dosya</span><span className="text-[#8b5cf6]">ZIP</span></div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PackDetail;
