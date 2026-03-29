import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Zap } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';

const PLANS = [
  {
    id: 'free', name: 'Free', price: 0,
    features: ['2 beat yükleme/ay', '1 gig', 'Temel mesajlaşma', 'Market erişimi'],
    color: '#a1a1aa', cta: 'Ücretsiz Başla'
  },
  {
    id: 'starter', name: 'Starter', price: 99,
    features: ['10 beat yükleme/ay', '3 gig', '200 aylık kredi', 'AI Koç (10 seans)', 'Öncelikli destek', 'Temel analitik'],
    color: '#10b981', cta: 'Starter\'a Geç'
  },
  {
    id: 'pro', name: 'Pro', price: 249, recommended: true,
    features: ['Sınırsız beat yükleme', 'Sınırsız gig', '600 aylık kredi', 'Sınırsız AI Koç', 'Gelişmiş analitik', 'Öne çıkan listeler', 'İlk 5 siparişte %0 komisyon', 'Playlist başvuru önceliği'],
    color: '#8b5cf6', cta: 'Pro\'ya Yükselt'
  },
  {
    id: 'enterprise', name: 'Enterprise', price: 599,
    features: ['Pro\'daki her şey', '2000 aylık kredi', 'White-label dağıtım', 'Dedicated hesap yöneticisi', 'Özel analitik paneli', 'API erişimi', '%0 platform komisyonu'],
    color: '#ec4899', cta: 'İletişime Geç'
  },
];

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const handleSubscribe = async (planId) => {
    if (!user) { navigate('/auth?tab=register'); return; }
    if (planId === 'free') { navigate('/onboarding'); return; }
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/subscriptions/subscribe?tier=${planId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      alert(res.data.message);
      navigate('/dashboard');
    } catch (err) {
      alert(err.response?.data?.detail || 'İşlem başarısız. Cüzdan bakiyenizi kontrol edin.');
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-white mb-4">Planını Seç</h1>
          <p className="text-[#a1a1aa] text-sm sm:text-base max-w-xl mx-auto">
            İhtiyacına göre plan seç, istediğin zaman değiştir. Tüm planlar aylık faturalandırılır.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`relative rs-card p-6 flex flex-col transition-all ${plan.recommended ? 'border-[#8b5cf6] shadow-glow-sm' : ''}`}
              data-testid={`plan-card-${plan.id}`}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#8b5cf6] text-white text-[10px] font-mono uppercase px-3 py-1 rounded-full flex items-center gap-1">
                    <Zap size={10} /> En Popüler
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="font-heading font-bold text-lg text-white">{plan.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold" style={{ color: plan.color }}>
                    {plan.price === 0 ? 'Ücretsiz' : `₺${plan.price}`}
                  </span>
                  {plan.price > 0 && <span className="text-xs text-[#a1a1aa] ml-1">/ay</span>}
                </div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#a1a1aa]">
                    <Check size={13} className="mt-0.5 flex-shrink-0" style={{ color: plan.color }} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                className={`w-full py-2.5 rounded-md text-sm font-semibold transition-all ${
                  plan.recommended
                    ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white hover:shadow-glow'
                    : 'border text-white hover:bg-white/5'
                }`}
                style={!plan.recommended ? { borderColor: `${plan.color}30`, color: plan.color } : {}}
                data-testid={`subscribe-${plan.id}`}
              >
                {user?.subscription_tier === plan.id ? 'Mevcut Plan' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-xs text-[#a1a1aa]">
            Tüm planlar escrow koruması, mesaj moderasyonu ve temel platform özelliklerini içerir.
            Sorularınız için <span className="text-[#8b5cf6]">destek@reversound.com</span> adresine yazın.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default SubscriptionPage;
