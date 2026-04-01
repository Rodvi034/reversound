import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Play, Pause, SkipForward, X, ChevronUp, ChevronDown, Volume2 } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RadioReverPlayer = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef(null);

  useEffect(() => {
    // Fetch approved beats for radio playlist
    axios.get(`${API}/beats?limit=20&status=approved`)
      .then(res => {
        const beats = (res.data.beats || []).filter(b => b.audio_url);
        setTracks(beats);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }
    const audio = audioRef.current;
    audio.onended = () => nextTrack();
    return () => { audio.pause(); };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const currentTrack = tracks[currentIdx];

  const play = async () => {
    if (!currentTrack || !audioRef.current) return;
    if (audioRef.current.src !== currentTrack.audio_url) {
      audioRef.current.src = currentTrack.audio_url;
      audioRef.current.load();
    }
    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (e) { console.warn('RadioRever play failed'); }
  };

  const pause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
  };

  const nextTrack = () => {
    if (tracks.length === 0) return;
    const next = (currentIdx + 1) % tracks.length;
    setCurrentIdx(next);
    if (isPlaying) {
      setTimeout(() => {
        if (audioRef.current && tracks[next]) {
          audioRef.current.src = tracks[next].audio_url;
          audioRef.current.load();
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }, 100);
    }
  };

  const togglePlay = () => { isPlaying ? pause() : play(); };

  const startRadio = () => {
    setIsOpen(true);
    setMinimized(false);
    if (tracks.length > 0) play();
  };

  if (tracks.length === 0) return null;

  // Floating trigger button (not open)
  if (!isOpen) {
    return (
      <button
        onClick={startRadio}
        className="fixed right-4 bottom-24 md:bottom-6 z-40 flex items-center gap-2 bg-[#141416] border border-[#8b5cf6]/30 hover:border-[#8b5cf6] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg transition-all hover:shadow-glow animate-pulse-glow"
        data-testid="radio-rever-btn"
        style={{ animationDuration: '3s' }}
      >
        <Radio size={14} className="text-[#ec4899]" />
        <span>RadioRever</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
      </button>
    );
  }

  // Minimized bar
  if (minimized) {
    return (
      <div
        className="fixed right-4 bottom-24 md:bottom-6 z-40 flex items-center gap-3 bg-[#141416] border border-[#8b5cf6]/30 px-4 py-2.5 rounded-full shadow-lg"
        data-testid="radio-rever-mini"
      >
        <Radio size={13} className="text-[#ec4899]" />
        <button onClick={togglePlay} className="text-[#8b5cf6] hover:text-[#7c3aed] transition-colors">
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <p className="text-xs text-white max-w-24 truncate">{currentTrack?.title}</p>
        <button onClick={() => setMinimized(false)} className="text-[#a1a1aa] hover:text-white transition-colors ml-1">
          <ChevronUp size={14} />
        </button>
        <button onClick={() => { setIsOpen(false); pause(); }} className="text-[#a1a1aa] hover:text-[#ec4899] transition-colors">
          <X size={14} />
        </button>
      </div>
    );
  }

  // Full player
  return (
    <div
      className="fixed right-4 bottom-24 md:bottom-6 z-40 w-72 bg-[#141416] border border-[#8b5cf6]/30 rounded-2xl shadow-2xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #141416, #1a1025)' }}
      data-testid="radio-rever-player"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Radio size={14} className="text-[#ec4899]" />
          <span className="text-xs font-bold text-white tracking-wider">RADIOREVER</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setMinimized(true)} className="text-[#a1a1aa] hover:text-white transition-colors p-1">
            <ChevronDown size={14} />
          </button>
          <button onClick={() => { setIsOpen(false); pause(); }} className="text-[#a1a1aa] hover:text-[#ec4899] transition-colors p-1">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Now playing */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          {currentTrack?.cover_url ? (
            <img src={currentTrack.cover_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-white/10" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center flex-shrink-0">
              <Radio size={18} className="text-[#8b5cf6]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{currentTrack?.title || 'Radyo'}</p>
            <button
              onClick={() => navigate(`/u/${currentTrack?.producer_username || ''}`)}
              className="text-xs text-[#8b5cf6] hover:text-[#7c3aed] transition-colors truncate"
            >
              {currentTrack?.producer_name}
            </button>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="badge-genre text-[9px]">{currentTrack?.genre}</span>
              {currentTrack?.bpm && <span className="text-[9px] text-[#a1a1aa] font-mono">{currentTrack.bpm} BPM</span>}
            </div>
          </div>
        </div>

        {/* Waveform dots animation */}
        {isPlaying && (
          <div className="flex items-end gap-0.5 justify-center mb-4 h-6">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-sm bg-[#8b5cf6]"
                style={{
                  height: `${Math.random() * 100}%`,
                  animation: `wave-bar ${0.5 + Math.random() * 0.8}s ease-in-out ${i * 0.05}s infinite`,
                  opacity: 0.6 + Math.random() * 0.4,
                }}
              />
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-[#8b5cf6] hover:bg-[#7c3aed] flex items-center justify-center transition-all hover:shadow-glow"
            data-testid="radio-toggle-btn"
          >
            {isPlaying ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white ml-0.5" />}
          </button>
          <button onClick={nextTrack} className="text-[#a1a1aa] hover:text-white transition-colors">
            <SkipForward size={18} />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <Volume2 size={12} className="text-[#a1a1aa]" />
          <input
            type="range" min="0" max="1" step="0.05"
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="flex-1 accent-[#8b5cf6] cursor-pointer h-1"
          />
        </div>

        {/* Track list */}
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-[10px] font-mono uppercase text-[#a1a1aa] mb-2">Sıradaki</p>
          <div className="space-y-1.5 max-h-24 overflow-y-auto scrollbar-hide">
            {tracks.slice(currentIdx + 1, currentIdx + 4).map((t, i) => (
              <div key={t.id} className="flex items-center gap-2 text-xs text-[#a1a1aa]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]/40 flex-shrink-0" />
                <span className="truncate flex-1">{t.title}</span>
                <span className="text-[9px] font-mono">{t.bpm} BPM</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadioReverPlayer;
