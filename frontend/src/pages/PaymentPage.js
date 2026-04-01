import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, Wallet, Shield, Loader, Check, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500, 5000];

const PaymentPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [amount, setAmount] = useState('');
  const [wallet, setWallet] = useState(null);
  const [step, setStep] = useState('amount'); // amount | form | processing | success | error
  const [checkoutData, setCheckoutData] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [error, setError] = useState('');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    // Check for payment callback
    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get('payment_status');
    if (paymentResult === 'success') {
      setStep('success');
    }
    // Load wallet
    axios.get(`${API}/wallet`, { headers, withCredentials: true })
      .then(res => setWallet(res.data)).catch(() => {});
  }, []);

  // Also fetch Iyzico status
  const [iyzMode, setIyzMode] = useState('sandbox');
  useEffect(() => {
    axios.get(`${API}/payment/status`, { headers, withCredentials: true })
      .then(res => setIyzMode(res.data.mode))
      .catch(() => {});
  }, []);

  const initCheckout = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setStep('processing');
    setError('');
    try {
      const res = await axios.post(`${API}/payment/checkout/init`,
        { amount: parseFloat(amount) },
        { headers, withCredentials: true }
      );
      setCheckoutData(res.data);
      setStep('form');
    } catch (err) {
      setError(err.response?.data?.detail || 'Ödeme başlatılamadı');
      setStep('error');
    }
  };

  const refreshWallet = async () => {
    const res = await axios.get(`${API}/wallet`, { headers, withCredentials: true });
    setWallet(res.data);
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-8">
        <button onClick={() => navigate('/wallet')} className="flex items-center gap-2 text-[#a1a1aa] hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft size={16} /> Cüzdana Dön
        </button>

        <div className="flex items-center gap-3 mb-6">
          <CreditCard size={22} className="text-[#8b5cf6]" />
          <div>
            <h1 className="font-heading font-bold text-2xl text-white">Bakiye Yükle</h1>
            <p className="text-xs text-[#a1a1aa]">
              Iyzico güvenli ödeme — {iyzMode === 'live' ? (
                <span className="text-[#10b981] font-mono">CANLI</span>
              ) : (
                <span className="text-[#f59e0b] font-mono">SANDBOX</span>
              )}
            </p>
          </div>
        </div>

        {/* Current balance */}
        {wallet && (
          <div className="rs-card p-4 mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-[#10b981]" />
              <span className="text-sm text-[#a1a1aa]">Mevcut Bakiye</span>
            </div>
            <span className="text-lg font-bold text-[#10b981]">₺{wallet.wallet_balance?.toFixed(2)}</span>
          </div>
        )}

        {/* Amount selection */}
        {step === 'amount' && (
          <div className="rs-card p-6 space-y-5">
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-2">Tutar (TRY)</label>
              <input
                type="number" min="10" max="50000" step="10"
                value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="Tutar girin..."
                className="rs-input text-lg h-12 font-bold"
                data-testid="payment-amount-input"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map(a => (
                <button key={a} onClick={() => setAmount(String(a))}
                  className={`py-2 text-sm rounded-md border transition-all ${amount == a ? 'border-[#8b5cf6] bg-[#8b5cf6]/10 text-white' : 'border-white/10 text-[#a1a1aa] hover:border-white/20 hover:text-white'}`}
                  data-testid={`preset-${a}`}>
                  ₺{a.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Escrow info */}
            <div className="flex gap-2 p-3 bg-[#8b5cf6]/5 border border-[#8b5cf6]/20 rounded-md">
              <Shield size={14} className="text-[#8b5cf6] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                Yüklediğin kredi sadece platform üzerinde beat, gig ve stüdyo kiralamak için kullanılır.
                Escrow sistemi ile ödemeleriniz güvende tutulur.
              </p>
            </div>

            <button
              onClick={initCheckout}
              disabled={!amount || parseFloat(amount) <= 0}
              className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-40 text-white font-bold py-4 rounded-xl transition-all hover:shadow-glow flex items-center justify-center gap-3 text-base"
              data-testid="proceed-payment-btn"
            >
              <CreditCard size={18} /> ₺{parseFloat(amount || 0).toLocaleString()} Yükle
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div className="rs-card p-12 text-center">
            <Loader size={36} className="text-[#8b5cf6] animate-spin mx-auto mb-4" />
            <p className="text-white font-semibold">Ödeme hazırlanıyor...</p>
          </div>
        )}

        {step === 'form' && checkoutData && (
          <div className="rs-card overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-[#10b981]" />
                <p className="text-sm font-semibold text-white">Güvenli Ödeme</p>
              </div>
              <span className="text-xs font-mono text-[#f59e0b] px-2 py-0.5 rounded bg-[#f59e0b]/10 border border-[#f59e0b]/20">
                {iyzMode === 'live' ? 'IYZICO CANLI' : 'IYZICO SANDBOX'}
              </span>
            </div>
            <div className="p-5">
              <div
                dangerouslySetInnerHTML={{ __html: checkoutData.checkout_form_content }}
                className="iyzico-form"
              />
              {checkoutData.sandbox_mode && (
                <div className="mt-4 p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-md">
                  <p className="text-xs text-[#f59e0b] font-mono text-center">
                    SANDBOX MODU — Gerçek para transferi yapılmaz
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="rs-card p-10 text-center">
            <Check size={48} className="text-[#10b981] mx-auto mb-4" />
            <h2 className="font-heading font-bold text-xl text-white mb-2">Ödeme Başarılı!</h2>
            <p className="text-[#a1a1aa] text-sm mb-6">₺{amount || '—'} cüzdanınıza yüklendi.</p>
            <div className="flex gap-3">
              <button onClick={refreshWallet} className="flex-1 border border-white/10 text-[#a1a1aa] hover:text-white py-2.5 rounded-md text-sm transition-colors flex items-center justify-center gap-2">
                <RefreshCw size={14} /> Bakiyeyi Yenile
              </button>
              <button onClick={() => navigate('/beats')} className="flex-1 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold py-2.5 rounded-md transition-all hover:shadow-glow text-sm">
                Beat Market
              </button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="rs-card p-8 text-center">
            <AlertTriangle size={40} className="text-[#ec4899] mx-auto mb-4" />
            <p className="text-white font-semibold mb-2">Ödeme Başarısız</p>
            <p className="text-[#a1a1aa] text-sm mb-4">{error}</p>
            <button onClick={() => setStep('amount')} className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-6 py-2.5 rounded-md transition-all text-sm">
              Tekrar Dene
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PaymentPage;
