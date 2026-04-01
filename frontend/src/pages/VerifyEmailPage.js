import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, Loader, Mail, RefreshCw } from 'lucide-react';
import axios from 'axios';
import Logo from '@/components/Logo';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState('verifying'); // verifying | success | error | resend
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (user?.email_verified !== false) {
      // Already verified or legacy user
    }
    if (!token) {
      setStatus('no_token');
      return;
    }
    axios.get(`${API}/auth/verify-email?token=${token}`)
      .then(res => {
        if (res.data.verified) setStatus('success');
        else setStatus('error');
      })
      .catch(() => setStatus('error'));
  }, [token]);

  const resendVerification = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setResending(true);
    try {
      await axios.post(`${API}/auth/resend-verification`, { email });
      setResendMsg('Doğrulama e-postası gönderildi. Gelen kutunuzu kontrol edin.');
    } catch (err) {
      setResendMsg(err.response?.data?.detail || 'Hata oluştu');
    } finally { setResending(false); }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center animate-fade-up">
        <div className="flex justify-center mb-6">
          <Logo size="xl" showText={false} glow />
        </div>
        <h1 className="font-heading font-bold text-2xl text-white mb-2">REVERSOUND</h1>

        {status === 'verifying' && (
          <div className="rs-card p-8">
            <Loader size={40} className="text-[#8b5cf6] animate-spin mx-auto mb-4" />
            <p className="text-white font-semibold">E-posta doğrulanıyor...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="rs-card p-8">
            <CheckCircle size={48} className="text-[#10b981] mx-auto mb-4" />
            <h2 className="font-heading font-bold text-xl text-white mb-2">E-posta Doğrulandı!</h2>
            <p className="text-[#a1a1aa] text-sm mb-6">Hesabınız aktive edildi. Şimdi giriş yapabilirsiniz.</p>
            <button
              onClick={() => navigate('/auth')}
              className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold py-3 rounded-md transition-all hover:shadow-glow"
              data-testid="go-login-btn"
            >
              Giriş Yap
            </button>
          </div>
        )}

        {(status === 'error' || status === 'no_token') && (
          <div className="rs-card p-8">
            <XCircle size={48} className="text-[#ec4899] mx-auto mb-4" />
            <h2 className="font-heading font-bold text-xl text-white mb-2">
              {status === 'no_token' ? 'Geçersiz Link' : 'Doğrulama Başarısız'}
            </h2>
            <p className="text-[#a1a1aa] text-sm mb-6">
              Bu link geçersiz veya süresi dolmuş. Yeni bir doğrulama linki isteyin.
            </p>
            <form onSubmit={resendVerification} className="space-y-3">
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="E-posta adresiniz"
                className="rs-input text-sm" data-testid="resend-email-input"
              />
              {resendMsg && (
                <p className={`text-xs ${resendMsg.includes('gönderildi') ? 'text-[#10b981]' : 'text-[#ec4899]'}`}>{resendMsg}</p>
              )}
              <button type="submit" disabled={resending}
                className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-semibold py-3 rounded-md transition-all hover:shadow-glow flex items-center justify-center gap-2"
                data-testid="resend-btn">
                {resending ? <Loader size={16} className="animate-spin" /> : <><RefreshCw size={16} /> Yeni Link İste</>}
              </button>
            </form>
            <button onClick={() => navigate('/auth')} className="mt-3 text-xs text-[#a1a1aa] hover:text-white transition-colors">
              ← Giriş Sayfasına Dön
            </button>
          </div>
        )}

        {/* Resend panel from login */}
        <div className="mt-4">
          <button
            onClick={() => setStatus('error')}
            className="text-xs text-[#a1a1aa] hover:text-[#8b5cf6] transition-colors flex items-center gap-1 mx-auto"
          >
            <Mail size={12} /> E-posta doğrulaması gelmedi mi?
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
