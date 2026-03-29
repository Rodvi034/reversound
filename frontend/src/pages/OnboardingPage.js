import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Music2, Mic, Headphones, Palette, ShoppingBag, Check, Loader } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const GOALS = [
  { id: 'buy_beats', icon: ShoppingBag, label: 'Beat Satın Almak', desc: 'Projelerim için kaliteli beatler bulmak istiyorum.' },
  { id: 'sell_beats', icon: Music2, label: 'Beat Satmak', desc: 'Kendi beatlerimi platforma yükleyip gelir elde etmek istiyorum.' },
  { id: 'sell_services', icon: Headphones, label: 'Servis Satmak', desc: 'Mix, mastering veya tasarım hizmetleri sunmak istiyorum.' },
  { id: 'grow_career', icon: Mic, label: 'Kariyerimi Geliştirmek', desc: 'AI koç desteğiyle müzik kariyerimde ilerlemek istiyorum.' },
  { id: 'artwork', icon: Palette, label: 'Sanat Eseri Satmak', desc: 'Müzisyenler için kapak ve görseller tasarlıyorum.' },
];

const PLANS = [
  {
    id: 'free', name: 'Free', price: 0, currency: '₺',
    features: ['2 beat yükleme/ay', '1 gig', 'Temel mesajlaşma', 'Market erişimi'],
    color: '#a1a1aa', recommended: false
  },
  {
    id: 'starter', name: 'Starter', price: 99, currency: '₺',
    features: ['10 beat yükleme/ay', '3 gig', '200 aylık kredi', 'AI Koç (10 seans)', 'Öncelikli destek'],
    color: '#10b981', recommended: false
  },
  {
    id: 'pro', name: 'Pro', price: 249, currency: '₺',
    features: ['Sınırsız beat', 'Sınırsız gig', '600 aylık kredi', 'Sınırsız AI Koç', 'Öne çıkan listeler', 'İlk 5 siparişte %0 komisyon'],
    color: '#8b5cf6', recommended: true
  },
];

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user, token, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${API}/auth/onboarding`,
        { goal: selectedGoal, subscription_tier: selectedPlan },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      await refreshUser();
      navigate('/dashboard');
    } catch {
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl animate-fade-up">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {[1, 2].map(s => (
            <React.Fragment key={s}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? 'bg-[#8b5cf6] text-white' : 'bg-white/5 text-[#a1a1aa]'}`}>
                {step > s ? <Check size={12} /> : s}
              </div>
              {s < 2 && <div className={`h-px flex-1 max-w-[60px] transition-all ${step > s ? 'bg-[#8b5cf6]' : 'bg-white/10'}`} />}
            </React.Fragment>
          ))}
        </div>

        {step === 1 && (
          <div>
            <div className="text-center mb-8">
              <h1 className="font-heading font-bold text-2xl text-white mb-2">Hoş Geldin, {user?.name?.split(' ')[0]}!</h1>
              <p className="text-[#a1a1aa] text-sm">Sana en uygun deneyimi sunabilmemiz için hedefini seç.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GOALS.map(goal => {
                const Icon = goal.icon;
                return (
                  <button
                    key={goal.id}
                    onClick={() => setSelectedGoal(goal.id)}
                    className={`flex items-start gap-4 p-4 rounded-md border text-left transition-all ${
                      selectedGoal === goal.id
                        ? 'border-[#8b5cf6] bg-[#8b5cf6]/10'
                        : 'border-white/5 bg-[#141416] hover:border-white/10'
                    }`}
                    data-testid={`goal-${goal.id}`}
                  >
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${selectedGoal === goal.id ? 'bg-[#8b5cf6]' : 'bg-white/5'}`}>
                      <Icon size={16} className={selectedGoal === goal.id ? 'text-white' : 'text-[#a1a1aa]'} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{goal.label}</p>
                      <p className="text-xs text-[#a1a1aa] mt-0.5">{goal.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              disabled={!selectedGoal}
              onClick={() => setStep(2)}
              className="w-full mt-6 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-30 text-white font-semibold py-3 rounded-md transition-all hover:shadow-glow flex items-center justify-center gap-2"
              data-testid="onboarding-next-btn"
            >
              Devam Et <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="text-center mb-8">
              <h1 className="font-heading font-bold text-2xl text-white mb-2">Planını Seç</h1>
              <p className="text-[#a1a1aa] text-sm">İstediğin zaman yükseltebilirsin. Hemen ücretsiz başla.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PLANS.map(plan => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative rs-card p-5 cursor-pointer transition-all ${selectedPlan === plan.id ? 'border-[#8b5cf6] bg-[#8b5cf6]/5 shadow-glow-sm' : ''}`}
                  data-testid={`plan-${plan.id}`}
                >
                  {plan.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-[#8b5cf6] text-white text-[10px] font-mono uppercase px-3 py-0.5 rounded-full">Önerilen</span>
                    </div>
                  )}
                  <p className="font-heading font-bold text-lg text-white">{plan.name}</p>
                  <p className="text-2xl font-bold mt-2 mb-4" style={{ color: plan.color }}>
                    {plan.price === 0 ? 'Ücretsiz' : `${plan.currency}${plan.price}`}
                    {plan.price > 0 && <span className="text-xs text-[#a1a1aa] font-normal">/ay</span>}
                  </p>
                  <ul className="space-y-2">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[#a1a1aa]">
                        <Check size={12} className="text-[#10b981] mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="flex-1 border border-white/10 text-[#a1a1aa] hover:text-white py-3 rounded-md transition-all hover:bg-white/5">
                Geri
              </button>
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex-2 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-semibold py-3 px-8 rounded-md transition-all hover:shadow-glow flex items-center justify-center gap-2"
                data-testid="onboarding-complete-btn"
              >
                {loading ? <Loader size={16} className="animate-spin" /> : <><Check size={16} /> Başlayalım</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
