import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlayer } from '@/contexts/PlayerContext';
import { Play, Star, Briefcase, Music2, Package, MessageSquare, Share2, Check, Globe, Users, Loader } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';
import Logo from '@/components/Logo';
import WaveformBars from '@/components/WaveformBars';
import { SkeletonCard, SkeletonBeatRow } from '@/components/SkeletonLoader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LOGO_URL = "https://customer-assets.emergentagent.com/job_freelance-beats-test/artifacts/reddx9n4_Gemini_Generated_Image_7ia35j7ia35j7ia3.png";

const ROLE_LABELS = { producer: 'Prodüktör', artist: 'Sanatçı', engineer: 'Mix Engineer', designer: 'Tasarımcı', buyer: 'Alıcı', admin: 'Admin' };
const ROLE_COLORS = { producer: '#8b5cf6', artist: '#10b981', engineer: '#f59e0b', designer: '#06b6d4', admin: '#ec4899' };

const StatBadge = ({ label, value, color }) => (
  <div className="text-center">
    <p className="text-xl font-bold text-white" style={{ color }}>{value}</p>
    <p className="text-[10px] text-[#a1a1aa] font-mono uppercase mt-0.5">{label}</p>
  </div>
);

const PublicProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { playBeat, currentBeat, isPlaying } = usePlayer();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('beats');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Update OG meta tags for social sharing
    const url = `${window.location.href}`;
    document.title = `${username} | ReverSound`;

    const setMeta = (name, content, isOg = false) => {
      const attr = isOg ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };

    axios.get(`${API}/profiles/${username}`)
      .then(res => {
        setData(res.data);
        const p = res.data.profile;
        const desc = p.bio || `${ROLE_LABELS[p.role] || p.role} — ReverSound üzerinde. Beat'leri ve gig'lerini keşfet.`;
        setMeta('description', desc);
        setMeta('og:title', `${p.name} | ReverSound`, true);
        setMeta('og:description', desc, true);
        setMeta('og:image', p.avatar_url || LOGO_URL, true);
        setMeta('og:url', url, true);
        setMeta('og:type', 'profile', true);
        setMeta('twitter:card', 'summary_large_image');
        setMeta('twitter:title', `${p.name} | ReverSound`);
        setMeta('twitter:description', desc);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  const share = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `${data?.profile?.name} | ReverSound`, url });
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-40 bg-white/5 rounded-xl mb-4" />
          <div className="h-6 bg-white/5 rounded w-1/3 mb-2" />
          <div className="h-4 bg-white/5 rounded w-1/2" />
        </div>
      </div>
    </Layout>
  );

  if (!data) return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <Music2 size={48} className="text-[#a1a1aa] mx-auto mb-4 opacity-20" />
        <p className="text-[#a1a1aa]">Profil bulunamadı.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-[#8b5cf6] hover:text-[#7c3aed] text-sm transition-colors">Ana Sayfaya Dön</button>
      </div>
    </Layout>
  );

  const { profile, beats, gigs, packs, stats } = data;
  const roleColor = ROLE_COLORS[profile.role] || '#a1a1aa';
  const TABS = [
    { id: 'beats', label: 'Beatler', count: stats.total_beats, icon: Music2 },
    { id: 'gigs', label: 'Servisler', count: stats.total_gigs, icon: Briefcase },
    ...(packs.length > 0 ? [{ id: 'packs', label: 'Sound Packs', count: packs.length, icon: Package }] : []),
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Hero Header */}
        <div
          className="relative rounded-xl overflow-hidden mb-6"
          style={{ background: `linear-gradient(135deg, ${roleColor}20, rgba(13,13,15,0.95))`, border: `1px solid ${roleColor}30` }}
        >
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(139,92,246,0.4) 0%, transparent 60%)' }} />
          <div className="relative z-10 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar */}
              <div
                className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl font-bold flex-shrink-0 border-2"
                style={{ background: `${roleColor}20`, borderColor: `${roleColor}50`, color: roleColor }}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  profile.name?.charAt(0)?.toUpperCase()
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="font-heading font-bold text-2xl text-white">{profile.name}</h1>
                  {profile.is_verified && (
                    <div className="w-5 h-5 rounded-full bg-[#8b5cf6] flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs font-mono uppercase px-2 py-0.5 rounded-full" style={{ background: `${roleColor}20`, color: roleColor, border: `1px solid ${roleColor}30` }}>
                    {ROLE_LABELS[profile.role] || profile.role}
                  </span>
                  <span className="text-xs text-[#a1a1aa]">@{profile.username}</span>
                </div>
                {profile.bio && (
                  <p className="text-sm text-[#a1a1aa] leading-relaxed max-w-md">{profile.bio}</p>
                )}
                {profile.genres?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {profile.genres.map(g => <span key={g} className="badge-genre text-xs">{g}</span>)}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={share}
                  className="flex items-center gap-1.5 text-xs border border-white/10 hover:border-[#8b5cf6]/30 text-[#a1a1aa] hover:text-white px-3 py-2 rounded-md transition-all"
                  data-testid="share-profile-btn"
                >
                  {copied ? <><Check size={12} className="text-[#10b981]" /> Kopyalandı</> : <><Share2 size={12} /> Paylaş</>}
                </button>
              </div>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-4 mt-6 pt-5 border-t" style={{ borderColor: `${roleColor}20` }}>
              <StatBadge label="Çalınma" value={stats.total_plays?.toLocaleString()} color="#8b5cf6" />
              <StatBadge label="Beat Satışı" value={stats.beat_sales} color="#10b981" />
              <StatBadge label="Tamamlanan" value={stats.completed_orders} color="#f59e0b" />
              <StatBadge label="Ort. Puan" value={stats.avg_rating > 0 ? stats.avg_rating : '—'} color="#ec4899" />
            </div>
          </div>

          {/* ReverSound watermark */}
          <div className="absolute bottom-3 right-4 opacity-20">
            <Logo size="xs" showText={false} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#141416] border border-white/5 rounded-lg p-1 mb-5">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-mono uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-[#8b5cf6] text-white' : 'text-[#a1a1aa] hover:text-white'}`}
                data-testid={`profile-tab-${tab.id}`}
              >
                <Icon size={12} /> {tab.label} <span className="opacity-60">({tab.count})</span>
              </button>
            );
          })}
        </div>

        {/* Beats tab */}
        {activeTab === 'beats' && (
          <div className="rs-card overflow-hidden">
            {beats.length === 0 ? (
              <div className="text-center py-10 text-[#a1a1aa]">Henüz yayınlanmış beat yok.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {beats.map((beat, i) => {
                  const active = currentBeat?.id === beat.id;
                  return (
                    <div key={beat.id} className={`flex items-center gap-4 px-4 py-3 hover:bg-[#1a1a1f] transition-colors ${active ? 'bg-[#8b5cf6]/5' : ''}`}>
                      <span className="text-xs text-[#a1a1aa] font-mono w-5">{i + 1}</span>
                      <button
                        onClick={() => playBeat(beat)}
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: active ? '#8b5cf6' : 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)' }}
                        data-testid={`profile-beat-play-${beat.id}`}
                      >
                        {active && isPlaying ? <WaveformBars playing bars={3} height={10} /> : <Play size={10} className="text-[#8b5cf6] ml-0.5" />}
                      </button>
                      {beat.cover_url && <img src={beat.cover_url} alt="" className="w-8 h-8 rounded object-cover hidden sm:block" />}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${active ? 'text-[#8b5cf6]' : 'text-white'}`}>{beat.title}</p>
                        <p className="text-xs text-[#a1a1aa]">{beat.genre} · {beat.bpm} BPM · {beat.key}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[#a1a1aa] hidden sm:flex">
                        <Play size={9} /> {beat.plays?.toLocaleString()}
                      </div>
                      <span className="text-sm font-bold text-[#10b981]">₺{beat.licenses?.[0]?.price}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Gigs tab */}
        {activeTab === 'gigs' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {gigs.length === 0 ? (
              <div className="col-span-2 text-center py-10 text-[#a1a1aa]">Aktif gig yok.</div>
            ) : gigs.map(gig => (
              <div
                key={gig.id}
                className="rs-card overflow-hidden cursor-pointer group"
                onClick={() => navigate(`/gigs/${gig.id}`)}
                data-testid={`profile-gig-${gig.id}`}
              >
                {gig.cover_url && (
                  <div className="h-32 overflow-hidden">
                    <img src={gig.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <div className="p-4">
                  <span className="badge-genre text-xs mb-2 inline-block">{gig.category}</span>
                  <p className="text-sm font-semibold text-white mb-2 line-clamp-2">{gig.title}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star size={11} className="text-[#f59e0b] fill-[#f59e0b]" />
                      <span className="text-xs text-[#a1a1aa]">{gig.rating > 0 ? gig.rating : '—'}</span>
                    </div>
                    <span className="text-sm font-bold text-white">₺{gig.tiers?.basic?.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Packs tab */}
        {activeTab === 'packs' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {packs.map(pack => (
              <div
                key={pack.id}
                className="rs-card p-4 cursor-pointer hover:border-[#ec4899]/30 transition-all group"
                onClick={() => navigate(`/packs/${pack.id}`)}
                data-testid={`profile-pack-${pack.id}`}
              >
                <div className="flex items-center gap-3">
                  {pack.cover_url ? (
                    <img src={pack.cover_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-[#ec4899]/20 flex items-center justify-center"><Package size={20} className="text-[#ec4899]" /></div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">{pack.title}</p>
                    <p className="text-xs text-[#a1a1aa]">{pack.genre} · {pack.bpm} BPM</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  <span className="badge-genre text-[#ec4899] border-[#ec4899]/20 bg-[#ec4899]/5">Sound Pack</span>
                  <span className="text-sm font-bold text-[#10b981]">₺{pack.licenses?.[0]?.price}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PublicProfile;
