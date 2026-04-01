import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Wallet, ArrowDownCircle, ArrowUpCircle, CreditCard, Shield, Loader, ExternalLink } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const WalletPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [iyzMode, setIyzMode] = useState('sandbox');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/wallet`, { headers, withCredentials: true }),
      axios.get(`${API}/wallet/transactions`, { headers, withCredentials: true }),
      axios.get(`${API}/payment/status`, { headers, withCredentials: true }),
    ]).then(([w, t, p]) => {
      setWallet(w.data);
      setTransactions(t.data || []);
      setIyzMode(p.data.mode);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

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
              <Shield size={16} className="text-[#f59e0b]" />
              <p className="text-xs font-mono uppercase text-[#a1a1aa]">Escrow'da Tutulan</p>
            </div>
            <p className="text-3xl font-bold text-[#f59e0b]">₺{wallet?.escrow_balance?.toFixed(2) || '0.00'}</p>
          </div>
        </div>

        {/* Real Payment CTA */}
        <div className="rs-card p-6 mb-6" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(16,185,129,0.05))', borderColor: 'rgba(139,92,246,0.2)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center">
              <CreditCard size={18} className="text-[#8b5cf6]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Bakiye Yükle</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-[#a1a1aa]">Iyzico güvenli ödeme</p>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${iyzMode === 'live' ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'}`}>
                  {iyzMode === 'live' ? 'CANLI' : 'SANDBOX'}
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-[#a1a1aa] mb-4 leading-relaxed">
            Kredi kartı ile güvenli ödeme yapın. Platform komisyonu dahil tüm alışverişlerde kullanılır.
          </p>
          <button
            onClick={() => navigate('/payment')}
            className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold py-3 rounded-md transition-all hover:shadow-glow flex items-center justify-center gap-2"
            data-testid="add-funds-btn"
          >
            <CreditCard size={16} /> Kart ile Bakiye Yükle
          </button>
          <div className="flex items-center justify-center gap-4 mt-3">
            {['100', '250', '500', '1000'].map(amt => (
              <button
                key={amt}
                onClick={() => navigate(`/payment?amount=${amt}`)}
                className="text-xs text-[#a1a1aa] hover:text-white transition-colors"
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
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-[#10b981]/10' : 'bg-[#ec4899]/10'}`}>
                    {tx.amount > 0
                      ? <ArrowDownCircle size={14} className="text-[#10b981]" />
                      : <ArrowUpCircle size={14} className="text-[#ec4899]" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white capitalize">{
                      tx.type === 'topup' ? 'Bakiye Yükleme' :
                      tx.type === 'studio_subscription' ? 'Rever Studio Abonelik' :
                      'Ödeme'
                    }</p>
                    <p className="text-xs text-[#a1a1aa]">{new Date(tx.created_at).toLocaleString('tr-TR')}</p>
                  </div>
                  <span className={`text-sm font-bold ${tx.amount > 0 ? 'text-[#10b981]' : 'text-[#ec4899]'}`}>
                    {tx.amount > 0 ? '+' : ''}₺{Math.abs(tx.amount)}
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
