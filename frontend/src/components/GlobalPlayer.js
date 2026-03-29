import React, { useRef, useEffect, useState } from 'react';
import { usePlayer } from '@/contexts/PlayerContext';
import { Play, Pause, X, Volume2, SkipBack, SkipForward } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';

const formatTime = (secs) => {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const GlobalPlayer = () => {
  const { currentBeat, isPlaying, progress, duration, volume, audioRef, togglePlay, seek, changeVolume, stop } = usePlayer();
  const waveContainerRef = useRef(null);
  const waveSurferRef = useRef(null);
  const [wsReady, setWsReady] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);

  // Init/destroy WaveSurfer when beat changes
  useEffect(() => {
    if (!currentBeat || !waveContainerRef.current) return;

    // Destroy previous instance
    if (waveSurferRef.current) {
      try { waveSurferRef.current.destroy(); } catch {}
      waveSurferRef.current = null;
    }
    setWsReady(false);

    const ws = WaveSurfer.create({
      container: waveContainerRef.current,
      waveColor: 'rgba(139, 92, 246, 0.35)',
      progressColor: '#8b5cf6',
      cursorColor: '#ec4899',
      cursorWidth: 2,
      height: 36,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      normalize: true,
      interact: true,
      backend: 'WebAudio',
    });

    waveSurferRef.current = ws;

    ws.on('ready', () => setWsReady(true));

    ws.on('interaction', (newProgress) => {
      setIsSeeking(true);
      seek(newProgress * (ws.getDuration() || 0));
      setTimeout(() => setIsSeeking(false), 200);
    });

    // Load audio for waveform decoding (visualization only)
    if (currentBeat.audio_url) {
      ws.load(currentBeat.audio_url);
    }

    return () => {
      try { ws.destroy(); } catch {}
      waveSurferRef.current = null;
      setWsReady(false);
    };
  }, [currentBeat?.id, currentBeat?.audio_url]);

  // Sync WaveSurfer progress cursor with HTML audio position
  useEffect(() => {
    if (waveSurferRef.current && wsReady && duration > 0 && !isSeeking) {
      const ratio = progress / duration;
      if (ratio >= 0 && ratio <= 1) {
        try {
          waveSurferRef.current.setTime(progress);
        } catch {}
      }
    }
  }, [progress, duration, wsReady, isSeeking]);

  if (!currentBeat) return null;

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 px-4 py-3"
      style={{ background: 'rgba(13,13,15,0.97)', backdropFilter: 'blur(20px)' }}
      data-testid="global-player"
    >
      <div className="max-w-7xl mx-auto flex items-center gap-4">
        {/* Cover art */}
        <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 border border-white/10 shadow-glow-sm">
          {currentBeat.cover_url ? (
            <img src={currentBeat.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#8b5cf6]/20 flex items-center justify-center">
              <div className="flex gap-0.5 items-end">
                {[3,5,4,6,3].map((h,i) => (
                  <div
                    key={i}
                    className={`w-0.5 bg-[#8b5cf6] rounded-sm ${isPlaying ? 'wave-bar' : ''}`}
                    style={{ height: `${h * 2}px`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Track info */}
        <div className="w-36 flex-shrink-0 hidden sm:block">
          <p className="text-sm font-medium text-white truncate leading-tight">{currentBeat.title}</p>
          <p className="text-xs text-[#a1a1aa] truncate">{currentBeat.producer_name}</p>
        </div>

        {/* Controls */}
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-[#8b5cf6] hover:bg-[#7c3aed] flex items-center justify-center transition-all hover:shadow-glow flex-shrink-0"
          data-testid="player-toggle-btn"
        >
          {isPlaying
            ? <Pause size={14} className="text-white" />
            : <Play size={14} className="text-white ml-0.5" />
          }
        </button>

        {/* WaveSurfer container + fallback progress bar */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          {/* WaveSurfer waveform */}
          <div
            ref={waveContainerRef}
            className="w-full cursor-pointer"
            style={{ height: '36px', opacity: wsReady ? 1 : 0.3, transition: 'opacity 0.3s' }}
          />
          {/* Fallback bar if WaveSurfer not ready */}
          {!wsReady && (
            <div
              className="absolute inset-x-0 h-1 bg-white/5 cursor-pointer mx-4"
              style={{ top: '50%' }}
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                seek(((e.clientX - rect.left) / rect.width) * duration);
              }}
            >
              <div className="h-full bg-[#8b5cf6]/50 transition-all neon-progress" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>

        {/* Time */}
        <span className="text-xs text-[#a1a1aa] font-mono flex-shrink-0 hidden sm:block w-20 text-right">
          {formatTime(progress)} / {formatTime(duration)}
        </span>

        {/* Volume */}
        <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
          <Volume2 size={13} className="text-[#a1a1aa]" />
          <input
            type="range" min="0" max="1" step="0.01"
            value={volume}
            onChange={e => changeVolume(parseFloat(e.target.value))}
            className="w-16 accent-[#8b5cf6] cursor-pointer"
          />
        </div>

        {/* Close */}
        <button
          onClick={stop}
          className="text-[#a1a1aa] hover:text-white transition-colors flex-shrink-0"
          data-testid="player-close-btn"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default GlobalPlayer;
