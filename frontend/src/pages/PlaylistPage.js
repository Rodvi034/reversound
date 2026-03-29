import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useNavigate } from 'react-router-dom';
import { Play, Music2, Send, ListMusic, Loader, Check } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';
import WaveformBars from '@/components/WaveformBars';
import { SkeletonCard } from '@/components/SkeletonLoader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const GENRES = ['All', 'Trap', 'Hip-Hop', 'Drill', 'R&B', 'Pop', 'Lo-Fi', 'Techno', 'EDM'];

const GENRE_COLORS = {
  Trap: '#8b5cf6', 'Hip-Hop': '#ec4899', Drill: '#ef4444', 'R&B': '#f59e0b',
  Pop: '#06b6d4', 'Lo-Fi': '#10b981', Techno: '#6366f1', EDM: '#f97316'
};

const PlaylistPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { playBeat, currentBeat, isPlaying } = usePlayer();

  const [playlists, setPlaylists] = useState([]);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [playlistDetail, setPlaylistDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [submitForm, setSubmitForm] = useState({ title: '', genre: 'Trap', track_url: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  useEffect(() => {
    axios.get(`${API}/playlists`)
      .then(res => { setPlaylists(res.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activePlaylist) return;
    setDetailLoading(true);
    axios.get(`${API}/playlists/${activePlaylist}`)
      .then(res => setPlaylistDetail(res.data))
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }, [activePlaylist]);

  useEffect(() => {
    if (user && token) {
      axios.get(`${API}/playlists/my/submissions`,
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      ).then(res => setSubmissions(res.data || [])).catch(() => {});
    }
  }, [user, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMsg('');
    try {
      await axios.post(`${API}/playlists/submit`, submitForm,
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      setSubmitMsg('Başvurun alındı! Jury ekibi inceleyecek.');
      setSubmitForm({ title: '', genre: 'Trap', track_url: '', description: '' });
    } catch (err) {
      setSubmitMsg(err.response?.data?.detail || 'Başvuru gönderilemedi');
    } finally { setSubmitting(false); }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading font-bold text-2xl text-white flex items-center gap-2">
              <ListMusic size={22} className="text-[#8b5cf6]" /> Küratörlü Playlist'ler
            </h1>
            <p className="text-[#a1a1aa] text-sm mt-0.5">Platform tarafından seçilen en iyi parçalar</p>
          </div>
          {user && (
            <button
              onClick={() => setShowSubmit(s => !s)}
              className="flex items-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-medium px-4 py-2 rounded-md transition-all hover:shadow-glow"
              data-testid="submit-track-btn"
            >
              <Send size={14} /> Parça Öner
            </button>
          )}
        </div>

        {/* Submit form */}
        {showSubmit && user && (
          <div className="rs-card p-5 mb-6 animate-fade-up border-[#8b5cf6]/20">
            <h3 className="text-sm font-semibold text-white mb-4 font-mono uppercase tracking-wider">Playlist Başvurusu</h3>
            {submitMsg && (
              <div className={`p-3 rounded-md text-sm mb-4 ${submitMsg.includes('alındı') ? 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {submitMsg}
              </div>
            )}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Parça Adı *</label>
                <input required type="text" value={submitForm.title}
                  onChange={e => setSubmitForm(f => ({ ...f, title: e.target.value }))}
                  className="rs-input text-sm" placeholder="Parçanın adı" data-testid="submit-title" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Tür *</label>
                <select value={submitForm.genre} onChange={e => setSubmitForm(f => ({ ...f, genre: e.target.value }))} className="rs-input text-sm">
                  {GENRES.filter(g => g !== 'All').map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Parça Linki *</label>
                <input required type="url" value={submitForm.track_url}
                  onChange={e => setSubmitForm(f => ({ ...f, track_url: e.target.value }))}
                  className="rs-input text-sm" placeholder="SoundCloud, YouTube, veya doğrudan MP3 linki"
                  data-testid="submit-track-url" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Açıklama</label>
                <textarea rows={2} value={submitForm.description}
                  onChange={e => setSubmitForm(f => ({ ...f, description: e.target.value }))}
                  className="rs-input resize-none text-sm" placeholder="Parça hakkında kısa not..." />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between">
                <p className="text-xs text-[#a1a1aa]">Jury ekibi 48 saat içinde değerlendirir.</p>
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white text-sm px-4 py-2 rounded-md transition-all">
                  {submitting ? <Loader size={14} className="animate-spin" /> : <Send size={14} />} Gönder
                </button>
              </div>
            </form>

            {/* My submissions */}
            {submissions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-xs font-mono uppercase text-[#a1a1aa] mb-3">Önceki Başvurularım</p>
                <div className="space-y-2">
                  {submissions.slice(0, 3).map(s => (
                    <div key={s.id} className="flex items-center gap-3 text-sm">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${s.status === 'approved' ? 'bg-[#10b981]/10 text-[#10b981]' : s.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-[#f59e0b]/10 text-[#f59e0b]'}`}>
                        {s.status === 'approved' ? 'Onaylandı' : s.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
                      </span>
                      <span className="text-white truncate">{s.title}</span>
                      <span className="text-[#a1a1aa] text-xs">{s.genre}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Playlist list */}
          <div>
            <p className="text-xs font-mono uppercase text-[#a1a1aa] mb-3">Platform Playlist'leri</p>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : playlists.length === 0 ? (
              <div className="rs-card p-6 text-center">
                <ListMusic size={32} className="text-[#a1a1aa] mx-auto mb-3 opacity-20" />
                <p className="text-sm text-[#a1a1aa]">Henüz playlist oluşturulmamış.</p>
                {user?.role === 'admin' && (
                  <button onClick={() => navigate('/admin')} className="text-xs text-[#8b5cf6] hover:text-[#7c3aed] mt-2 transition-colors">
                    Admin'de Playlist Oluştur →
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {playlists.map(pl => {
                  const genreColor = GENRE_COLORS[pl.genre] || '#8b5cf6';
                  return (
                    <button
                      key={pl.id}
                      onClick={() => setActivePlaylist(pl.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-md border text-left transition-all ${activePlaylist === pl.id ? 'border-[#8b5cf6] bg-[#8b5cf6]/5' : 'border-white/5 bg-[#141416] hover:border-white/10'}`}
                      data-testid={`playlist-${pl.id}`}
                    >
                      <div className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ background: `${genreColor}20`, border: `1px solid ${genreColor}30` }}>
                        <Music2 size={16} style={{ color: genreColor }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{pl.name}</p>
                        <p className="text-xs text-[#a1a1aa]">{pl.track_count || pl.tracks?.length || 0} parça · {pl.genre}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Playlist detail */}
          <div className="lg:col-span-2">
            {!activePlaylist ? (
              <div className="rs-card p-10 text-center">
                <ListMusic size={40} className="text-[#a1a1aa] mx-auto mb-4 opacity-20" />
                <p className="text-[#a1a1aa] text-sm">Bir playlist seçerek parçaları dinle.</p>
              </div>
            ) : detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader size={24} className="text-[#8b5cf6] animate-spin" />
              </div>
            ) : playlistDetail ? (
              <div className="rs-card overflow-hidden">
                <div className="p-5 border-b border-white/5">
                  <h2 className="font-heading font-bold text-xl text-white mb-1">{playlistDetail.name}</h2>
                  <p className="text-sm text-[#a1a1aa]">{playlistDetail.description}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="badge-genre">{playlistDetail.genre}</span>
                    <span className="text-xs text-[#a1a1aa]">{playlistDetail.tracks?.length || 0} parça</span>
                  </div>
                </div>
                <div className="divide-y divide-white/5">
                  {(playlistDetail.tracks || []).length === 0 ? (
                    <div className="text-center py-10 text-[#a1a1aa] text-sm">Bu playlist henüz boş.</div>
                  ) : (
                    (playlistDetail.tracks || []).map((track, i) => {
                      const beat = track.beat_info || {};
                      const isActive = currentBeat?.id === track.beat_id;
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-4 px-5 py-3 hover:bg-[#1a1a1f] transition-colors ${isActive ? 'bg-[#8b5cf6]/5' : ''}`}
                        >
                          <span className="text-xs text-[#a1a1aa] font-mono w-5">{i + 1}</span>
                          {track.beat_id && beat.audio_url && (
                            <button
                              onClick={() => playBeat({ id: track.beat_id, ...beat })}
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: isActive ? '#8b5cf6' : 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)' }}
                            >
                              {isActive && isPlaying
                                ? <WaveformBars playing bars={3} height={10} />
                                : <Play size={10} className="text-[#8b5cf6] ml-0.5" />
                              }
                            </button>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isActive ? 'text-[#8b5cf6]' : 'text-white'}`}>
                              {beat.title || track.title || 'Parça'}
                            </p>
                            <p className="text-xs text-[#a1a1aa]">{beat.producer_name || track.artist_name || ''}</p>
                          </div>
                          {beat.bpm && <span className="font-mono text-xs text-[#a1a1aa] hidden md:block">{beat.bpm} BPM</span>}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PlaylistPage;
