import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { Play, Music2, Briefcase, Star, TrendingUp, Shield, Zap, ArrowRight, Users, ChevronRight } from 'lucide-react';
import axios from 'axios';
import WaveformBars from '@/components/WaveformBars';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const HERO_BG = "https://static.prod-images.emergentagent.com/jobs/8d651a01-9aa6-4ca1-8c99-7adb0f65b5e1/images/4a30407a4bf9679c5ccac24c94c2bf85e0378c3a637d69c6891893981353ee0e.png";

const STATS = [
  { value: '12K+', label: 'Beats Available' },
  { value: '3.4K+', label: 'Producers' },
  { value: '850+', label: 'Freelancers' },
  { value: '98%', label: 'Satisfaction Rate' },
];

const FEATURES = [
  { icon: Music2, title: 'Beat Marketplace', desc: 'Thousands of beats. Trap, Pop, Drill, Lo-Fi. License and download instantly.', color: '#8b5cf6' },
  { icon: Briefcase, title: 'Freelance Gigs', desc: 'Hire certified mix engineers, mastering pros, and cover art designers.', color: '#10b981' },
  { icon: Shield, title: 'Escrow Protection', desc: 'Funds held securely until you approve the delivery. Zero risk.', color: '#ec4899' },
  { icon: Zap, title: 'AI Career Coach', desc: 'Personalized career roadmaps powered by Gemini AI.', color: '#f59e0b' },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playBeat, currentBeat, isPlaying } = usePlayer();
  const [featuredBeats, setFeaturedBeats] = useState([]);
  const [featuredGigs, setFeaturedGigs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/beats?limit=4`),
      axios.get(`${API}/gigs?limit=3`)
    ]).then(([beatsRes, gigsRes]) => {
      setFeaturedBeats(beatsRes.data.beats || []);
      setFeaturedGigs(gigsRes.data.gigs || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0d0f]">
      {/* Hero */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_BG})` }}
        />
        <div className="absolute inset-0 bg-[#0d0d0f]/80" />
        {/* Neon grid overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto animate-fade-up">
          <div className="inline-flex items-center gap-2 bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span className="text-sm text-[#a1a1aa] font-mono uppercase tracking-wider">Türkiye'nin Müzik Platformu</span>
          </div>
          <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-white mb-6 leading-tight">
            Kariyerini <br />
            <span className="text-[#8b5cf6] text-glow">ReverSound</span> ile<br />
            İnşa Et
          </h1>
          <p className="text-base sm:text-lg text-[#a1a1aa] mb-10 max-w-2xl mx-auto leading-relaxed">
            Beat satın al, gig yayınla, escrow güvencesiyle sipariş ver. Türkiye'nin en güvenli müzik ekosistemi.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(user ? '/beats' : '/auth?tab=register')}
              className="flex items-center justify-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold px-8 py-3.5 rounded-md transition-all hover:shadow-glow text-base"
              data-testid="hero-cta-btn"
            >
              Hemen Başla <ArrowRight size={18} />
            </button>
            <button
              onClick={() => navigate('/beats')}
              className="flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-white font-medium px-8 py-3.5 rounded-md transition-all hover:bg-white/5 text-base"
              data-testid="hero-browse-btn"
            >
              <Play size={16} /> Beat'lere Gözat
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/5 bg-[#141416]">
        <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <div key={i} className="text-center animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <p className="font-heading text-2xl sm:text-3xl font-bold text-[#8b5cf6] text-glow">{s.value}</p>
              <p className="text-sm text-[#a1a1aa] mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="font-heading font-bold text-2xl sm:text-3xl text-white mb-3">Her Şey Tek Platformda</h2>
          <p className="text-[#a1a1aa] text-sm sm:text-base">Müzik kariyerin için ihtiyacın olan her araç.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, color }, i) => (
            <div
              key={i}
              className="rs-card p-6 group cursor-pointer animate-fade-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-all"
                style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <h3 className="font-semibold text-white mb-2 text-sm">{title}</h3>
              <p className="text-[#a1a1aa] text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Beats */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading font-bold text-xl text-white">Öne Çıkan Beatler</h2>
          <button onClick={() => navigate('/beats')} className="flex items-center gap-1 text-sm text-[#8b5cf6] hover:text-[#7c3aed] transition-colors">
            Tümünü Gör <ChevronRight size={14} />
          </button>
        </div>
        <div className="rs-card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-[#a1a1aa]">Yükleniyor...</div>
          ) : (
            <div className="divide-y divide-white/5">
              {featuredBeats.map((beat, i) => (
                <div key={beat.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[#1a1a1f] transition-colors group">
                  <span className="text-xs text-[#a1a1aa] font-mono w-5 text-center">{i + 1}</span>
                  <button
                    onClick={() => playBeat(beat)}
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: (currentBeat?.id === beat.id && isPlaying) ? '#8b5cf6' : 'rgba(139,92,246,0.1)',
                      border: '1px solid rgba(139,92,246,0.3)'
                    }}
                    data-testid={`beat-play-${beat.id}`}
                  >
                    {currentBeat?.id === beat.id && isPlaying
                      ? <WaveformBars playing bars={3} height={12} />
                      : <Play size={12} className="text-[#8b5cf6] ml-0.5" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{beat.title}</p>
                    <p className="text-xs text-[#a1a1aa]">{beat.producer_name}</p>
                  </div>
                  <span className="badge-genre hidden sm:block">{beat.genre}</span>
                  <span className="font-mono text-xs text-[#a1a1aa] hidden md:block">{beat.bpm} BPM</span>
                  <div className="flex items-center gap-1 text-xs text-[#a1a1aa]">
                    <Play size={10} /> {beat.plays?.toLocaleString()}
                  </div>
                  <span className="text-sm font-semibold text-[#10b981]">
                    {beat.licenses?.[0]?.price ? `₺${beat.licenses[0].price}` : 'Free'}
                  </span>
                  <button
                    onClick={() => navigate(`/beats?buy=${beat.id}`)}
                    className="hidden sm:block text-xs bg-[#8b5cf6]/10 hover:bg-[#8b5cf6] text-[#8b5cf6] hover:text-white border border-[#8b5cf6]/30 px-3 py-1.5 rounded-md transition-all"
                    data-testid={`beat-buy-${beat.id}`}
                  >
                    Buy
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Gigs */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading font-bold text-xl text-white">En İyi Servisler</h2>
          <button onClick={() => navigate('/gigs')} className="flex items-center gap-1 text-sm text-[#8b5cf6] hover:text-[#7c3aed] transition-colors">
            Tümünü Gör <ChevronRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featuredGigs.map((gig, i) => (
            <div
              key={gig.id}
              className="rs-card overflow-hidden cursor-pointer group animate-fade-up"
              style={{ animationDelay: `${i * 0.1}s` }}
              onClick={() => navigate(`/gigs/${gig.id}`)}
              data-testid={`gig-card-${gig.id}`}
            >
              <div className="h-36 overflow-hidden">
                <img src={gig.cover_url} alt={gig.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-4">
                <p className="text-xs font-mono uppercase text-[#8b5cf6] mb-1">{gig.category}</p>
                <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2">{gig.title}</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-[#f59e0b] fill-[#f59e0b]" />
                    <span className="text-xs text-[#a1a1aa]">{gig.rating} ({gig.total_reviews})</span>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    ₺{gig.tiers?.basic?.price} <span className="text-[#a1a1aa] font-normal text-xs">den başlayan</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative overflow-hidden border-y border-white/5">
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: `url(https://static.prod-images.emergentagent.com/jobs/8d651a01-9aa6-4ca1-8c99-7adb0f65b5e1/images/5511da9ef17cb91e58c9546e4f84d9fc6ec4cb447279bd1f2245e44e021c1504.png)` }}
        />
        <div className="absolute inset-0 bg-[#0d0d0f]/80" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="font-heading font-bold text-2xl sm:text-3xl text-white mb-4">AI Kariyer Koçun Seni Bekliyor</h2>
          <p className="text-[#a1a1aa] mb-8 leading-relaxed">
            Gemini AI destekli kariyer koçumuz, türlerini ve aktiviteni analiz ederek sana özel bir yol haritası hazırlıyor.
          </p>
          <button
            onClick={() => navigate(user ? '/coach' : '/auth?tab=register')}
            className="inline-flex items-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold px-8 py-3 rounded-md transition-all hover:shadow-glow"
            data-testid="cta-coach-btn"
          >
            <Zap size={16} /> AI Koç ile Tanış
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#8b5cf6] flex items-center justify-center">
              <Music2 size={12} className="text-white" />
            </div>
            <span className="font-heading text-sm font-bold text-white">REVERSOUND</span>
          </div>
          <p className="text-xs text-[#a1a1aa]">© 2026 ReverSound. Tüm hakları saklıdır. reversound.com</p>
          <div className="flex items-center gap-4 text-xs text-[#a1a1aa]">
            <button onClick={() => navigate('/subscriptions')} className="hover:text-white transition-colors">Fiyatlandırma</button>
            <button onClick={() => navigate('/beats')} className="hover:text-white transition-colors">Beat Market</button>
            <button onClick={() => navigate('/gigs')} className="hover:text-white transition-colors">Servisler</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
