import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, TrendingUp, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TIER_CONFIG = {
  Elite:   { color: '#ec4899', bg: 'rgba(236,72,153,0.1)',  border: 'rgba(236,72,153,0.2)',  icon: '⭐' },
  Pro:     { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', icon: '⚡' },
  Starter: { color: '#a1a1aa', bg: 'rgba(161,161,170,0.1)',border: 'rgba(161,161,170,0.2)',icon: '🎵' },
};

const CommissionTier = ({ compact = false }) => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [tierData, setTierData] = useState(null);

  const SELLER_ROLES = ['producer', 'engineer', 'designer', 'artist', 'admin'];

  useEffect(() => {
    if (!user || !SELLER_ROLES.includes(user.role)) return;
    axios.get(`${API}/auth/commission-tier`, {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true
    }).then(res => setTierData(res.data)).catch(() => {});
  }, [user, token]);

  if (!tierData || !SELLER_ROLES.includes(user?.role)) return null;

  const { current_tier, next_tier, sales_to_next, progress_pct, lifetime_gig_sales } = tierData;
  const cfg = TIER_CONFIG[current_tier?.name] || TIER_CONFIG.Starter;

  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-mono"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
        data-testid="commission-tier-badge"
      >
        <Crown size={10} />
        {current_tier?.name} — %{(current_tier?.fee * 100).toFixed(1)} Komisyon
      </div>
    );
  }

  return (
    <div
      className="rs-card p-4 animate-fade-up"
      style={{ borderColor: cfg.border }}
      data-testid="commission-tier-card"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Crown size={16} style={{ color: cfg.color }} />
          <p className="text-sm font-semibold text-white">Revenue Share Programı</p>
        </div>
        <div
          className="px-2 py-0.5 rounded-full text-xs font-mono font-bold"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
        >
          {current_tier?.name?.toUpperCase()} — %{(current_tier?.fee * 100).toFixed(1)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4 text-center">
        <div className="p-2 bg-[#0d0d0f] rounded-md">
          <p className="text-lg font-bold" style={{ color: cfg.color }}>{lifetime_gig_sales}</p>
          <p className="text-[10px] text-[#a1a1aa] font-mono uppercase">Toplam Satış</p>
        </div>
        <div className="p-2 bg-[#0d0d0f] rounded-md">
          <p className="text-lg font-bold text-white">%{(current_tier?.fee * 100).toFixed(1)}</p>
          <p className="text-[10px] text-[#a1a1aa] font-mono uppercase">Komisyon</p>
        </div>
        <div className="p-2 bg-[#0d0d0f] rounded-md">
          <p className="text-lg font-bold text-[#10b981]">%{(100 - current_tier?.fee * 100).toFixed(1)}</p>
          <p className="text-[10px] text-[#a1a1aa] font-mono uppercase">Senin Payın</p>
        </div>
      </div>

      {next_tier ? (
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[#a1a1aa]">Sonraki seviye: <strong style={{ color: TIER_CONFIG[next_tier.name]?.color }}>{next_tier.name}</strong></span>
            <span className="text-[#a1a1aa] font-mono">{sales_to_next} satış kaldı</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress_pct}%`, background: `linear-gradient(90deg, ${cfg.color}, ${TIER_CONFIG[next_tier.name]?.color})` }}
            />
          </div>
          <p className="text-[10px] text-[#a1a1aa] mt-1.5 text-center">
            {next_tier.name}'e ulaşınca komisyon %{(next_tier.fee * 100).toFixed(1)}'e düşecek — ayda ekstra gelir!
          </p>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-xs text-[#ec4899] font-semibold">En yüksek komisyon seviyesindesin!</p>
          <p className="text-[10px] text-[#a1a1aa] mt-1">Sadece %5 komisyon — ReverSound'un Elite Satıcısısın.</p>
        </div>
      )}

      <button
        onClick={() => navigate('/analytics')}
        className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-[#a1a1aa] hover:text-white border border-white/10 hover:border-white/20 py-2 rounded-md transition-all"
        data-testid="view-analytics-btn"
      >
        <TrendingUp size={12} /> Analitiği Görüntüle <ArrowRight size={10} />
      </button>
    </div>
  );
};

export default CommissionTier;
