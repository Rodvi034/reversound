import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Plus, Loader } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const WalletPage = () => {
  const { user, token } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [topupAmount, setTopupAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupMsg, setTopupMsg] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const fetchWallet = async () => {
    try {
      const [w, t] = await Promise.all([
        axios.get(`${API}/wallet`, { headers, withCredentials: true }),
        axios.get(`${API}/wallet/transactions`, { headers, withCredentials: true }),
      ]);
      setWallet(w.data);
      setTransactions(t.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchWallet(); }, [token]);

  const handleTopup = async (e) => {
    e.preventDefault();
    if (!topupAmount || parseFloat(topupAmount) <= 0) return;
    setTopupLoading(true);
    setTopupMsg('');
    try {
      const res = await axios.post(`${API}/wallet/topup`,
        { amount: parseFloat(topupAmount), payment_method: 'mock' },
        { headers, withCredentials: true });
      setTopupMsg(res.data.message);
      setTopupAmount('');
      fetchWallet();
    } catch (err) {
      setTopupMsg(err.response?.data?.detail || 'İşlem başarısız');
    } finally { setTopupLoading(false); }
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center py-24">
        <Loader size={24} className="text-[#8b5cf6] animate-spin" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="font-heading font-bold text-2xl text-white mb-6">Cüzdan</h1>

        {/* Balance cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rs-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={16} className="text-[#10b981]" />
              <p className="text-xs font-mono uppercase text-[#a1a1aa]">Kullanılabilir</p>
            </div>
            <p className="text-3xl font-bold text-[#10b981]">₺{wallet?.wallet_balance?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="rs-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <ArrowDownCircle size={16} className="text-[#f59e0b]" />
              <p className="text-xs font-mono uppercase text-[#a1a1aa]">Escrow'da Tutulan</p>
            </div>
            <p className="text-3xl font-bold text-[#f59e0b]">₺{wallet?.escrow_balance?.toFixed(2) || '0.00'}</p>
          </div>
        </div>

        {/* Topup */}
        <div className="rs-card p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4 font-mono uppercase tracking-wider">Bakiye Yükle (Mock)</h3>
          <p className="text-xs text-[#a1a1aa] mb-4">
            Bu demo ortamında ödeme simülasyonu yapılmaktadır. Gerçek ortamda Iyzico/PayTR entegrasyonu kullanılacak.
          </p>
          <form onSubmit={handleTopup} className="flex gap-3">
            <input
              type="number"
              min="1"
              max="10000"
              step="1"
              value={topupAmount}
              onChange={e => setTopupAmount(e.target.value)}
              placeholder="Miktar (₺)"
              className="rs-input flex-1 text-sm h-10"
              data-testid="topup-amount-input"
            />
            <button
              type="submit"
              disabled={topupLoading || !topupAmount}
              className="flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-md transition-all"
              data-testid="topup-submit-btn"
            >
              {topupLoading ? <Loader size={14} className="animate-spin" /> : <><Plus size={14} /> Yükle</>}
            </button>
          </form>
          {topupMsg && (
            <p className={`text-sm mt-3 ${topupMsg.includes('başarı') || topupMsg.includes('Successfully') ? 'text-[#10b981]' : 'text-[#ec4899]'}`}>
              {topupMsg}
            </p>
          )}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[100, 250, 500, 1000].map(amt => (
              <button
                key={amt}
                onClick={() => setTopupAmount(String(amt))}
                className="py-1.5 text-xs text-[#a1a1aa] hover:text-white border border-white/10 hover:border-white/20 rounded-md transition-colors"
                data-testid={`topup-preset-${amt}`}
              >
                ₺{amt}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction history */}
        <div className="rs-card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-xs font-mono uppercase text-[#a1a1aa]">İşlem Geçmişi</p>
          </div>
          {transactions.length === 0 ? (
            <div className="text-center py-10 text-[#a1a1aa] text-sm">Henüz işlem yok.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center gap-4 px-4 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'topup' ? 'bg-[#10b981]/10' : 'bg-[#ec4899]/10'}`}>
                    {tx.type === 'topup'
                      ? <ArrowDownCircle size={14} className="text-[#10b981]" />
                      : <ArrowUpCircle size={14} className="text-[#ec4899]" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white capitalize">{tx.type === 'topup' ? 'Bakiye Yükleme' : 'Ödeme'}</p>
                    <p className="text-xs text-[#a1a1aa]">{new Date(tx.created_at).toLocaleString('tr-TR')}</p>
                  </div>
                  <span className={`text-sm font-bold ${tx.type === 'topup' ? 'text-[#10b981]' : 'text-[#ec4899]'}`}>
                    {tx.type === 'topup' ? '+' : '-'}₺{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default WalletPage;
