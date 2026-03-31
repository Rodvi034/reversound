import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { Play, ShoppingBag, Heart, Music2, Briefcase, ArrowRight, ChevronRight, Star, Zap, Shield, Search } from 'lucide-react';
import axios from 'axios';
import WaveformBars from '@/components/WaveformBars';
import MarqueeLogos, { AlternatingScroll } from '@/components/MarqueeLogos';
import Logo from '@/components/Logo';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const HERO_BG = "https://static.prod-images.emergentagent.com/jobs/8d651a01-9aa6-4ca1-8c99-7adb0f65b5e1/images/4a30407a4bf9679c5ccac24c94c2bf85e0378c3a637d69c6891893981353ee0e.png";

const GENRES_DATA = [
  { name: 'TRAP', color: '#8b5cf6', img: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=300&fit=crop' },
  { name: 'HIP-HOP', color: '#10b981', img: 'https://images.unsplash.com/photo-1571974599782-87624638275b?w=200&h=300&fit=crop' },
  { name: 'R&B', color: '#f59e0b', img: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=200&h=300&fit=crop' },
  { name: 'POP', color: '#ec4899', img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=300&fit=crop' },
  { name: 'DRILL', color: '#ef4444', img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=300&fit=crop' },
  { name: 'LO-FI', color: '#06b6d4', img: 'https://images.unsplash.com/photo-1483090467739-f32e1aa22c9e?w=200&h=300&fit=crop' },
];

const TESTIMONIALS = [
  { quote: "ReverSound sayesinde müzik üretimimi bir iş haline getirebildim. Escrow sistemi inanılmaz güven veriyor.", name: "Murat K.", role: "Prodüktör", avatar: "M" },
  { quote: "AI kariyer koçu bana Spotify'da büyüme stratejisi hazırladı. 3 ayda dinlenme sayım 10x arttı.", name: "Selin A.", role: "Sanatçı", avatar: "S" },
  { quote: "Fiverr'dan çok daha güvenilir. Alıcılar onaylayınca para geliyor — hiç sorun yaşamadım.", name: "Kerem Y.", role: "Mix Engineer", avatar: "K" },
];

const TrendingTrackCard = ({ beat, onPlay, onAddToCart, isPlaying, isActive, isFavorited, onToggleFavorite }) => (
  <div className="flex-shrink-0 w-44 group cursor-pointer" data-testid={`trending-${beat.id}`}>
    {/* Cover art */}
    <div className="relative w-full h-44 rounded-lg overflow-hidden mb-2">
      {beat.cover_url ? (
        <img src={beat.cover_url} alt={beat.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#8b5cf6]/30 to-[#141416] flex items-center justify-center">
          <Music2 size={28} className="text-[#8b5cf6] opacity-40" />
        </div>
      )}
      {/* Play overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button
          onClick={e => { e.stopPropagation(); onPlay(beat); }}
          className="w-12 h-12 rounded-full bg-[#8b5cf6] flex items-center justify-center hover:bg-[#7c3aed] transition-colors shadow-glow"
        >
          {isActive && isPlaying ? <WaveformBars playing bars={3} height={12} /> : <Play size={16} className="text-white ml-0.5" />}
        </button>
      </div>
      {/* Favorite */}
      <button
        onClick={e => { e.stopPropagation(); onToggleFavorite(beat.id); }}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Heart size={12} fill={isFavorited ? '#ec4899' : 'none'} className={isFavorited ? 'text-[#ec4899]' : 'text-white'} />
      </button>
    </div>
    <p className="text-sm font-semibold text-white truncate">{beat.title}</p>
    <p className="text-xs text-[#a1a1aa] truncate mb-2">{beat.producer_name}</p>
    {/* Price button — BeatStars style */}
    <button
      onClick={() => onAddToCart(beat)}
      className="w-full flex items-center gap-2 py-1.5 px-3 border border-white/15 hover:border-[#8b5cf6]/50 rounded-md text-xs text-white hover:bg-[#8b5cf6]/10 transition-all"
    >
      <ShoppingBag size={11} className="text-[#8b5cf6]" />
      <span className="font-semibold">₺{beat.licenses?.[0]?.price || 0}</span>
    </button>
  </div>
);

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playBeat, currentBeat, isPlaying } = usePlayer();
  const { addItem } = useCart();
  const { isFavorited, toggleFavorite } = useFavorites();

  const [featuredBeats, setFeaturedBeats] = useState([]);
  const [featuredGigs, setFeaturedGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroSearch, setHeroSearch] = useState('');
  const [cmsContent, setCmsContent] = useState(null);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/beats?limit=8`),
      axios.get(`${API}/gigs?limit=4`),
      axios.get(`${API}/cms`),
    ]).then(([beatsRes, gigsRes, cmsRes]) => {
      setFeaturedBeats(beatsRes.data.beats || []);
      setFeaturedGigs(gigsRes.data.gigs || []);
      setCmsContent(cmsRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const hero = cmsContent?.hero || {};
  const stats = cmsContent?.stats || {};
  const genres = cmsContent?.genres || GENRES_DATA;
  const testimonials = cmsContent?.testimonials || TESTIMONIALS;
  const announcement = cmsContent?.announcement;

  const handleAddToCart = (beat) => {
    addItem({
      id: beat.id,
      type: 'beat',
      license_type: 'basic',
      price: beat.licenses?.[0]?.price || 0,
      title: beat.title,
      cover_url: beat.cover_url,
      producer_name: beat.producer_name,
      cart_key: `${beat.id}-basic`
    });
  };

  return (
    <div className="min-h-screen bg-[#0d0d0f]">
      {/* Announcement Banner — CMS controlled */}
      {announcement?.enabled && announcement?.text && (
        <div className="w-full py-2 px-4 text-center text-sm font-medium text-white" style={{ background: announcement.color || '#8b5cf6' }}>
          {announcement.text}
          {announcement.link_url && (
            <a href={announcement.link_url} className="ml-2 underline hover:no-underline">{announcement.link_text || 'Detaylar'}</a>
          )}
        </div>
      )}
      {/* ── HERO: Full-screen with central search ─────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-fixed" style={{ backgroundImage: `url(${HERO_BG})` }} />
        <div className="absolute inset-0 bg-[#0d0d0f]/75" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto w-full animate-fade-up">
          <div className="inline-flex items-center gap-2 bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span className="text-sm text-[#a1a1aa] font-mono uppercase tracking-wider">{hero.badge_text || "Türkiye'nin Müzik Platformu"}</span>
          </div>

          <h1 className="font-heading font-bold text-5xl sm:text-6xl lg:text-7xl text-white mb-6 leading-tight tracking-tighter">
            {(hero.title || "İLK HİTİN BURADA BAŞLIYOR").split('\n').map((line, i) => (
              <React.Fragment key={i}>{line}<br /></React.Fragment>
            ))}
          </h1>

          {/* BeatStars-style search bar */}
          <div className="flex items-center bg-white/5 backdrop-blur-md border border-white/15 rounded-full px-2 py-2 max-w-xl mx-auto mb-8 focus-within:border-[#8b5cf6]/50 transition-colors">
            <Search size={18} className="text-[#a1a1aa] ml-3 flex-shrink-0" />
            <input
              type="text"
              value={heroSearch}
              onChange={e => setHeroSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && heroSearch && navigate(`/beats?search=${heroSearch}`)}
              placeholder="Beat, prodüktör veya tür ara..."
              className="flex-1 bg-transparent text-white placeholder-[#a1a1aa] px-4 py-1 text-sm outline-none"
              data-testid="hero-search"
            />
            <button
              onClick={() => heroSearch && navigate(`/beats?search=${heroSearch}`)}
              className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:shadow-glow"
            >
              Ara
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button onClick={() => navigate(user ? '/beats' : '/auth?tab=register')}
              className="flex items-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold px-8 py-3.5 rounded-md transition-all hover:shadow-glow"
              data-testid="hero-cta-btn">
              Hemen Başla <ArrowRight size={16} />
            </button>
            <button onClick={() => navigate('/studio')}
              className="flex items-center gap-2 border border-white/10 hover:border-white/20 text-white font-medium px-8 py-3.5 rounded-md hover:bg-white/5 transition-all">
              <Zap size={15} /> Rever Studio
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce opacity-50">
          <div className="w-0.5 h-8 bg-white/30 rounded-full" />
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-[#141416]">
        <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[{ v: stats.beats || '12K+', l: 'Beat' }, { v: stats.producers || '3.4K+', l: 'Prodüktör' }, { v: stats.freelancers || '850+', l: 'Freelancer' }, { v: stats.satisfaction || '98%', l: 'Memnuniyet' }].map((s, i) => (
            <div key={i} className="text-center">
              <p className="font-heading text-2xl sm:text-3xl font-bold text-[#8b5cf6] text-glow">{s.v}</p>
              <p className="text-sm text-[#a1a1aa] mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TRENDING TRACKS (BeatStars style) ─────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading font-bold text-xl text-white">Trend Beatler</h2>
          <button onClick={() => navigate('/beats')} className="flex items-center gap-1 text-sm text-[#a1a1aa] hover:text-white transition-colors">
            Tümünü Gör <ChevronRight size={14} />
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {loading ? [...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-44 animate-pulse">
              <div className="w-full h-44 bg-white/5 rounded-lg mb-2" />
              <div className="h-3 bg-white/5 rounded mb-1 w-3/4" />
              <div className="h-2.5 bg-white/5 rounded w-1/2 mb-2" />
              <div className="h-8 bg-white/5 rounded-md" />
            </div>
          )) : featuredBeats.map(beat => (
            <TrendingTrackCard
              key={beat.id}
              beat={beat}
              onPlay={playBeat}
              onAddToCart={handleAddToCart}
              isPlaying={isPlaying}
              isActive={currentBeat?.id === beat.id}
              isFavorited={isFavorited(beat.id, 'beat')}
              onToggleFavorite={id => toggleFavorite(id, 'beat')}
            />
          ))}
        </div>
      </section>

      {/* ── PARTNER LOGOS MARQUEE ─────────────────────────────────────────── */}
      <section className="border-y border-white/5 py-6">
        <p className="text-center text-xs font-mono uppercase tracking-widest text-[#a1a1aa] mb-4">Güvenilirlik Ortakları</p>
        <MarqueeLogos speed={35} />
        <MarqueeLogos speed={40} reverse />
      </section>

      {/* ── MADE ON REVERSOUND (Alternating vertical scroll) ─────────────── */}
      <section className="py-14">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-[#8b5cf6] mb-3">#MADEONCREVERSOUND</p>
              <h2 className="font-heading font-bold text-4xl sm:text-5xl text-white leading-tight mb-6">
                EVET, O HİT<br />
                REVERSOUND'DA<br />
                YAPILDI.
              </h2>
              <p className="text-[#a1a1aa] text-base leading-relaxed mb-8 max-w-md">
                Binlerce sanatçı kariyerlerine burada başladı. Beat satın al, mix yaptır, kariyerini inşa et.
              </p>
              <button
                onClick={() => navigate('/beats')}
                className="flex items-center gap-2 border border-white/15 hover:border-[#8b5cf6]/50 text-white px-6 py-3 rounded-md hover:bg-[#8b5cf6]/10 transition-all text-sm font-medium"
                data-testid="explore-beats-btn"
              >
                Beat Market'e Gir <ChevronRight size={14} />
              </button>
            </div>
            <div className="flex gap-3 justify-center">
              <AlternatingScroll duration={20} />
            </div>
          </div>
        </div>
      </section>

      {/* ── POPULAR GENRES ─────────────────────────────────────────────────── */}
      <section className="py-14 bg-[#141416] border-y border-white/5">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-heading font-bold text-xl text-white">Popüler Türler</h2>
            <button onClick={() => navigate('/beats')} className="text-sm text-[#a1a1aa] hover:text-white transition-colors">Tümünü Gör</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {genres.map((genre, i) => (
              <button
                key={genre.name}
                onClick={() => navigate(`/beats?genre=${genre.name}`)}
                className="relative flex-shrink-0 w-32 h-48 rounded-lg overflow-hidden group cursor-pointer"
                style={{ animationDelay: `${i * 0.05}s` }}
                data-testid={`genre-card-${genre.name}`}
              >
                <img src={genre.img} alt={genre.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/10" />
                <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                  <p className="font-heading font-bold text-sm text-white tracking-wider">{genre.name}</p>
                </div>
                <div className="absolute inset-0 rounded-lg border-2 border-transparent group-hover:border-white/30 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED GIGS ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading font-bold text-xl text-white">Öne Çıkan Servisler</h2>
          <button onClick={() => navigate('/gigs')} className="flex items-center gap-1 text-sm text-[#a1a1aa] hover:text-white transition-colors">
            Tümünü Gör <ChevronRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredGigs.map(gig => (
            <div key={gig.id} className="rs-card overflow-hidden cursor-pointer group" onClick={() => navigate(`/gigs/${gig.id}`)} data-testid={`landing-gig-${gig.id}`}>
              <div className="h-32 overflow-hidden">
                <img src={gig.cover_url} alt={gig.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-3">
                <p className="text-[10px] font-mono uppercase text-[#8b5cf6] mb-1">{gig.category}</p>
                <h3 className="text-xs font-semibold text-white line-clamp-2 mb-2">{gig.title}</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star size={10} className="text-[#f59e0b] fill-[#f59e0b]" />
                    <span className="text-[10px] text-[#a1a1aa]">{gig.rating > 0 ? gig.rating : 'Yeni'}</span>
                  </div>
                  <span className="text-xs font-bold text-white">₺{gig.tiers?.basic?.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="py-14 bg-[#141416] border-y border-white/5">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-heading font-bold text-2xl text-white text-center mb-3">REVERSOUND NE KADAR İYİ?</h2>
          <p className="text-[#a1a1aa] text-center text-sm mb-10">Sadece bizden duymayın. Topluluğumuzdan duyun.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div key={i} className="rs-card p-6 hover:border-white/15 transition-all">
                <div className="h-28 bg-gradient-to-br from-[#8b5cf6]/15 to-[#141416] rounded-lg mb-4 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-[#8b5cf6]/20 border-2 border-[#8b5cf6]/40 flex items-center justify-center text-2xl font-bold text-[#8b5cf6]">
                    {t.avatar}
                  </div>
                </div>
                <p className="text-sm text-white leading-relaxed mb-4 italic">"{t.quote}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center text-xs font-bold text-[#8b5cf6]">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{t.name}</p>
                    <p className="text-[10px] text-[#a1a1aa]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <button onClick={() => navigate('/u/admin')} className="flex items-center gap-2 mx-auto text-sm text-[#8b5cf6] hover:text-[#7c3aed] border border-[#8b5cf6]/30 px-5 py-2.5 rounded-md hover:bg-[#8b5cf6]/10 transition-all">
              Yaratıcıları Keşfet <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ── AI COACH CTA ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 opacity-20 bg-cover bg-center bg-fixed"
          style={{ backgroundImage: "url(https://static.prod-images.emergentagent.com/jobs/8d651a01-9aa6-4ca1-8c99-7adb0f65b5e1/images/5511da9ef17cb91e58c9546e4f84d9fc6ec4cb447279bd1f2245e44e021c1504.png)" }} />
        <div className="absolute inset-0 bg-[#0d0d0f]/80" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center mx-auto mb-5">
            <Zap size={28} className="text-[#8b5cf6]" />
          </div>
          <h2 className="font-heading font-bold text-3xl text-white mb-4">AI Kariyer Koçun Seni Bekliyor</h2>
          <p className="text-[#a1a1aa] mb-8 text-base leading-relaxed max-w-xl mx-auto">
            Gemini AI destekli koçumuz, müzik kariyerini analiz ederek sana özel bir yol haritası hazırlıyor.
          </p>
          <button
            onClick={() => navigate(user ? '/coach' : '/auth?tab=register')}
            className="inline-flex items-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold px-8 py-3.5 rounded-md transition-all hover:shadow-glow"
            data-testid="cta-coach-btn">
            <Zap size={16} /> AI Koç ile Tanış
          </button>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-12 px-4 bg-[#0d0d0f]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <Logo size="sm" showText glow={false} className="mb-4" />
              <p className="text-xs text-[#a1a1aa] leading-relaxed">Türkiye'nin müzik kariyer ekosistemi. reversound.com</p>
            </div>
            {[
              { title: 'Platform', links: [['Beats', '/beats'], ['Servisler', '/gigs'], ['Playlists', '/playlists'], ['Studio Feed', '/feed']] },
              { title: 'Oluştur', links: [['Beat Yükle', '/beats/upload'], ['Gig Oluştur', '/gigs/create'], ['Blog Yaz', '/blog'], ['Canlı Oda', '/liveroom']] },
              { title: 'Şirket', links: [['Rever Studio', '/studio'], ['Fiyatlandırma', '/subscriptions'], ['Destek', '/support'], ['İş Panosu', '/jobs']] },
            ].map(col => (
              <div key={col.title}>
                <p className="text-xs font-mono uppercase tracking-wider text-[#a1a1aa] mb-3">{col.title}</p>
                <div className="space-y-2">
                  {col.links.map(([label, href]) => (
                    <button key={href} onClick={() => window.location.href = href} className="block text-xs text-[#a1a1aa] hover:text-white transition-colors">{label}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-[#a1a1aa]">© 2026 ReverSound. Tüm hakları saklıdır.</p>
            <p className="text-xs text-[#a1a1aa]">Türkiye'de geliştirildi</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
