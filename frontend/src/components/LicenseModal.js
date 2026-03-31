import React, { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingBag, Heart, Check, Info, Music2, Package } from 'lucide-react';

const LICENSE_DESCRIPTIONS = {
  basic: {
    label: 'Basic Lease',
    streams: '2,500',
    sales: '2,500',
    formats: 'MP3',
    distribution: 'Dijital dağıtım',
    exclusive: false,
    color: '#a1a1aa',
    badge: 'EN POPÜLER'
  },
  premium: {
    label: 'Premium Lease',
    streams: '10,000',
    sales: '25,000',
    formats: 'WAV + Stems',
    distribution: 'Dijital + Radyo',
    exclusive: false,
    color: '#8b5cf6',
    badge: 'TAVSİYE EDİLEN'
  },
  exclusive: {
    label: 'Exclusive Hak',
    streams: 'Sınırsız',
    sales: 'Sınırsız',
    formats: 'WAV + Stems + Tracked',
    distribution: 'Tam haklar',
    exclusive: true,
    color: '#ec4899',
    badge: 'TAM KONTROL'
  }
};

const LicenseModal = ({ beat, onClose }) => {
  const { addItem, isInCart } = useCart();
  const { isFavorited, toggleFavorite } = useFavorites();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedLicense, setSelectedLicense] = useState(beat.licenses?.[0]?.type || 'basic');

  const handleAddToCart = () => {
    if (!user) { navigate('/auth'); return; }
    const lic = beat.licenses?.find(l => l.type === selectedLicense);
    if (!lic) return;
    addItem({
      id: beat.id,
      type: 'beat',
      license_type: selectedLicense,
      price: lic.price,
      title: beat.title,
      cover_url: beat.cover_url,
      producer_name: beat.producer_name,
      rights: lic.rights,
    });
    onClose();
  };

  const alreadyInCart = isInCart(beat.id, selectedLicense);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
      data-testid="license-modal"
    >
      <div
        className="bg-[#141416] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Beat header */}
        <div className="flex items-center gap-4 p-6 border-b border-white/5" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), transparent)' }}>
          {beat.cover_url ? (
            <img src={beat.cover_url} alt="" className="w-16 h-16 rounded-xl object-cover border border-white/10" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center">
              {beat.item_type === 'pack' ? <Package size={24} className="text-[#8b5cf6]" /> : <Music2 size={24} className="text-[#8b5cf6]" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-bold text-xl text-white truncate">{beat.title}</h3>
            <p className="text-[#a1a1aa] text-sm">{beat.producer_name}</p>
            <div className="flex items-center gap-2 mt-1">
              {beat.genre && <span className="badge-genre">{beat.genre}</span>}
              {beat.bpm && <span className="text-xs text-[#a1a1aa] font-mono">{beat.bpm} BPM · {beat.key}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => toggleFavorite(beat.id, 'beat')}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-[#ec4899]/10 border border-white/10 hover:border-[#ec4899]/30 flex items-center justify-center transition-all"
              data-testid="license-modal-heart"
            >
              <Heart size={15} fill={isFavorited(beat.id, 'beat') ? '#ec4899' : 'none'} className={isFavorited(beat.id, 'beat') ? 'text-[#ec4899]' : 'text-[#a1a1aa]'} />
            </button>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all">
              <X size={15} className="text-[#a1a1aa]" />
            </button>
          </div>
        </div>

        {/* License tiers */}
        <div className="p-6">
          <p className="text-xs font-mono uppercase text-[#a1a1aa] tracking-wider mb-4">Lisans Seç</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {beat.licenses?.map(lic => {
              const info = LICENSE_DESCRIPTIONS[lic.type] || {};
              const isSelected = selectedLicense === lic.type;
              return (
                <button
                  key={lic.type}
                  onClick={() => setSelectedLicense(lic.type)}
                  className={`relative flex flex-col p-4 rounded-xl border text-left transition-all ${isSelected ? 'border-current shadow-lg' : 'border-white/10 hover:border-white/20 bg-[#0d0d0f]'}`}
                  style={{ borderColor: isSelected ? info.color : undefined, background: isSelected ? `${info.color}10` : undefined }}
                  data-testid={`license-${lic.type}`}
                >
                  {info.badge && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-mono uppercase px-2 py-0.5 rounded-full" style={{ background: info.color, color: 'white' }}>
                      {info.badge}
                    </span>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-mono uppercase font-bold" style={{ color: info.color }}>{info.label || lic.type}</p>
                    {isSelected && <Check size={14} style={{ color: info.color }} />}
                  </div>
                  <p className="text-xl font-bold text-white mb-3">₺{lic.price}</p>
                  <ul className="space-y-1.5 text-left">
                    {info.formats && <li className="flex items-center gap-1.5 text-xs text-[#a1a1aa]"><Check size={9} style={{ color: info.color }} />{info.formats}</li>}
                    {info.streams && <li className="flex items-center gap-1.5 text-xs text-[#a1a1aa]"><Check size={9} style={{ color: info.color }} />{info.streams} stream hakkı</li>}
                    {info.distribution && <li className="flex items-center gap-1.5 text-xs text-[#a1a1aa]"><Check size={9} style={{ color: info.color }} />{info.distribution}</li>}
                    <li className="flex items-center gap-1.5 text-xs text-[#a1a1aa]"><Check size={9} style={{ color: info.color }} />{lic.rights}</li>
                  </ul>
                  {info.exclusive && <div className="mt-2 text-[10px] text-[#ec4899] font-mono">Beat marketten kaldırılır</div>}
                </button>
              );
            })}
          </div>

          {/* Legal note */}
          <div className="flex gap-2 p-3 bg-white/3 rounded-lg border border-white/5 mb-5">
            <Info size={14} className="text-[#a1a1aa] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#a1a1aa] leading-relaxed">
              Satın alma ile seçili lisans hakları sana devredilir. Lisans belgesi email ile gönderilir.
              Tüm satışlar escrow ile güvence altındadır.
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={handleAddToCart}
            disabled={alreadyInCart}
            className="w-full font-semibold py-4 rounded-xl text-white transition-all flex items-center justify-center gap-3 text-base disabled:opacity-60"
            style={{ background: alreadyInCart ? '#10b981' : '#8b5cf6' }}
            data-testid="add-to-cart-btn"
          >
            {alreadyInCart ? (
              <><Check size={18} /> Sepette</>
            ) : (
              <><ShoppingBag size={18} /> Sepete Ekle — ₺{beat.licenses?.find(l => l.type === selectedLicense)?.price}</>
            )}
          </button>
          <p className="text-center text-xs text-[#a1a1aa] mt-2">
            Sepetten çıkıp <button onClick={() => { onClose(); navigate('/checkout'); }} className="text-[#8b5cf6] hover:text-[#7c3aed] underline">ödeme sayfasında</button> toplu satın alabilirsin.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LicenseModal;
