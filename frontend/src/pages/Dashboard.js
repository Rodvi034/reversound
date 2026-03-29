import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Music2, Briefcase, Wallet, TrendingUp, Play, Upload, Plus, ArrowRight, Loader } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="rs-card p-5 flex items-center gap-4">
    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
      <Icon size={18} style={{ color }} />
    </div>
    <div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-[#a1a1aa]">{label}</p>
      {sub && <p className="text-xs" style={{ color }}>{sub}</p>}
    </div>
  </div>
);

const Dashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [orders, setOrders] = useState([]);
  const [myBeats, setMyBeats] = useState([]);
  const [myGigs, setMyGigs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    const creds = { withCredentials: true };
    Promise.all([
      axios.get(`${API}/wallet`, { headers, ...creds }),
      axios.get(`${API}/orders`, { headers, ...creds }),
      user?.role === 'producer' || user?.role === 'admin'
        ? axios.get(`${API}/beats/my`, { headers, ...creds })
        : Promise.resolve({ data: [] }),
      ['producer', 'engineer', 'designer', 'artist', 'admin'].includes(user?.role)
        ? axios.get(`${API}/gigs/my`, { headers, ...creds })
        : Promise.resolve({ data: [] }),
    ]).then(([w, o, b, g]) => {
      setWallet(w.data);
      setOrders(o.data || []);
      setMyBeats(Array.isArray(b.data) ? b.data : []);
      setMyGigs(Array.isArray(g.data) ? g.data : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token, user]);

  const activeOrders = orders.filter(o => ['funded', 'in_progress', 'delivered'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalEarnings = completedOrders
    .filter(o => o.seller_id === user?.id)
    .reduce((acc, o) => acc + (o.price * 0.9), 0);

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center py-24">
        <Loader size={24} className="text-[#8b5cf6] animate-spin" />
      </div>
    </Layout>
  );

  const SELLER_ROLES = ['producer', 'engineer', 'designer', 'artist', 'admin'];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Welcome */}
        <div className="mb-8 animate-fade-up">
          <h1 className="font-heading font-bold text-2xl text-white">
            Merhaba, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-[#a1a1aa] text-sm mt-1">
            <span className="font-mono uppercase text-xs text-[#8b5cf6]">{user?.role}</span>
            {' '} · Üyelik: {new Date(user?.created_at).toLocaleDateString('tr-TR')}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Wallet} label="Cüzdan Bakiyesi" value={`₺${wallet?.wallet_balance?.toFixed(0) || 0}`} color="#10b981" sub={wallet?.escrow_balance > 0 ? `₺${wallet.escrow_balance.toFixed(0)} escrow'da` : null} />
          <StatCard icon={Briefcase} label="Aktif Siparişler" value={activeOrders.length} color="#8b5cf6" />
          <StatCard icon={TrendingUp} label="Toplam Kazanç" value={`₺${totalEarnings.toFixed(0)}`} color="#ec4899" />
          <StatCard icon={Music2} label={SELLER_ROLES.includes(user?.role) ? 'Beat / Gig' : 'Tamamlanan'} value={SELLER_ROLES.includes(user?.role) ? `${myBeats.length} / ${myGigs.length}` : completedOrders.length} color="#f59e0b" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick actions */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">Hızlı İşlemler</h2>
            <div className="space-y-2">
              {user?.role === 'producer' || user?.role === 'admin' ? (
                <button
                  onClick={() => navigate('/beats/upload')}
                  className="w-full flex items-center gap-3 p-3 bg-[#141416] border border-white/5 hover:border-[#8b5cf6]/30 rounded-md transition-all group"
                  data-testid="dash-upload-beat-btn"
                >
                  <Upload size={16} className="text-[#8b5cf6]" />
                  <span className="text-sm text-white">Beat Yükle</span>
                  <ArrowRight size={14} className="text-[#a1a1aa] ml-auto group-hover:text-[#8b5cf6]" />
                </button>
              ) : null}
              {SELLER_ROLES.includes(user?.role) && (
                <button
                  onClick={() => navigate('/gigs/create')}
                  className="w-full flex items-center gap-3 p-3 bg-[#141416] border border-white/5 hover:border-[#8b5cf6]/30 rounded-md transition-all group"
                  data-testid="dash-create-gig-btn"
                >
                  <Plus size={16} className="text-[#8b5cf6]" />
                  <span className="text-sm text-white">Gig Oluştur</span>
                  <ArrowRight size={14} className="text-[#a1a1aa] ml-auto group-hover:text-[#8b5cf6]" />
                </button>
              )}
              <button
                onClick={() => navigate('/wallet')}
                className="w-full flex items-center gap-3 p-3 bg-[#141416] border border-white/5 hover:border-[#10b981]/30 rounded-md transition-all group"
                data-testid="dash-wallet-btn"
              >
                <Wallet size={16} className="text-[#10b981]" />
                <span className="text-sm text-white">Cüzdanı Yönet</span>
                <ArrowRight size={14} className="text-[#a1a1aa] ml-auto group-hover:text-[#10b981]" />
              </button>
              <button
                onClick={() => navigate('/coach')}
                className="w-full flex items-center gap-3 p-3 bg-[#141416] border border-white/5 hover:border-[#8b5cf6]/30 rounded-md transition-all group"
                data-testid="dash-coach-btn"
              >
                <TrendingUp size={16} className="text-[#8b5cf6]" />
                <span className="text-sm text-white">AI Kariyer Koçu</span>
                <ArrowRight size={14} className="text-[#a1a1aa] ml-auto group-hover:text-[#8b5cf6]" />
              </button>
            </div>
          </div>

          {/* Recent orders */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">Son Siparişler</h2>
              <button onClick={() => navigate('/orders')} className="text-xs text-[#8b5cf6] hover:text-[#7c3aed] transition-colors">
                Tümünü Gör →
              </button>
            </div>
            <div className="rs-card overflow-hidden">
              {orders.length === 0 ? (
                <div className="text-center py-10 text-[#a1a1aa] text-sm">Henüz sipariş yok.</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {orders.slice(0, 5).map(order => {
                    const statusColors = {
                      funded: '#f59e0b', in_progress: '#8b5cf6', delivered: '#06b6d4',
                      completed: '#10b981', disputed: '#ec4899', cancelled: '#6b7280'
                    };
                    const statusLabels = {
                      funded: 'Beklemede', in_progress: 'Devam Ediyor', delivered: 'Teslim Edildi',
                      completed: 'Tamamlandı', disputed: 'İtirazda', cancelled: 'İptal'
                    };
                    const color = statusColors[order.status] || '#a1a1aa';
                    return (
                      <div
                        key={order.id}
                        className="flex items-center gap-4 px-4 py-3 hover:bg-[#1a1a1f] transition-colors cursor-pointer"
                        onClick={() => navigate('/orders')}
                        data-testid={`dash-order-${order.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{order.gig_title}</p>
                          <p className="text-xs text-[#a1a1aa]">
                            {order.buyer_id === user?.id ? `Satıcı: ${order.seller_name}` : `Alıcı: ${order.buyer_name}`}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-[#10b981]">₺{order.price}</span>
                        <span className="text-xs px-2 py-1 rounded-full font-mono" style={{ background: `${color}15`, color }}>
                          {statusLabels[order.status] || order.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* My Beats (for producers) */}
        {myBeats.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">Beatlerim</h2>
            </div>
            <div className="rs-card overflow-hidden">
              <div className="divide-y divide-white/5">
                {myBeats.slice(0, 5).map(beat => (
                  <div key={beat.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{beat.title}</p>
                      <p className="text-xs text-[#a1a1aa]">{beat.genre} · {beat.bpm} BPM · {beat.key}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[#a1a1aa]">
                      <Play size={10} /> {beat.plays}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-mono ${beat.status === 'approved' ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'}`}>
                      {beat.status === 'approved' ? 'Yayında' : 'İncelemede'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
