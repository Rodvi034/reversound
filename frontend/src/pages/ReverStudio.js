import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import Logo from '@/components/Logo';
import { Check, Zap, Play, Music2, Headphones, Globe, Layers, ArrowRight, Crown, Lock } from 'lucide-react';

const STUDIO_PLANS = [
  {
    id: 'studio_basic', name: 'Studio Basic', price: 149, color: '#a1a1aa',
    features: ['5 GB bulut depolama', 'Temel stem ayırma', 'AI mastering (5/ay)', 'Çevrimiçi mixing araçları'],
    cta: 'Basic ile Başla'
  },
  {
    id: 'studio_pro', name: 'Studio Pro', price: 399, color: '#8b5cf6', recommended: true,
    features: ['50 GB bulut depolama', 'Gelişmiş stem ayırma', 'AI mastering (sınırsız)', 'Gerçek zamanlı işbirliği', 'Sürüm geçmişi', 'DAW plugin entegrasyonu'],
    cta: 'Pro ile Yükselt'
  },
  {
    id: 'studio_elite', name: 'Studio Elite', price: 799, color: '#ec4899',
    features: ['Sınırsız depolama', 'Profesyonel stem ayırma', 'AI mastering (öncelikli)', 'Beyaz etiket stüdyo', 'API erişimi', 'Özel sunucu', 'Dedicated destek'],
    cta: 'Elite ile Zirveye Ulaş'
  },
];

const FeatureCard = ({ icon: Icon, title, desc, color, badge }) => (
  <div className="rs-card p-5 relative overflow-hidden group hover:border-white/15 transition-all">
    {badge && <span className="absolute top-3 right-3 text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30">Yakında</span>}
    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
      <Icon size={18} style={{ color }} />
    </div>
    <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
    <p className="text-xs text-[#a1a1aa] leading-relaxed">{desc}</p>
  </div>
);

const ReverStudio = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('studio_pro');

  return (
    <Layout>
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.15) 0%, transparent 70%)' }} />
        <div className="max-w-5xl mx-auto px-4 py-16 text-center relative z-10">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Logo size="md" showText={false} glow />
            <span className="font-heading font-bold text-3xl text-white tracking-tight">Rever Studio</span>
          </div>
          <p className="text-lg text-[#a1a1aa] max-w-2xl mx-auto mb-8 leading-relaxed">
            Profesyonel ses üretimi için tasarlanmış <strong className="text-white">premium stüdyo ortamı</strong>. Stem ayırma, AI mastering, bulut işbirliği — hepsi tek platformda.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => document.getElementById('studio-pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold px-8 py-3.5 rounded-md transition-all hover:shadow-glow flex items-center gap-2"
              data-testid="studio-cta-btn"
            >
              <Zap size={16} /> Planları Görüntüle
            </button>
            <button className="border border-white/10 hover:border-white/20 text-white px-8 py-3.5 rounded-md transition-all hover:bg-white/5 flex items-center gap-2">
              <Play size={16} /> Demo İzle
            </button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="font-heading font-bold text-2xl text-white text-center mb-10">Stüdyo Araçları</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          <FeatureCard icon={Layers} title="Stem Ayırma" desc="AI ile ses, davul, bas ve enstrüman kanallarını profesyonel kalitede ayır." color="#8b5cf6" />
          <FeatureCard icon={Headphones} title="AI Mastering" desc="Otomatik mastering algoritması ile yayın kalitesine ulaş. Spotify ve Apple Music standartları." color="#10b981" />
          <FeatureCard icon={Globe} title="Bulut İşbirliği" desc="Prodüktörler ve sanatçılar gerçek zamanlı online stüdyo oturumlarına bağlanabilir." color="#f59e0b" badge />
          <FeatureCard icon={Music2} title="DAW Entegrasyonu" desc="Ableton, FL Studio ve Logic Pro ile sorunsuz plugin senkronizasyonu." color="#ec4899" badge />
          <FeatureCard icon={Zap} title="Akıllı BPM & Key" desc="Ses dosyasından otomatik tempo ve ton analizi. Beat eşleştirme için ideal." color="#06b6d4" />
          <FeatureCard icon={Crown} title="Sürüm Kontrolü" desc="Proje sürümlerini kaydet, geri al, karşılaştır. Üretim sürecini takip et." color="#6366f1" badge />
        </div>

        {/* Pricing */}
        <div id="studio-pricing">
          <h2 className="font-heading font-bold text-2xl text-white text-center mb-3">Rever Studio Planları</h2>
          <p className="text-[#a1a1aa] text-center text-sm mb-10">Platform abonelikleriyle bağımsız. Sadece stüdyo araçları için ayrı fatura.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STUDIO_PLANS.map(plan => (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`rs-card p-6 cursor-pointer transition-all relative ${selectedPlan === plan.id ? 'border-[#8b5cf6] shadow-glow-sm' : ''}`}
                data-testid={`studio-plan-${plan.id}`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#8b5cf6] text-white text-[10px] font-mono uppercase px-3 py-0.5 rounded-full">En Popüler</span>
                  </div>
                )}
                <h3 className="font-heading font-bold text-lg text-white">{plan.name}</h3>
                <div className="my-3">
                  <span className="text-3xl font-bold" style={{ color: plan.color }}>₺{plan.price}</span>
                  <span className="text-xs text-[#a1a1aa]">/ay</span>
                </div>
                <ul className="space-y-2 mb-5">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#a1a1aa]">
                      <Check size={11} className="mt-0.5 flex-shrink-0" style={{ color: plan.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className="w-full py-2.5 rounded-md text-sm font-semibold transition-all text-white"
                  style={{ background: selectedPlan === plan.id ? plan.color : 'rgba(255,255,255,0.05)' }}
                  data-testid={`studio-subscribe-${plan.id}`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <p className="text-xs text-[#a1a1aa]">
              Rever Studio tamamen ayrı bir modüldür ve yakında kullanıma açılacaktır.
              <button className="text-[#8b5cf6] hover:text-[#7c3aed] ml-1 transition-colors">Bekleme listesine kaydol →</button>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ReverStudio;
