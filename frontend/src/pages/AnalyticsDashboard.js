import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Legend, Scatter, ScatterChart
} from 'recharts';
import { TrendingUp, Music2, Briefcase, Users, DollarSign, Play, Loader, Lock, ArrowUp, Crown } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';
import { SkeletonStat } from '@/components/SkeletonLoader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const ACCENT = '#8b5cf6';
const SUCCESS = '#10b981';
const PINK = '#ec4899';
const YELLOW = '#f59e0b';
const BLUE = '#06b6d4';

const TIER_COLORS = { premium: ACCENT, free: '#6b7280', starter: SUCCESS, pro: ACCENT, enterprise: PINK };

const StatCard = ({ icon: Icon, label, value, sub, color, trend }) => (
  <div className="rs-card p-5 flex items-start gap-4">
    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
      <Icon size={18} style={{ color }} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-[#a1a1aa]">{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color }}>{sub}</p>}
    </div>
    {trend !== undefined && (
      <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? 'text-[#10b981]' : 'text-[#ec4899]'}`}>
        <ArrowUp size={12} style={{ transform: trend < 0 ? 'rotate(180deg)' : 'none' }} />
        {Math.abs(trend)}%
      </div>
    )}
  </div>
);

const CUSTOM_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#141416] border border-white/10 rounded-lg p-3 text-xs shadow-lg">
      <p className="text-[#a1a1aa] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const Heatmap = ({ data }) => {
  if (!data?.length) return null;
  const maxPlays = Math.max(...data.map(d => d.plays), 1);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Hour labels */}
        <div className="flex gap-0.5 mb-1 ml-10">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="w-5 text-[9px] text-[#a1a1aa] font-mono text-center flex-shrink-0">
              {h % 3 === 0 ? `${h}` : ''}
            </div>
          ))}
        </div>
        {/* Grid */}
        {DAY_NAMES.map((day, di) => (
          <div key={di} className="flex items-center gap-0.5 mb-0.5">
            <span className="w-9 text-[9px] text-[#a1a1aa] font-mono">{day}</span>
            {Array.from({ length: 24 }, (_, h) => {
              const entry = data.find(d => d.day === di && d.hour === h);
              const plays = entry?.plays || 0;
              const intensity = plays / maxPlays;
              return (
                <div
                  key={h}
                  className="w-5 h-5 rounded-sm flex-shrink-0 cursor-default"
                  style={{ background: plays > 0 ? `rgba(139,92,246,${0.1 + intensity * 0.9})` : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                  title={`${day} ${h}:00 — ${plays} çalınma`}
                />
              );
            })}
          </div>
        ))}
        <div className="flex items-center gap-2 mt-2 ml-10">
          <span className="text-[9px] text-[#a1a1aa]">Az</span>
          {[0.1, 0.3, 0.5, 0.7, 1.0].map((v, i) => (
            <div key={i} className="w-4 h-4 rounded-sm" style={{ background: `rgba(139,92,246,${v})` }} />
          ))}
          <span className="text-[9px] text-[#a1a1aa]">Çok</span>
        </div>
      </div>
    </div>
  );
};

const ROLE_COLORS_PIE = { 'Alıcı': ACCENT, 'Prodüktör': PINK, 'Sanatçı': SUCCESS, 'Mühendis': YELLOW, 'Tasarımcı': BLUE, 'unknown': '#6b7280' };
const GENRE_COLORS = ['#8b5cf6', '#10b981', '#ec4899', '#f59e0b', '#06b6d4', '#6366f1', '#f97316', '#84cc16'];

const AnalyticsDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [conversion, setConversion] = useState([]);
  const [audience, setAudience] = useState(null);
  const [beats, setBeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${token}` };
  const tier = user?.subscription_tier || 'free';
  const hasAccess = ['pro', 'enterprise'].includes(tier) || user?.role === 'admin';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, revRes, heatRes, convRes, audRes, beatRes] = await Promise.all([
        axios.get(`${API}/analytics/overview`, { headers, withCredentials: true }),
        axios.get(`${API}/analytics/revenue`, { headers, withCredentials: true }),
        axios.get(`${API}/analytics/beats/heatmap`, { headers, withCredentials: true }),
        axios.get(`${API}/analytics/gigs/conversion`, { headers, withCredentials: true }),
        axios.get(`${API}/analytics/audience`, { headers, withCredentials: true }),
        axios.get(`${API}/analytics/beats/performance`, { headers, withCredentials: true }),
      ]);
      setOverview(ovRes.data);
      setRevenue(revRes.data);
      setHeatmap(heatRes.data);
      setConversion(convRes.data);
      setAudience(audRes.data);
      setBeats(beatRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analitik yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (hasAccess) fetchAll(); else setLoading(false); }, [hasAccess, fetchAll]);

  // Paywall
  if (!hasAccess) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center mx-auto mb-6">
            <Lock size={32} className="text-[#8b5cf6]" />
          </div>
          <h1 className="font-heading font-bold text-2xl text-white mb-3">Pro Analitik Paneli</h1>
          <p className="text-[#a1a1aa] mb-6 leading-relaxed max-w-md mx-auto">
            Gelir grafikleri, beat çalınma ısı haritası, gig dönüşüm oranları ve kitle demografisi — bu özellikler <strong className="text-[#8b5cf6]">Pro</strong> ve <strong className="text-[#ec4899]">Enterprise</strong> planlara özeldir.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/subscriptions')}
              className="flex items-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold px-6 py-3 rounded-md transition-all hover:shadow-glow"
              data-testid="upgrade-btn"
            >
              <Crown size={16} /> Pro'ya Yükselt
            </button>
            <button onClick={() => navigate('/dashboard')} className="border border-white/10 text-[#a1a1aa] hover:text-white px-6 py-3 rounded-md transition-all hover:bg-white/5">
              Dashboard'a Dön
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading font-bold text-2xl text-white flex items-center gap-2">
              <TrendingUp size={22} className="text-[#8b5cf6]" /> Pro Analitik
            </h1>
            <p className="text-xs text-[#a1a1aa] mt-1">
              <span className="font-mono uppercase px-2 py-0.5 rounded text-xs" style={{ background: `${TIER_COLORS[tier]}20`, color: TIER_COLORS[tier] }}>
                {tier.toUpperCase()}
              </span>
              {' '}planı aktif
            </p>
          </div>
          <button onClick={fetchAll} className="text-xs text-[#a1a1aa] hover:text-white border border-white/10 px-3 py-1.5 rounded-md transition-colors">
            Yenile
          </button>
        </div>

        {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md text-sm">{error}</div>}

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => <SkeletonStat key={i} />)}
          </div>
        ) : (
          <>
            {/* Overview stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={DollarSign} label="Toplam Net Kazanç" value={`₺${overview?.total_revenue?.toLocaleString() || 0}`} color={SUCCESS} />
              <StatCard icon={Play} label="Toplam Çalınma" value={overview?.total_plays?.toLocaleString() || 0} color={ACCENT} />
              <StatCard icon={Music2} label="Beat / Gig" value={`${overview?.total_beats || 0} / ${overview?.total_gigs || 0}`} color={YELLOW} />
              <StatCard icon={Briefcase} label="Tamamlanan Sipariş" value={overview?.total_orders || 0} sub={`Ort. ₺${overview?.avg_order_value || 0}`} color={PINK} />
            </div>

            {/* Revenue Chart */}
            <div className="rs-card p-6 mb-6">
              <h3 className="text-sm font-semibold text-white mb-5">Aylık Gelir (Son 12 Ay)</h3>
              {revenue.length === 0 ? (
                <div className="text-center py-10 text-[#a1a1aa] text-sm">Henüz tamamlanan sipariş yok.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={revenue} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₺${v}`} />
                    <Tooltip content={<CUSTOM_TOOLTIP />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
                    <Line type="monotone" dataKey="net" name="Gig Geliri (Net)" stroke={ACCENT} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="beat_revenue" name="Beat Geliri" stroke={SUCCESS} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Beat Play Heatmap */}
              <div className="rs-card p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Beat Çalınma Isı Haritası</h3>
                <p className="text-xs text-[#a1a1aa] mb-3">Hangi saat ve günlerde daha fazla dinleniyorsun?</p>
                <Heatmap data={heatmap} />
              </div>

              {/* Audience Demographics */}
              <div className="rs-card p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Kitle Demografisi</h3>
                {!audience?.roles?.length ? (
                  <div className="text-center py-8 text-[#a1a1aa] text-sm">Henüz satın alma verisi yok.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[#a1a1aa] mb-2 font-mono uppercase">Alıcı Rolleri</p>
                      <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                          <Pie data={audience.roles} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={60} label={({ role, percent }) => `${role} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                            {audience.roles.map((entry, i) => (
                              <Cell key={i} fill={ROLE_COLORS_PIE[entry.role] || GENRE_COLORS[i % GENRE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CUSTOM_TOOLTIP />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <p className="text-xs text-[#a1a1aa] mb-2 font-mono uppercase">En Çok Satılan Türler</p>
                      {audience.genres?.slice(0, 5).map((g, i) => (
                        <div key={i} className="flex items-center gap-2 mb-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: GENRE_COLORS[i] }} />
                          <span className="text-xs text-white flex-1 truncate">{g.genre}</span>
                          <span className="text-xs text-[#a1a1aa] font-mono">{g.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Gig Conversion */}
            {conversion.length > 0 && (
              <div className="rs-card p-6 mb-6">
                <h3 className="text-sm font-semibold text-white mb-5">Gig Dönüşüm Oranları</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={conversion.slice(0, 8)} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="title" tick={{ fill: '#a1a1aa', fontSize: 10 }} angle={-30} textAnchor="end" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CUSTOM_TOOLTIP />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
                    <Bar dataKey="views" name="Görüntüleme" fill="rgba(139,92,246,0.3)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="orders" name="Sipariş" fill={ACCENT} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Beats Table */}
            {beats.length > 0 && (
              <div className="rs-card overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5">
                  <h3 className="text-sm font-semibold text-white">En Çok Çalınan Beatler</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {beats.map((beat, i) => (
                    <div key={beat.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[#1a1a1f] transition-colors">
                      <span className="text-xs text-[#a1a1aa] font-mono w-5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{beat.title}</p>
                        <p className="text-xs text-[#a1a1aa]">{beat.genre} · {beat.bpm} BPM · {beat.key}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[#a1a1aa]">
                        <Play size={10} /> {beat.plays?.toLocaleString()}
                      </div>
                      <div className="text-xs text-[#10b981] font-mono">{beat.purchases} satış</div>
                      {/* Mini sparkline bar */}
                      <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden hidden md:block">
                        <div className="h-full bg-[#8b5cf6] rounded-full" style={{ width: `${Math.min((beat.plays / (beats[0]?.plays || 1)) * 100, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default AnalyticsDashboard;
