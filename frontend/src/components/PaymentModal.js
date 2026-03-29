import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, CreditCard, CheckCircle, XCircle, Loader, ExternalLink, Info } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PaymentModal = ({ orderId, amount, onSuccess, onClose }) => {
  const { token } = useAuth();
  const [step, setStep] = useState('init'); // init | form | processing | success | error
  const [checkoutData, setCheckoutData] = useState(null);
  const [error, setError] = useState('');

  const initCheckout = async () => {
    setStep('processing');
    setError('');
    try {
      const res = await axios.post(`${API}/payment/checkout/init`,
        { order_id: orderId },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      setCheckoutData(res.data);
      setStep('form');
    } catch (err) {
      setError(err.response?.data?.detail || 'Ödeme başlatılamadı');
      setStep('error');
    }
  };

  const mockApprove = async () => {
    if (!checkoutData?.payment_id) return;
    setStep('processing');
    try {
      await axios.get(`${API}/payment/mock-approve/${checkoutData.payment_id}`,
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      setStep('success');
      setTimeout(() => { onSuccess?.(); onClose?.(); }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ödeme onaylanamadı');
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#141416] border border-white/10 rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
        data-testid="payment-modal"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center">
            <Shield size={18} className="text-[#8b5cf6]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Güvenli Ödeme</p>
            <p className="text-xs text-[#a1a1aa]">Iyzico Marketplace Altyapısı</p>
          </div>
        </div>

        {/* Amount */}
        <div className="mb-5 p-3 bg-[#0d0d0f] rounded-md flex items-center justify-between">
          <span className="text-sm text-[#a1a1aa]">Escrow Tutarı</span>
          <span className="text-lg font-bold text-[#10b981]">₺{amount?.toFixed(2)}</span>
        </div>

        {/* Escrow info */}
        <div className="mb-5 flex gap-2 p-3 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-md">
          <Info size={14} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#a1a1aa] leading-relaxed">
            Ödemen escrow'da tutulur. Satıcı teslim ettiğinde ve sen onayladığında, <strong className="text-white">%90</strong> satıcıya aktarılır.
          </p>
        </div>

        {step === 'init' && (
          <button
            onClick={initCheckout}
            className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold py-3 rounded-md transition-all hover:shadow-glow flex items-center justify-center gap-2"
            data-testid="init-payment-btn"
          >
            <CreditCard size={16} /> Ödemeyi Başlat
          </button>
        )}

        {step === 'processing' && (
          <div className="flex items-center justify-center py-4 gap-3 text-[#a1a1aa]">
            <Loader size={18} className="animate-spin text-[#8b5cf6]" />
            <span className="text-sm">İşleniyor...</span>
          </div>
        )}

        {step === 'form' && checkoutData && (
          <div className="space-y-3">
            {/* Mock card input */}
            <div className="space-y-2">
              <input type="text" value="4111 1111 1111 1111" readOnly
                className="rs-input text-sm h-9 opacity-60 cursor-not-allowed" placeholder="Kart Numarası" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value="12/25" readOnly className="rs-input text-sm h-9 opacity-60 cursor-not-allowed" placeholder="AA/YY" />
                <input type="text" value="123" readOnly className="rs-input text-sm h-9 opacity-60 cursor-not-allowed" placeholder="CVV" />
              </div>
            </div>
            <div className="p-2 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-md">
              <p className="text-[10px] text-[#f59e0b] font-mono">TEST MODU — Gerçek ödeme yapılmaz</p>
            </div>
            <button
              onClick={mockApprove}
              className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-semibold py-3 rounded-md transition-all flex items-center justify-center gap-2"
              data-testid="confirm-payment-btn"
            >
              <Shield size={16} /> Ödemeyi Onayla (Mock)
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-4">
            <CheckCircle size={40} className="text-[#10b981] mx-auto mb-3" />
            <p className="text-[#10b981] font-semibold">Ödeme Başarılı!</p>
            <p className="text-xs text-[#a1a1aa] mt-1">Escrow fonlandı. Satıcı çalışmaya başlayabilir.</p>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-3">
            <div className="text-center py-2">
              <XCircle size={32} className="text-[#ec4899] mx-auto mb-2" />
              <p className="text-[#ec4899] text-sm">{error}</p>
            </div>
            <button onClick={() => setStep('init')}
              className="w-full border border-white/10 text-[#a1a1aa] hover:text-white py-2 rounded-md text-sm transition-colors">
              Tekrar Dene
            </button>
          </div>
        )}

        <button onClick={onClose} className="w-full mt-3 text-xs text-[#a1a1aa] hover:text-white transition-colors py-2" data-testid="payment-modal-close">
          Kapat
        </button>
      </div>
    </div>
  );
};

export default PaymentModal;
