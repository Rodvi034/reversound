import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import axios from 'axios';

const PlayerContext = createContext(null);
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const PlayerProvider = ({ children }) => {
  const [currentBeat, setCurrentBeat] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }
    const audio = audioRef.current;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMeta = () => setDuration(audio.duration);
    const onEnded = () => { setIsPlaying(false); setProgress(0); };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMeta);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMeta);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const playBeat = async (beat) => {
    const audio = audioRef.current;
    if (currentBeat?.id === beat.id && isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    if (currentBeat?.id !== beat.id) {
      audio.src = beat.audio_url;
      audio.load();
      setCurrentBeat(beat);
      setProgress(0);
      // Record play
      try { await axios.post(`${API}/beats/${beat.id}/play`); } catch {}
    }
    try {
      await audio.play();
      setIsPlaying(true);
    } catch (e) {
      console.error('Playback failed:', e);
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play().then(() => setIsPlaying(true)).catch(() => {}); }
  };

  const seek = (time) => {
    if (audioRef.current) { audioRef.current.currentTime = time; setProgress(time); }
  };

  const changeVolume = (v) => {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const stop = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setIsPlaying(false);
    setProgress(0);
    setCurrentBeat(null);
  };

  return (
    <PlayerContext.Provider value={{ currentBeat, isPlaying, progress, duration, volume, playBeat, togglePlay, seek, changeVolume, stop }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
};

export default PlayerContext;
