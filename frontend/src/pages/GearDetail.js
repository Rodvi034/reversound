import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { MapPin, Tag, Heart, MessageSquare, Share2, Check, ChevronLeft, ChevronRight, Loader, Eye } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COND_COLORS = { 'Sıfır': '#10b981', 'Sıfır Gibi': '#8b5cf6', 'İyi': '#f59e0b', 'Orta': '#f97316', 'Parça İçin': '#ec4899' };

const GearDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    axios.get(`${API}/gear/${id}`)
      .then(res => {
        setItem(res.data);
        // Fetch related listings in same category
        return axios.get(`${API}/gear?category=${res.data.category}&limit=4`);
      })
      .then(res => setRelated((res.data.listings || []).filter(g => g.id !== id).slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleMessage = async () => {
    if (!user) { navigate('/auth'); return; }
    if (item.seller_id === 'demo') {
      alert('Bu demo bir ilandır. Gerçek satıcıyla iletişim kurmak için platform üzerinden ilan oluşturulmuş bir ürün seçin.');
      return;
    }
    if (item.seller_id === user.id) return;
    setMessaging(true);
    try {
      const res = await axios.post(
        `${API}/conversations`,
        { participant_id: item.seller_id },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      navigate(`/messages/${res.data.id}`);
    } catch (err) {
      console.error('Message error:', err);
    } finally { setMessaging(false); }
  };

  const share = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center py-24"><Loader size={24} className="text-[#8b5cf6] animate-spin" /></div>
    </Layout>
  );

  if (!item) return (
    <Layout>
      <div className="text-center py-24">
        <p className="text-[#a1a1aa]">İlan bulunamadı.</p>
        <button onClick={() => navigate('/gear')} className="mt-3 text-[#8b5cf6] hover:text-[#7c3aed] text-sm transition-colors">← Gear Market</button>
      </div>
    </Layout>
  );

  const photos = item.images || [];
  const condColor = COND_COLORS[item.condition] || '#a1a1aa';
  const favorited = isFavorited(item.id, 'gear');

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <button onClick={() => navigate('/gear')} className="flex items-center gap-2 text-[#a1a1aa] hover:text-white text-sm mb-6 transition-colors">
          <ChevronLeft size={16} /> Gear Market
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Photo Gallery */}
          <div className="lg:col-span-3 space-y-4">
            {/* Main photo */}
            <div className="relative rounded-2xl overflow-hidden h-72 sm:h-96 bg-[#141416]">
              {photos.length > 0 ? (
                <img src={photos[photoIdx]} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Tag size={48} className="text-[#a1a1aa] opacity-20" />
                </div>
              )}
              {photos.length > 1 && (
                <>
                  <button onClick={() => setPhotoIdx(i => Math.max(0, i - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={() => setPhotoIdx(i => Math.min(photos.length - 1, i + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors">
                    <ChevronRight size={18} />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {photos.map((_, i) => (
                      <button key={i} onClick={() => setPhotoIdx(i)}
                        className={`w-2 h-2 rounded-full transition-all ${i === photoIdx ? 'bg-white w-4' : 'bg-white/50'}`} />
                    ))}
                  </div>
                </>
              )}
              {/* Top actions */}
              <div className="absolute top-3 right-3 flex gap-2">
                <button onClick={() => user ? toggleFavorite(item.id, 'gear') : navigate('/auth')}
                  className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-black/80"
                  data-testid="gear-heart-btn">
                  <Heart size={16} fill={favorited ? '#ec4899' : 'none'} className={favorited ? 'text-[#ec4899]' : 'text-white'} />
                </button>
                <button onClick={share} className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-all">
                  {copied ? <Check size={15} className="text-[#10b981]" /> : <Share2 size={15} />}
                </button>
              </div>
              <div className="absolute top-3 left-3">
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: `${condColor}20`, color: condColor, border: `1px solid ${condColor}40` }}>
                  {item.condition}
                </span>
              </div>
            </div>

            {/* Thumbnail strip */}
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {photos.map((src, i) => (
                  <button key={i} onClick={() => setPhotoIdx(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${i === photoIdx ? 'border-[#8b5cf6]' : 'border-white/10'}`}>
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Description */}
            <div className="rs-card p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Açıklama</h3>
              <p className="text-sm text-[#a1a1aa] leading-relaxed whitespace-pre-wrap">{item.description}</p>
            </div>

            {/* Related listings */}
            {related.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Benzer İlanlar</h3>
                <div className="grid grid-cols-3 gap-3">
                  {related.map(rel => (
                    <div key={rel.id} className="rs-card overflow-hidden cursor-pointer group hover:border-[#8b5cf6]/20 transition-all"
                      onClick={() => navigate(`/gear/${rel.id}`)}>
                      <div className="h-24 bg-[#0d0d0f] overflow-hidden">
                        {rel.images?.[0] && <img src={rel.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-semibold text-white truncate">{rel.title}</p>
                        <p className="text-xs text-[#10b981] font-bold">₺{rel.price?.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Details & Actions */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <p className="text-xs font-mono uppercase text-[#8b5cf6] mb-1">{item.brand}</p>
              <h1 className="font-heading font-bold text-xl sm:text-2xl text-white mb-2 leading-tight">{item.title}</h1>
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={13} className="text-[#a1a1aa]" />
                <span className="text-sm text-[#a1a1aa]">{item.city}</span>
                <div className="flex items-center gap-1 text-xs text-[#a1a1aa] ml-auto">
                  <Eye size={11} /> {item.views || 0} görüntüleme
                </div>
              </div>

              {/* Price */}
              <div className="rs-card p-5 mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">₺{item.price?.toLocaleString()}</span>
                  {item.is_negotiable && (
                    <span className="text-xs text-[#10b981] font-mono uppercase px-2 py-0.5 rounded-full border border-[#10b981]/20 bg-[#10b981]/5">
                      Pazarlık Yapılır
                    </span>
                  )}
                </div>
              </div>

              {/* Item specs */}
              <div className="rs-card p-5 mb-4 space-y-3">
                <p className="text-xs font-mono uppercase text-[#a1a1aa] mb-2">Ürün Bilgileri</p>
                {[
                  { label: 'Marka', value: item.brand },
                  { label: 'Kategori', value: item.category },
                  { label: 'Durum', value: item.condition, color: condColor },
                  { label: 'Konum', value: item.city },
                ].map(s => (
                  <div key={s.label} className="flex justify-between text-sm">
                    <span className="text-[#a1a1aa]">{s.label}</span>
                    <span className="font-medium" style={{ color: s.color || 'white' }}>{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Seller info */}
              <div className="rs-card p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center text-sm font-bold text-[#8b5cf6]">
                    {item.seller_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.seller_name}</p>
                    <button onClick={() => navigate(`/u/${item.seller_username}`)} className="text-xs text-[#8b5cf6] hover:text-[#7c3aed] transition-colors">
                      @{item.seller_username} →
                    </button>
                  </div>
                </div>
              </div>

              {/* CTA buttons */}
              {user && item.seller_id !== user.id && (
                <button
                  onClick={handleMessage}
                  disabled={messaging}
                  className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all hover:shadow-glow flex items-center justify-center gap-2 text-base"
                  data-testid="message-seller-btn"
                >
                  {messaging ? <Loader size={16} className="animate-spin" /> : <><MessageSquare size={16} /> Satıcıya Mesaj At</>}
                </button>
              )}
              {!user && (
                <button onClick={() => navigate('/auth')}
                  className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold py-3.5 rounded-xl transition-all hover:shadow-glow flex items-center justify-center gap-2">
                  <MessageSquare size={16} /> Mesaj Göndermek için Giriş Yap
                </button>
              )}
              <p className="text-center text-xs text-[#a1a1aa] mt-2">
                Güvenliğiniz için görüşmeleri platform üzerinde tutun.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default GearDetail;
