import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Map, Star, CheckCircle, Target, Zap, Music2, Play, TrendingUp, Loader, Lock } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MILESTONES = [
  { id: 'first_upload', label: 'İlk Beat Yükle', desc: 'Kariyerinin ilk adımı', xp: 100, icon: Music2, color: '#8b5cf6' },
  { id: 'first_sale', label: 'İlk Satış', desc: 'İlk gelirini kazan', xp: 250, icon: Star, color: '#10b981' },
  { id: 'first_order', label: 'İlk Sipariş Al', desc: 'Freelance kariyerine başla', xp: 300, icon: Target, color: '#f59e0b' },
  { id: '100_plays', label: '100 Çalınma', desc: 'Beat\'lerin 100 kez dinlendi', xp: 200, icon: Play, color: '#06b6d4' },
  { id: '1000_plays', label: '1000 Çalınma', desc: 'Sesi duyulmaya başlıyor!', xp: 500, icon: TrendingUp, color: '#8b5cf6' },
  { id: 'verified', label: 'Hesap Doğrula', desc: 'Güvenilir üye ol', xp: 150, icon: CheckCircle, color: '#10b981' },
  { id: 'pro_plan', label: 'Pro\'ya Yükselt', desc: 'Sınırsız araçlara eriş', xp: 400, icon: Zap, color: '#ec4899' },
  { id: '10_sales', label: '10 Satış', desc: 'Düzenli gelir akışı', xp: 1000, icon: Star, color: '#f59e0b' },
];

const MilestoneCard = ({ milestone, completed, locked }) => {
  const Icon = milestone.icon;
  return (
    <div
      className={`rs-card p-4 flex items-center gap-4 transition-all ${completed ? 'border-[#10b981]/30' : locked ? 'opacity-50' : 'hover:border-white/15'}`}
      data-testid={`milestone-${milestone.id}`}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: completed ? `${milestone.color}25` : 'rgba(255,255,255,0.05)', border: `1px solid ${completed ? milestone.color : 'rgba(255,255,255,0.08)'}30` }}
      >
        {completed ? <CheckCircle size={18} className="text-[#10b981]" /> : locked ? <Lock size={16} className="text-[#a1a1aa]" /> : <Icon size={16} style={{ color: milestone.color }} />}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${completed ? 'text-[#10b981]' : 'text-white'}`}>{milestone.label}</p>
        <p className="text-xs text-[#a1a1aa]">{milestone.desc}</p>
      </div>
      <div className="text-right">
        <p className="text-xs font-mono font-bold" style={{ color: completed ? '#10b981' : milestone.color }}>+{milestone.xp} XP</p>
        {completed && <p className="text-[10px] text-[#10b981]">Tamamlandı</p>}
      </div>
    </div>
  );
};

const MyRoadmap = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [tierData, setTierData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get(`${API}/analytics/overview`, { headers, withCredentials: true }).catch(() => null),
      axios.get(`${API}/auth/commission-tier`, { headers, withCredentials: true }).catch(() => null),
    ]).then(([ovRes, tierRes]) => {
      if (ovRes) setOverview(ovRes.data);
      if (tierRes) setTierData(tierRes.data);
    }).finally(() => setLoading(false));
  }, [token]);

  // Compute completed milestones
  const completedMilestones = new Set();
  if (overview) {
    if (overview.total_beats > 0) completedMilestones.add('first_upload');
    if (overview.beat_purchases > 0) completedMilestones.add('first_sale');
    if (overview.total_orders > 0) completedMilestones.add('first_order');
    if (overview.total_plays >= 100) completedMilestones.add('100_plays');
    if (overview.total_plays >= 1000) completedMilestones.add('1000_plays');
    if (user?.is_verified) completedMilestones.add('verified');
    if (['pro', 'enterprise'].includes(user?.subscription_tier)) completedMilestones.add('pro_plan');
    if (tierData?.lifetime_gig_sales >= 10) completedMilestones.add('10_sales');
  }

  const totalXP = MILESTONES.filter(m => completedMilestones.has(m.id)).reduce((acc, m) => acc + m.xp, 0);
  const maxXP = MILESTONES.reduce((acc, m) => acc + m.xp, 0);
  const progress = Math.round((totalXP / maxXP) * 100);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-[#f59e0b]/20 border border-[#f59e0b]/30 flex items-center justify-center">
            <Map size={18} className="text-[#f59e0b]" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-white">Kariyer Yol Haritam</h1>
            <p className="text-xs text-[#a1a1aa]">Hedeflerini takip et, ödüller kazan</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader size={24} className="text-[#8b5cf6] animate-spin" /></div>
        ) : (
          <>
            {/* XP Overview */}
            <div className="rs-card p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-2xl font-bold text-[#f59e0b]">{totalXP.toLocaleString()} XP</p>
                  <p className="text-xs text-[#a1a1aa]">toplam kazanılan</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{completedMilestones.size} / {MILESTONES.length}</p>
                  <p className="text-xs text-[#a1a1aa]">hedef tamamlandı</p>
                </div>
              </div>
              <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #f59e0b, #ec4899)' }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-[#a1a1aa]">Yeni Başlayan</span>
                <span className="text-xs text-[#ec4899] font-bold">{progress}%</span>
                <span className="text-xs text-[#a1a1aa]">Efsane</span>
              </div>
            </div>

            {/* Stats */}
            {overview && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Toplam Çalınma', value: overview.total_plays?.toLocaleString() || 0, color: '#8b5cf6' },
                  { label: 'Beat Satışı', value: overview.beat_purchases || 0, color: '#10b981' },
                  { label: 'Tamamlanan Sipariş', value: overview.total_orders || 0, color: '#f59e0b' },
                  { label: 'Net Kazanç', value: `₺${overview.total_revenue?.toFixed(0) || 0}`, color: '#ec4899' },
                ].map(s => (
                  <div key={s.label} className="rs-card p-3 text-center">
                    <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[10px] text-[#a1a1aa] font-mono uppercase">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Milestones */}
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider mb-4">Hedefler</h2>
            <div className="space-y-2">
              {MILESTONES.map(milestone => (
                <MilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  completed={completedMilestones.has(milestone.id)}
                  locked={false}
                />
              ))}
            </div>

            {/* AI Coach CTA */}
            <div className="mt-8 rs-card p-6 text-center" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.05))' }}>
              <Zap size={28} className="text-[#8b5cf6] mx-auto mb-3" />
              <h3 className="font-heading font-bold text-white text-lg mb-2">AI Kariyer Koçun Seni Bekliyor</h3>
              <p className="text-[#a1a1aa] text-sm mb-4">Yol haritanı analiz etsin, sana özel stratejiler üretsin.</p>
              <button onClick={() => navigate('/coach')}
                className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold px-6 py-2.5 rounded-md transition-all hover:shadow-glow flex items-center gap-2 mx-auto"
                data-testid="roadmap-coach-btn">
                <Zap size={14} /> Koçla Konuş
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default MyRoadmap;
