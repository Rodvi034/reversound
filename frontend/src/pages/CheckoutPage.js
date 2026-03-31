import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { ShoppingBag, Trash2, Loader, Check, Plus, Package, Music2, CreditCard, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { items, removeItem, clearCart, total } = useCart();
  const [wallet, setWallet] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [step, setStep] = useState('review'); // review | processing | done
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    axios.get(`${API}/wallet`, { headers, withCredentials: true })
      .then(res => setWallet(res.data))
      .catch(() => {});
  }, [token]);

  const handleCheckout = async () => {
    if (!user) { navigate('/auth'); return; }
    if (items.length === 0) return;
    setProcessing(true);
    setStep('processing');
    const outcomes = [];

    for (const item of items) {
      if (item.type === 'beat') {
        try {
          const res = await axios.post(
            `${API}/beats/${item.id}/purchase?license_type=${item.license_type}`,
            {},
            { headers, withCredentials: true }
          );
          outcomes.push({ item, success: true, msg: res.data.message, rights: res.data.rights });
        } catch (err) {
          outcomes.push({ item, success: false, msg: err.response?.data?.detail || 'Satın alma başarısız' });
        }
      } else if (item.type === 'studio') {
        try {
          const res = await axios.post(
            `${API}/studio/subscribe?tier=${item.studio_tier}`,
            {},
            { headers, withCredentials: true }
          );
          outcomes.push({ item, success: true, msg: res.data.message });
        } catch (err) {
          outcomes.push({ item, success: false, msg: err.response?.data?.detail || 'Abonelik başarısız' });
        }
      } else if (item.type === 'subscription') {
        try {
          const res = await axios.post(
            `${API}/subscriptions/subscribe?tier=${item.plan_id}`,
            {},
            { headers, withCredentials: true }
          );
          outcomes.push({ item, success: true, msg: res.data.message });
        } catch (err) {
          outcomes.push({ item, success: false, msg: err.response?.data?.detail || 'Abonelik başarısız' });
        }
      }
    }

    setResults(outcomes);
    setProcessing(false);
    setStep('done');
    const successful = outcomes.filter(o => o.success);
    if (successful.length > 0) {
      clearCart();
      // Refresh wallet
      axios.get(`${API}/wallet`, { headers, withCredentials: true }).then(res => setWallet(res.data)).catch(() => {});
    }
  };

  const isInsufficient = wallet && total > wallet.wallet_balance;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <ShoppingBag size={22} className="text-[#8b5cf6]" />
          <h1 className="font-heading font-bold text-2xl text-white">Sepet & Ödeme</h1>
        </div>

        {step === 'done' ? (
          // Results
          <div className="space-y-4">
            <div className="rs-card p-5">
              <h3 className="font-semibold text-white mb-4">Ödeme Sonuçları</h3>
              {results.map((r, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-md mb-2 ${r.success ? 'bg-[#10b981]/10 border border-[#10b981]/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  {r.success
                    ? <Check size={16} className="text-[#10b981] flex-shrink-0 mt-0.5" />
                    : <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  }
                  <div>
                    <p className={`text-sm font-medium ${r.success ? 'text-[#10b981]' : 'text-red-400'}`}>{r.item.title}</p>
                    <p className="text-xs text-[#a1a1aa]">{r.msg}</p>
                    {r.rights && <p className="text-xs text-[#8b5cf6] mt-0.5">Hak: {r.rights}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => navigate('/beats')} className="flex-1 border border-white/10 text-[#a1a1aa] hover:text-white py-3 rounded-md text-sm transition-colors hover:bg-white/5">
                Beat Market'e Dön
              </button>
              <button onClick={() => navigate('/dashboard')} className="flex-1 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold py-3 rounded-md transition-all hover:shadow-glow text-sm">
                Dashboard'a Git
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-3">
              {items.length === 0 ? (
                <div className="rs-card p-10 text-center">
                  <ShoppingBag size={40} className="text-[#a1a1aa] mx-auto mb-4 opacity-20" />
                  <p className="text-[#a1a1aa] mb-4">Sepetiniz boş.</p>
                  <button onClick={() => navigate('/beats')} className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-6 py-2.5 rounded-md text-sm transition-all hover:shadow-glow">
                    Beat Market'e Git
                  </button>
                </div>
              ) : (
                items.map(item => (
                  <div key={item.cart_key} className="rs-card p-4 flex items-center gap-4">
                    {item.cover_url ? (
                      <img src={item.cover_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-white/10" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center flex-shrink-0">
                        {item.type === 'beat' ? <Music2 size={20} className="text-[#8b5cf6]" /> : <Package size={20} className="text-[#8b5cf6]" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                      <p className="text-xs text-[#a1a1aa]">{item.producer_name || ''}</p>
                      {item.license_type && (
                        <span className="inline-block mt-1 badge-genre capitalize text-[10px]">{item.license_type} lisans</span>
                      )}
                      {item.rights && <p className="text-[10px] text-[#8b5cf6] mt-0.5">{item.rights}</p>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-base font-bold text-white">₺{item.price}</span>
                      <button
                        onClick={() => removeItem(item.cart_key)}
                        className="text-[#a1a1aa] hover:text-[#ec4899] transition-colors p-1"
                        data-testid={`remove-${item.cart_key}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Order Summary */}
            {items.length > 0 && (
              <div className="space-y-4">
                {/* Wallet balance */}
                <div className="rs-card p-5">
                  <p className="text-xs font-mono uppercase text-[#a1a1aa] mb-3">Cüzdan</p>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[#a1a1aa]">Bakiye</span>
                    <span className={`text-lg font-bold ${isInsufficient ? 'text-[#ec4899]' : 'text-[#10b981]'}`}>
                      ₺{wallet?.wallet_balance?.toFixed(2) || '—'}
                    </span>
                  </div>
                  {isInsufficient && (
                    <div className="mt-2 p-2 bg-[#ec4899]/10 border border-[#ec4899]/20 rounded-md">
                      <p className="text-xs text-[#ec4899]">Yetersiz bakiye. ₺{(total - (wallet?.wallet_balance || 0)).toFixed(2)} daha gerekli.</p>
                      <button onClick={() => navigate('/wallet')} className="text-xs text-[#8b5cf6] hover:text-[#7c3aed] mt-1 flex items-center gap-1">
                        <Plus size={10} /> Bakiye Yükle
                      </button>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="rs-card p-5">
                  <p className="text-xs font-mono uppercase text-[#a1a1aa] mb-4">Sipariş Özeti</p>
                  {items.map(item => (
                    <div key={item.cart_key} className="flex justify-between text-sm mb-2">
                      <span className="text-[#a1a1aa] truncate mr-2">{item.title}</span>
                      <span className="text-white flex-shrink-0">₺{item.price}</span>
                    </div>
                  ))}
                  <div className="border-t border-white/10 mt-3 pt-3 flex justify-between">
                    <span className="text-sm font-semibold text-white">Toplam</span>
                    <span className="text-lg font-bold text-white">₺{total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Checkout button */}
                <button
                  onClick={handleCheckout}
                  disabled={processing || isInsufficient || items.length === 0}
                  className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all hover:shadow-glow flex items-center justify-center gap-3 text-base"
                  data-testid="process-payment-btn"
                >
                  {processing ? <Loader size={18} className="animate-spin" /> : <><CreditCard size={18} /> Ödemeyi Tamamla</>}
                </button>
                <p className="text-center text-xs text-[#a1a1aa]">
                  Cüzdan bakiyesinden düşülür. Escrow güvencesi ile korumalı.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CheckoutPage;
