import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Star, Clock, RefreshCw, Check, ShoppingCart, MessageSquare, Loader, ChevronLeft, Play, Image, Video } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const GigDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTier, setActiveTier] = useState('basic');
  const [requirements, setRequirements] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');

  useEffect(() => {
    axios.get(`${API}/gigs/${id}`)
      .then(res => { setGig(res.data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [id]);

  const handleOrder = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!requirements.trim()) { setOrderError('Lütfen proje gereksinimlerini açıkla'); return; }
    setOrdering(true);
    setOrderError('');
    try {
      const res = await axios.post(
        `${API}/orders`,
        { gig_id: id, tier: activeTier, requirements },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      setOrderSuccess('Sipariş verildi! Escrow güvencesiyle ödemen tutuldu.');
      setTimeout(() => navigate('/orders'), 2000);
    } catch (err) {
      setOrderError(err.response?.data?.detail || 'Sipariş verilemedi');
    } finally {
      setOrdering(false);
    }
  };

  const handleMessage = async () => {
    if (!user) { navigate('/auth'); return; }
    try {
      const res = await axios.post(
        `${API}/conversations`,
        { participant_id: gig.seller_id },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      navigate(`/messages/${res.data.id}`);
    } catch (err) {
      if (err.response?.data?.detail?.includes('yourself')) return;
    }
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center py-24">
        <Loader size={24} className="text-[#8b5cf6] animate-spin" />
      </div>
    </Layout>
  );

  if (!gig) return (
    <Layout>
      <div className="text-center py-24 text-[#a1a1aa]">Gig bulunamadı.</div>
    </Layout>
  );

  const tier = gig.tiers?.[activeTier];
  const TIER_COLORS = { basic: '#a1a1aa', standard: '#8b5cf6', premium: '#ec4899' };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <button onClick={() => navigate('/gigs')} className="flex items-center gap-2 text-[#a1a1aa] hover:text-white text-sm mb-6 transition-colors">
          <ChevronLeft size={16} /> Gig Listesine Dön
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Gig Info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Cover or Video Preview */}
            <div className="rounded-md overflow-hidden">
              {gig.preview_video_url ? (
                <div className="aspect-video bg-black rounded-md overflow-hidden">
                  {gig.preview_video_url.includes('youtube.com') || gig.preview_video_url.includes('youtu.be') ? (
                    <iframe
                      src={gig.preview_video_url.replace('watch?v=', 'embed/')}
                      className="w-full h-full"
                      allowFullScreen
                      title="Preview Video"
                    />
                  ) : (
                    <video src={gig.preview_video_url} controls className="w-full h-full object-cover" />
                  )}
                </div>
              ) : gig.cover_url ? (
                <div className="h-64">
                  <img src={gig.cover_url} alt={gig.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-64 bg-[#141416] flex items-center justify-center text-[#a1a1aa]">Görsel yok</div>
              )}
            </div>

            {/* Portfolio Gallery */}
            {gig.portfolio_images?.length > 0 && (
              <div className="rs-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Image size={14} className="text-[#8b5cf6]" />
                  <h3 className="text-sm font-semibold text-white">Portfolio</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {gig.portfolio_images.map((imgUrl, idx) => (
                    <a key={idx} href={imgUrl} target="_blank" rel="noreferrer"
                      className="aspect-video rounded-md overflow-hidden border border-white/10 hover:border-[#8b5cf6]/40 transition-colors">
                      <img src={imgUrl} alt={`Portfolio ${idx + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Category + Title */}
            <div>
              <p className="text-xs font-mono uppercase text-[#8b5cf6] mb-1">{gig.category}</p>
              <h1 className="font-heading font-bold text-xl sm:text-2xl text-white">{gig.title}</h1>
            </div>

            {/* Seller info */}
            <div className="flex items-center gap-3 p-4 bg-[#141416] rounded-md border border-white/5">
              <div className="w-10 h-10 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center text-sm font-bold text-[#8b5cf6]">
                {gig.seller_name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{gig.seller_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Star size={12} className="text-[#f59e0b] fill-[#f59e0b]" />
                  <span className="text-xs text-[#a1a1aa]">{gig.rating > 0 ? `${gig.rating} — ${gig.total_reviews} değerlendirme` : 'Henüz değerlendirme yok'}</span>
                </div>
              </div>
              {user && user.id !== gig.seller_id && (
                <button
                  onClick={handleMessage}
                  className="flex items-center gap-1.5 text-sm text-[#8b5cf6] border border-[#8b5cf6]/30 px-3 py-1.5 rounded-md hover:bg-[#8b5cf6]/10 transition-colors"
                  data-testid="message-seller-btn"
                >
                  <MessageSquare size={14} /> Mesaj Gönder
                </button>
              )}
            </div>

            {/* Description */}
            <div className="rs-card p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Açıklama</h3>
              <p className="text-sm text-[#a1a1aa] leading-relaxed whitespace-pre-wrap">{gig.description}</p>
              {gig.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {gig.tags.map(tag => (
                    <span key={tag} className="badge-genre">#{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Reviews */}
            {gig.reviews?.length > 0 && (
              <div className="rs-card p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Değerlendirmeler</h3>
                <div className="space-y-4">
                  {gig.reviews.map(r => (
                    <div key={r.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {r.reviewer_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-white">{r.reviewer_name}</p>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={10} className={i < r.rating ? 'text-[#f59e0b] fill-[#f59e0b]' : 'text-white/20'} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-[#a1a1aa]">{r.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Order Panel */}
          <div className="space-y-4">
            {/* Tier selector */}
            <div className="rs-card p-4">
              <div className="flex border border-white/10 rounded-md overflow-hidden mb-4">
                {Object.keys(gig.tiers || {}).map(t => (
                  <button
                    key={t}
                    onClick={() => setActiveTier(t)}
                    className={`flex-1 py-2 text-xs font-mono uppercase tracking-wider transition-all ${activeTier === t ? 'text-white' : 'text-[#a1a1aa] hover:text-white'}`}
                    style={{ background: activeTier === t ? TIER_COLORS[t] : 'transparent' }}
                    data-testid={`tier-${t}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {tier && (
                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <p className="text-2xl font-bold text-white">₺{tier.price}</p>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-[#a1a1aa]">
                        <Clock size={12} /> {tier.delivery_days} gün
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[#a1a1aa]">
                        <RefreshCw size={12} /> {tier.revisions} revizyon
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-[#a1a1aa]">{tier.description}</p>
                  {tier.features?.length > 0 && (
                    <ul className="space-y-1.5">
                      {tier.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-[#a1a1aa]">
                          <Check size={12} className="text-[#10b981]" /> {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Requirements */}
            <div className="rs-card p-4">
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-2">Proje Gereksinimleri</label>
              <textarea
                rows={4}
                value={requirements}
                onChange={e => setRequirements(e.target.value)}
                placeholder="Projenizi detaylıca açıklayın: tür, tempo, referans, beklentiler..."
                className="rs-input resize-none text-sm"
                data-testid="requirements-input"
              />
            </div>

            {orderError && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{orderError}</div>
            )}
            {orderSuccess && (
              <div className="p-3 rounded-md bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] text-sm">{orderSuccess}</div>
            )}

            <button
              onClick={handleOrder}
              disabled={ordering || !!orderSuccess || (user && user.id === gig.seller_id)}
              className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-semibold py-3 rounded-md transition-all hover:shadow-glow flex items-center justify-center gap-2"
              data-testid="order-btn"
            >
              {ordering ? <Loader size={16} className="animate-spin" /> : <><ShoppingCart size={16} /> Sipariş Ver — ₺{tier?.price}</>}
            </button>
            <p className="text-xs text-center text-[#a1a1aa]">Ödemen escrow ile güvende. Teslimata kadar hiçbir ücret kesilmez.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default GigDetail;
