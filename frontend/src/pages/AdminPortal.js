import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Music2, Briefcase, CheckCircle, XCircle, Shield, AlertTriangle, Loader, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';
import Logo, { LogoMark } from '@/components/Logo';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminPortal = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [beats, setBeats] = useState([]);
  const [gigs, setGigs] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  const headers = { Authorization: `Bearer ${token}` };
  const creds = { withCredentials: true };

  const fetchData = async (tab = activeTab) => {
    setLoading(true);
    try {
      if (tab === 'stats') {
        const res = await axios.get(`${API}/admin/stats`, { headers, ...creds });
        setStats(res.data);
      } else if (tab === 'users') {
        const res = await axios.get(`${API}/admin/users`, { headers, ...creds });
        setUsers(res.data.users || []);
      } else if (tab === 'beats') {
        const res = await axios.get(`${API}/admin/beats?status=pending`, { headers, ...creds });
        setBeats(res.data.beats || []);
      } else if (tab === 'gigs') {
        const res = await axios.get(`${API}/admin/gigs?status=pending`, { headers, ...creds });
        setGigs(res.data.gigs || []);
      } else if (tab === 'submissions') {
        const res = await axios.get(`${API}/admin/submissions`, { headers, ...creds });
        setSubmissions(res.data || []);
      } else if (tab === 'financials') {
        const res = await axios.get(`${API}/admin/financials`, { headers, ...creds });
        setFinancials(res.data);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(activeTab); }, [activeTab, token]);

  const moderateContent = async (type, id, status) => {
    setActionLoading(`${type}-${id}`);
    try {
      await axios.patch(`${API}/admin/${type}/${id}/status`,
        { status },
        { headers, ...creds });
      fetchData(activeTab);
    } catch (err) {
      alert(err.response?.data?.detail || 'İşlem başarısız');
    } finally { setActionLoading(''); }
  };

  const updateUser = async (userId, updates) => {
    setActionLoading(`user-${userId}`);
    try {
      await axios.patch(`${API}/admin/users/${userId}`,
        updates,
        { headers, ...creds });
      fetchData('users');
    } catch (err) {
      alert(err.response?.data?.detail || 'İşlem başarısız');
    } finally { setActionLoading(''); }
  };

  const TABS = [
    { id: 'stats', label: 'Özet', icon: Shield },
    { id: 'users', label: 'Kullanıcılar', icon: Users },
    { id: 'beats', label: 'Beat Onay', icon: Music2 },
    { id: 'gigs', label: 'Gig Onay', icon: Briefcase },
    { id: 'submissions', label: 'Başvurular', icon: CheckCircle },
    { id: 'financials', label: 'Finansal', icon: ShieldCheck },
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck size={22} className="text-[#ec4899]" />
          <h1 className="font-heading font-bold text-2xl text-white">Admin Portal</h1>
          <div className="ml-auto opacity-30">
            <LogoMark size="sm" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#141416] border border-white/5 rounded-lg p-1 mb-6 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-[#8b5cf6] text-white' : 'text-[#a1a1aa] hover:text-white'}`}
                data-testid={`admin-tab-${tab.id}`}
              >
                <Icon size={12} /> {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader size={24} className="text-[#8b5cf6] animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats */}
            {activeTab === 'stats' && stats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(stats).map(([key, value]) => {
                  const labels = {
                    total_users: 'Toplam Kullanıcı', total_beats: 'Toplam Beat',
                    pending_beats: 'Onay Bekleyen Beat', total_gigs: 'Toplam Gig',
                    pending_gigs: 'Onay Bekleyen Gig', total_orders: 'Toplam Sipariş',
                    active_orders: 'Aktif Sipariş', disputed_orders: 'İtirazlı Sipariş',
                    total_submissions: 'Başvuru', pending_submissions: 'Onay Bekleyen'
                  };
                  const colors = { pending_beats: '#f59e0b', pending_gigs: '#f59e0b', disputed_orders: '#ec4899', pending_submissions: '#f59e0b' };
                  const color = colors[key] || '#8b5cf6';
                  return (
                    <div key={key} className="rs-card p-4">
                      <p className="text-xl font-bold" style={{ color }}>{value}</p>
                      <p className="text-xs text-[#a1a1aa] mt-1">{labels[key] || key}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Users */}
            {activeTab === 'users' && (
              <div className="rs-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-xs font-mono uppercase text-[#a1a1aa]">
                      <th className="text-left px-4 py-3">Kullanıcı</th>
                      <th className="text-left px-4 py-3 hidden md:table-cell">Rol</th>
                      <th className="text-left px-4 py-3 hidden lg:table-cell">Kayıt</th>
                      <th className="text-left px-4 py-3">Durum</th>
                      <th className="text-left px-4 py-3">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-[#1a1a1f] transition-colors" data-testid={`admin-user-${u.id}`}>
                        <td className="px-4 py-3">
                          <p className="text-white font-medium">{u.name}</p>
                          <p className="text-xs text-[#a1a1aa]">{u.email}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="badge-genre">{u.role}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-[#a1a1aa]">
                          {new Date(u.created_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-4 py-3">
                          {u.is_banned ? (
                            <span className="text-xs text-[#ec4899]">Askıya Alındı</span>
                          ) : u.is_verified ? (
                            <span className="text-xs text-[#10b981]">Doğrulandı</span>
                          ) : (
                            <span className="text-xs text-[#a1a1aa]">Normal</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {!u.is_verified && (
                              <button
                                onClick={() => updateUser(u.id, { is_verified: true })}
                                disabled={actionLoading === `user-${u.id}`}
                                className="text-xs text-[#10b981] border border-[#10b981]/20 px-2 py-1 rounded hover:bg-[#10b981]/10 transition-colors"
                                data-testid={`verify-user-${u.id}`}
                              >
                                Doğrula
                              </button>
                            )}
                            <button
                              onClick={() => updateUser(u.id, { is_banned: !u.is_banned })}
                              disabled={actionLoading === `user-${u.id}` || u.role === 'admin'}
                              className={`text-xs border px-2 py-1 rounded transition-colors ${u.is_banned ? 'text-[#10b981] border-[#10b981]/20 hover:bg-[#10b981]/10' : 'text-[#ec4899] border-[#ec4899]/20 hover:bg-[#ec4899]/10'}`}
                              data-testid={`ban-user-${u.id}`}
                            >
                              {u.is_banned ? 'Kaldır' : 'Askıya Al'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Beats Moderation */}
            {activeTab === 'beats' && (
              <div className="space-y-3">
                {beats.length === 0 ? (
                  <div className="text-center py-10 text-[#a1a1aa]">Onay bekleyen beat yok.</div>
                ) : beats.map(beat => (
                  <div key={beat.id} className="rs-card p-4 flex items-center gap-4" data-testid={`admin-beat-${beat.id}`}>
                    {beat.cover_url && <img src={beat.cover_url} alt="" className="w-12 h-12 rounded object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{beat.title}</p>
                      <p className="text-xs text-[#a1a1aa]">{beat.producer_name} · {beat.genre} · {beat.bpm} BPM</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => moderateContent('beats', beat.id, 'approved')}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1 text-xs text-[#10b981] border border-[#10b981]/20 px-3 py-1.5 rounded-md hover:bg-[#10b981]/10 transition-colors"
                        data-testid={`approve-beat-${beat.id}`}
                      >
                        <CheckCircle size={12} /> Onayla
                      </button>
                      <button
                        onClick={() => moderateContent('beats', beat.id, 'rejected')}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1 text-xs text-[#ec4899] border border-[#ec4899]/20 px-3 py-1.5 rounded-md hover:bg-[#ec4899]/10 transition-colors"
                        data-testid={`reject-beat-${beat.id}`}
                      >
                        <XCircle size={12} /> Reddet
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Gigs Moderation */}
            {activeTab === 'gigs' && (
              <div className="space-y-3">
                {gigs.length === 0 ? (
                  <div className="text-center py-10 text-[#a1a1aa]">Onay bekleyen gig yok.</div>
                ) : gigs.map(gig => (
                  <div key={gig.id} className="rs-card p-4 flex items-center gap-4" data-testid={`admin-gig-${gig.id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{gig.title}</p>
                      <p className="text-xs text-[#a1a1aa]">{gig.seller_name} · {gig.category}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => moderateContent('gigs', gig.id, 'approved')}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1 text-xs text-[#10b981] border border-[#10b981]/20 px-3 py-1.5 rounded-md hover:bg-[#10b981]/10 transition-colors"
                        data-testid={`approve-gig-${gig.id}`}
                      >
                        <CheckCircle size={12} /> Onayla
                      </button>
                      <button
                        onClick={() => moderateContent('gigs', gig.id, 'rejected')}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1 text-xs text-[#ec4899] border border-[#ec4899]/20 px-3 py-1.5 rounded-md hover:bg-[#ec4899]/10 transition-colors"
                        data-testid={`reject-gig-${gig.id}`}
                      >
                        <XCircle size={12} /> Reddet
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Submissions */}
            {activeTab === 'submissions' && (
              <div className="space-y-3">
                {submissions.length === 0 ? (
                  <div className="text-center py-10 text-[#a1a1aa]">Onay bekleyen başvuru yok.</div>
                ) : submissions.map(sub => (
                  <div key={sub.id} className="rs-card p-4" data-testid={`admin-sub-${sub.id}`}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="text-sm font-medium text-white">{sub.title}</p>
                        <p className="text-xs text-[#a1a1aa]">{sub.artist_name} · {sub.genre}</p>
                        {sub.description && <p className="text-xs text-[#a1a1aa] mt-1">{sub.description}</p>}
                      </div>
                      <a href={sub.track_url} target="_blank" rel="noreferrer" className="text-xs text-[#8b5cf6] hover:text-[#7c3aed] flex-shrink-0">
                        Parçayı Dinle
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => moderateContent('submissions', sub.id, 'approved')}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1 text-xs text-[#10b981] border border-[#10b981]/20 px-3 py-1.5 rounded-md hover:bg-[#10b981]/10 transition-colors"
                      >
                        <CheckCircle size={12} /> Playlist'e Ekle
                      </button>
                      <button
                        onClick={() => moderateContent('submissions', sub.id, 'rejected')}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1 text-xs text-[#ec4899] border border-[#ec4899]/20 px-3 py-1.5 rounded-md hover:bg-[#ec4899]/10 transition-colors"
                      >
                        <XCircle size={12} /> Reddet
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Financials */}
            {activeTab === 'financials' && financials && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Platform Geliri (Gig)', value: `₺${financials.platform_revenue_gigs?.toFixed(2)}`, color: '#10b981' },
                    { label: 'Platform Geliri (Beat)', value: `₺${financials.platform_revenue_beats?.toFixed(2)}`, color: '#8b5cf6' },
                    { label: 'Toplam GMV', value: `₺${financials.gmv?.toFixed(2)}`, color: '#f59e0b' },
                    { label: 'Bekleyen Escrow', value: `₺${financials.pending_escrow?.toFixed(2)}`, color: '#ec4899' },
                  ].map(s => (
                    <div key={s.label} className="rs-card p-4">
                      <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-xs text-[#a1a1aa] mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Tamamlanan Sipariş', value: financials.order_count, color: '#10b981' },
                    { label: 'Beat Satışı', value: financials.beat_purchase_count, color: '#8b5cf6' },
                    { label: 'Aktif İtiraz', value: financials.active_disputes, color: '#ec4899' },
                    { label: 'İtirazlı Tutar', value: `₺${financials.disputed_value?.toFixed(2)}`, color: '#f59e0b' },
                  ].map(s => (
                    <div key={s.label} className="rs-card p-4">
                      <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-xs text-[#a1a1aa] mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
                {/* Commission tiers */}
                {financials.seller_tier_distribution?.length > 0 && (
                  <div className="rs-card p-5">
                    <p className="text-xs font-mono uppercase text-[#a1a1aa] mb-4">Satıcı Komisyon Dağılımı</p>
                    <div className="flex gap-3 flex-wrap">
                      {financials.seller_tier_distribution.map(t => (
                        <div key={t.tier} className="flex items-center gap-2 px-3 py-2 bg-[#0d0d0f] rounded-md">
                          <div className="w-2 h-2 rounded-full" style={{ background: t.tier.includes('Elite') ? '#ec4899' : t.tier.includes('Pro') ? '#8b5cf6' : '#a1a1aa' }} />
                          <p className="text-xs text-white">{t.tier}: <strong>{t.count}</strong></p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Recent transactions */}
                <div className="rs-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-xs font-mono uppercase text-[#a1a1aa]">Son İşlemler</p>
                  </div>
                  <div className="divide-y divide-white/5">
                    {(financials.recent_transactions || []).map((tx, i) => (
                      <div key={i} className="flex items-center gap-4 px-4 py-3 text-xs">
                        <span className="text-[#a1a1aa] font-mono">{tx.transaction_id || 'TXN'}</span>
                        <span className="text-white flex-1">{tx.order_id?.slice(-8)}</span>
                        <span className="text-[#ec4899]">-₺{tx.platform_fee?.toFixed(2)}</span>
                        <span className="text-[#10b981]">₺{tx.seller_amount?.toFixed(2)}</span>
                      </div>
                    ))}
                    {!financials.recent_transactions?.length && <div className="text-center py-6 text-[#a1a1aa] text-sm">Henüz işlem yok.</div>}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default AdminPortal;
