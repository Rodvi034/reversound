import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Radio, Play, Pause, SkipForward, X, ChevronUp, ChevronDown, Volume2, Sparkles, List } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RadioReverPlayer = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [mixType, setMixType] = useState('trending');
  const [loadingMix, setLoadingMix] = useState(false);
  const [playSeconds, setPlaySeconds] = useState(0);
  const audioRef = useRef(null);
  const playTimerRef = useRef(null);
  const trackStartRef = useRef(null);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }
    const audio = audioRef.current;
    audio.onended = () => nextTrack();
    return () => { audio.pause(); };
  }, []);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  // 15-second play tracking
  useEffect(() => {
    if (isPlaying && currentTrack) {
      trackStartRef.current = Date.now();
      playTimerRef.current = setTimeout(() => {
        // Log to RadioRever analytics
        if (token && currentTrack.id && currentTrack.id !== 'demo') {
          axios.post(`${API}/radiorever/track-play`, {
            beat_id: currentTrack.id,
            producer_id: currentTrack.producer_id || '',
          }, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true })
            .catch(() => {});
        }
      }, 15000);
    } else {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    }
    return () => { if (playTimerRef.current) clearTimeout(playTimerRef.current); };
  }, [isPlaying, currentIdx, token]);

  const loadTrendingTracks = async () => {
    try {
      const res = await axios.get(`${API}/beats?limit=20`);
      const beats = (res.data.beats || []).filter(b => b.audio_url);
      setTracks(beats);
      setMixType('trending');
    } catch {}
  };

  const loadDailyMix = async () => {
    if (!token) { navigate('/auth'); return; }
    setLoadingMix(true);
    try {
      const res = await axios.get(`${API}/radiorever/daily-mix`, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true
      });
      const mixTracks = (res.data.tracks || []).filter(b => b.audio_url);
      if (mixTracks.length > 0) {
        setTracks(mixTracks);
        setCurrentIdx(0);
        setMixType(res.data.mix_type || 'personalized');
        // Auto-play
        setTimeout(() => playTrack(mixTracks[0], 0, mixTracks), 100);
      }
    } catch {} finally { setLoadingMix(false); }
  };

  const currentTrack = tracks[currentIdx];

  const playTrack = async (track, idx, trackList) => {
    const audio = audioRef.current;
    if (!audio) return;
    const tList = trackList || tracks;
    const t = track || tList[idx];
    if (!t) return;
    audio.src = t.audio_url;
    audio.load();
    try {
      await audio.play();
      setIsPlaying(true);
    } catch (e) { console.warn('RadioRever play failed'); }
  };

  const nextTrack = () => {
    if (tracks.length === 0) return;
    const next = (currentIdx + 1) % tracks.length;
    setCurrentIdx(next);
    setTimeout(() => playTrack(tracks[next], next), 100);
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else {
      if (!audio.src && currentTrack) {
        audio.src = currentTrack.audio_url;
        audio.load();
      }
      try { await audio.play(); setIsPlaying(true); } catch {}
    }
  };

  const startRadio = async () => {
    setIsOpen(true);
    setMinimized(false);
    await loadTrendingTracks();
  };

  useEffect(() => {
    if (tracks.length > 0 && isOpen && !isPlaying) {
      setTimeout(() => playTrack(tracks[0], 0), 200);
    }
  }, [tracks, isOpen]);

  if (tracks.length === 0 && !isOpen) {
    return (
      <button
        onClick={startRadio}
        className="fixed right-4 bottom-24 md:bottom-6 z-40 flex items-center gap-2 bg-[#141416] border border-[#ec4899]/30 hover:border-[#ec4899] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg transition-all hover:shadow-glow-pink"
        data-testid="radio-rever-btn"
      >
        <Radio size={14} className="text-[#ec4899]" />
        <span>RadioRever</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
      </button>
    );
  }

  if (!isOpen && tracks.length === 0) return null;

  if (!isOpen) return (
    <button onClick={() => setIsOpen(true)}
      className="fixed right-4 bottom-24 md:bottom-6 z-40 flex items-center gap-2 bg-[#141416] border border-[#ec4899]/30 hover:border-[#ec4899] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg transition-all"
      data-testid="radio-rever-btn">
      <Radio size={14} className="text-[#ec4899]" />
      <span>RadioRever</span>
      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
    </button>
  );

  if (minimized) return (
    <div className="fixed right-4 bottom-24 md:bottom-6 z-40 flex items-center gap-3 bg-[#141416] border border-[#ec4899]/20 px-4 py-2.5 rounded-full shadow-lg" data-testid="radio-rever-mini">
      <Radio size={13} className="text-[#ec4899]" />
      <button onClick={togglePlay} className="text-[#8b5cf6] hover:text-[#7c3aed] transition-colors">
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <p className="text-xs text-white max-w-28 truncate">{currentTrack?.title}</p>
      <button onClick={() => setMinimized(false)} className="text-[#a1a1aa] hover:text-white transition-colors ml-1"><ChevronUp size={14} /></button>
      <button onClick={() => { setIsOpen(false); audioRef.current?.pause(); }} className="text-[#a1a1aa] hover:text-[#ec4899] transition-colors"><X size={14} /></button>
    </div>
  );

  return (
    <div className="fixed right-4 bottom-24 md:bottom-6 z-40 w-72 bg-[#141416] border border-[#ec4899]/20 rounded-2xl shadow-2xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #141416, #1a0d1a)' }}
      data-testid="radio-rever-player">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Radio size={14} className="text-[#ec4899]" />
          <span className="text-xs font-bold text-white tracking-wider">RADIOREVER</span>
          {mixType === 'personalized' && <Sparkles size={11} className="text-[#f59e0b]" />}
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setMinimized(true)} className="text-[#a1a1aa] hover:text-white transition-colors p-1"><ChevronDown size={14} /></button>
          <button onClick={() => { setIsOpen(false); audioRef.current?.pause(); setIsPlaying(false); }} className="text-[#a1a1aa] hover:text-[#ec4899] transition-colors p-1"><X size={14} /></button>
        </div>
      </div>

      {/* Daily Mix CTA */}
      {user && (
        <div className="px-4 pt-3">
          <button
            onClick={loadDailyMix}
            disabled={loadingMix}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all border"
            style={{ background: mixType === 'personalized' ? 'rgba(139,92,246,0.15)' : 'transparent', borderColor: 'rgba(139,92,246,0.3)', color: '#8b5cf6' }}
            data-testid="daily-mix-btn"
          >
            {loadingMix ? <span className="animate-spin">⟳</span> : <Sparkles size={12} />}
            {mixType === 'personalized' ? 'Kişisel Mix Aktif' : 'Günün Özel Mix\'i'}
          </button>
        </div>
      )}

      {/* Now playing */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          {currentTrack?.cover_url ? (
            <img src={currentTrack.cover_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-white/10" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-[#ec4899]/10 border border-[#ec4899]/20 flex items-center justify-center flex-shrink-0">
              <Radio size={18} className="text-[#ec4899]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{currentTrack?.title || 'Yükleniyor...'}</p>
            <p className="text-xs text-[#8b5cf6] truncate">{currentTrack?.producer_name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {currentTrack?.genre && <span className="badge-genre text-[9px]">{currentTrack.genre}</span>}
              {currentTrack?.bpm && <span className="text-[9px] text-[#a1a1aa] font-mono">{currentTrack.bpm} BPM</span>}
            </div>
          </div>
        </div>

        {/* Waveform animation */}
        {isPlaying && (
          <div className="flex items-end gap-0.5 justify-center mb-3 h-5">
            {[...Array(18)].map((_, i) => (
              <div key={i} className="w-1 rounded-sm bg-[#ec4899]"
                style={{ height: `${30 + Math.random() * 70}%`, animation: `wave-bar ${0.5 + Math.random() * 0.8}s ease-in-out ${i * 0.06}s infinite`, opacity: 0.5 + Math.random() * 0.5 }} />
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-3">
          <button onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-[#ec4899] hover:bg-[#be185d] flex items-center justify-center transition-all hover:shadow-glow-pink"
            data-testid="radio-toggle-btn">
            {isPlaying ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white ml-0.5" />}
          </button>
          <button onClick={nextTrack} className="text-[#a1a1aa] hover:text-white transition-colors">
            <SkipForward size={18} />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 mb-3">
          <Volume2 size={12} className="text-[#a1a1aa]" />
          <input type="range" min="0" max="1" step="0.05" value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="flex-1 accent-[#ec4899] cursor-pointer h-1" />
        </div>

        {/* Track queue */}
        <div className="pt-2 border-t border-white/5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-mono uppercase text-[#a1a1aa]">
              {mixType === 'personalized' ? '✨ Kişisel Mix' : '📻 Trend'} ({tracks.length} parça)
            </p>
            <span className="text-[9px] text-[#a1a1aa]">{currentIdx + 1}/{tracks.length}</span>
          </div>
          <div className="space-y-1.5 max-h-20 overflow-y-auto scrollbar-hide">
            {tracks.slice(Math.max(0, currentIdx - 1), currentIdx + 4).map((t, i) => {
              const absIdx = Math.max(0, currentIdx - 1) + i;
              return (
                <div key={t.id} className={`flex items-center gap-2 text-xs ${absIdx === currentIdx ? 'text-[#ec4899]' : 'text-[#a1a1aa]'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${absIdx === currentIdx ? 'bg-[#ec4899] animate-pulse' : 'bg-white/20'}`} />
                  <span className="truncate flex-1">{t.title}</span>
                  <span className="text-[9px] font-mono opacity-60">{t.bpm}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadioReverPlayer;
