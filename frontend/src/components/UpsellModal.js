import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Crown, X, ArrowRight } from 'lucide-react';

const TIER_INFO = {
  starter: { name: 'Starter', color: '#10b981', price: '₺99/ay', emoji: '🟢' },
  pro: { name: 'Pro', color: '#8b5cf6', price: '₺249/ay', emoji: '⚡' },
  enterprise: { name: 'Enterprise', color: '#ec4899', price: '₺599/ay', emoji: '👑' },
};

const UpsellModal = ({ featureName, requiredTier = 'pro', description, onClose }) => {
  const navigate = useNavigate();
  const tier = TIER_INFO[requiredTier] || TIER_INFO.pro;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      data-testid="upsell-modal"
    >
      <div
        className="bg-[#141416] border rounded-2xl p-7 w-full max-w-sm mx-4 text-center animate-fade-up"
        style={{ borderColor: `${tier.color}40` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Lock Icon */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: `${tier.color}15`, border: `1px solid ${tier.color}30` }}
        >
          <Lock size={28} style={{ color: tier.color }} />
        </div>

        <h3 className="font-heading font-bold text-xl text-white mb-2">{featureName}</h3>
        <p className="text-[#a1a1aa] text-sm leading-relaxed mb-1">
          {description || `Bu özellik ${tier.name} planı gerektiriyor.`}
        </p>
        <p className="text-xs text-[#a1a1aa] mb-6">
          <span style={{ color: tier.color }} className="font-semibold">{tier.name}</span> plandan başla — sadece {tier.price}
        </p>

        {/* Benefits */}
        <div className="text-left mb-6 p-3 rounded-lg bg-[#0d0d0f] space-y-2">
          {requiredTier === 'pro' ? [
            'Sınırsız beat yükleme',
            '600 aylık kredi',
            'Sınırsız AI Kariyer Koçu',
            'Öne çıkan listeler',
            'Pro Analitik Paneli',
          ] : requiredTier === 'starter' ? [
            '10 beat yükleme/ay',
            '200 aylık kredi',
            'AI Koç (10 seans)',
            'Öncelikli destek',
          ] : [
            'Tüm Pro özellikleri',
            '2000 aylık kredi',
            'API erişimi',
            '%0 platform komisyonu',
          ]}.map((benefit, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-[#a1a1aa]">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tier.color }} />
              {benefit}
            </div>
          ))}
        </div>

        <button
          onClick={() => { navigate('/subscriptions'); onClose?.(); }}
          className="w-full font-semibold py-3 rounded-md text-white transition-all flex items-center justify-center gap-2 mb-2 hover:shadow-glow"
          style={{ background: tier.color }}
          data-testid="upsell-upgrade-btn"
        >
          <Crown size={16} /> {tier.name}'a Yükselt <ArrowRight size={14} />
        </button>
        <button
          onClick={onClose}
          className="w-full text-xs text-[#a1a1aa] hover:text-white transition-colors py-2"
          data-testid="upsell-close-btn"
        >
          Daha sonra
        </button>
      </div>
    </div>
  );
};

export default UpsellModal;
