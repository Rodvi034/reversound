import React from 'react';
import { usePlayer } from '@/contexts/PlayerContext';
import { Play, Pause, X, Volume2 } from 'lucide-react';
import WaveformBars from '@/components/WaveformBars';

const formatTime = (secs) => {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const GlobalPlayer = () => {
  const { currentBeat, isPlaying, progress, duration, volume, togglePlay, seek, changeVolume, stop } = usePlayer();

  if (!currentBeat) return null;

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 md:bottom-0 bg-[#141416]/95 backdrop-blur-xl border-t border-white/10 px-4 py-2"
      style={{ marginBottom: 0 }}
      data-testid="global-player"
    >
      {/* Progress bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 bg-white/5 cursor-pointer"
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          seek(ratio * duration);
        }}
      >
        <div className="h-full bg-[#8b5cf6] transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="max-w-7xl mx-auto flex items-center gap-4">
        {/* Cover */}
        <div className="w-9 h-9 rounded-md overflow-hidden flex-shrink-0 border border-white/10">
          {currentBeat.cover_url ? (
            <img src={currentBeat.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#8b5cf6]/20 flex items-center justify-center">
              <WaveformBars playing={isPlaying} bars={3} height={12} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{currentBeat.title}</p>
          <p className="text-xs text-[#a1a1aa] truncate">{currentBeat.producer_name}</p>
        </div>

        {/* Waveform indicator */}
        <div className="hidden md:block">
          <WaveformBars playing={isPlaying} bars={5} height={20} />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-[#8b5cf6] hover:bg-[#7c3aed] flex items-center justify-center transition-colors"
            data-testid="player-toggle-btn"
          >
            {isPlaying ? <Pause size={15} className="text-white" /> : <Play size={15} className="text-white ml-0.5" />}
          </button>
        </div>

        {/* Time */}
        <span className="text-xs text-[#a1a1aa] font-mono hidden sm:block w-16 text-right">
          {formatTime(progress)} / {formatTime(duration)}
        </span>

        {/* Volume */}
        <div className="hidden md:flex items-center gap-2">
          <Volume2 size={14} className="text-[#a1a1aa]" />
          <input
            type="range" min="0" max="1" step="0.01"
            value={volume}
            onChange={e => changeVolume(parseFloat(e.target.value))}
            className="w-16 accent-[#8b5cf6]"
          />
        </div>

        {/* Close */}
        <button onClick={stop} className="text-[#a1a1aa] hover:text-white transition-colors" data-testid="player-close-btn">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default GlobalPlayer;
