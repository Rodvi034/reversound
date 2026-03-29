import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Music2, Loader } from 'lucide-react';

const ROLES = [
  { value: 'buyer', label: 'Beat Alıcı', desc: 'Beat satın al, gig kirala' },
  { value: 'producer', label: 'Prodüktör', desc: 'Beat yükle ve sat' },
  { value: 'artist', label: 'Sanatçı', desc: 'Müziğini platforma getir' },
  { value: 'engineer', label: 'Mix Engineer', desc: 'Miksaj ve mastering hizmeti ver' },
  { value: 'designer', label: 'Tasarımcı', desc: 'Kapak tasarımı ve görsel hizmetler' },
];

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, user } = useAuth();

  const [tab, setTab] = useState(searchParams.get('tab') === 'register' ? 'register' : 'login');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ email: '', password: '', name: '', username: '', role: 'buyer' });

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const formatError = (detail) => {
    if (!detail) return 'Bir hata oluştu';
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).join(' ');
    return String(detail);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      navigate('/dashboard');
    } catch (err) {
      setError(formatError(err.response?.data?.detail) || 'Giriş yapılamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const registeredUser = await register(regForm);
      if (!registeredUser.onboarding_complete) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(formatError(err.response?.data?.detail) || 'Kayıt olunamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#8b5cf6] flex items-center justify-center glow-purple">
              <Music2 size={20} className="text-white" />
            </div>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">REVERSOUND</h1>
          <p className="text-[#a1a1aa] text-sm mt-1">Müzik kariyerinin merkezi</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-[#141416] rounded-lg p-1 mb-6 border border-white/5">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === 'login' ? 'bg-[#8b5cf6] text-white shadow-glow-sm' : 'text-[#a1a1aa] hover:text-white'}`}
            onClick={() => { setTab('login'); setError(''); }}
            data-testid="tab-login"
          >
            Giriş Yap
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === 'register' ? 'bg-[#8b5cf6] text-white shadow-glow-sm' : 'text-[#a1a1aa] hover:text-white'}`}
            onClick={() => { setTab('register'); setError(''); }}
            data-testid="tab-register"
          >
            Kayıt Ol
          </button>
        </div>

        <div className="rs-card p-6">
          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm" data-testid="auth-error">
              {error}
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">E-posta</label>
                <input
                  type="email"
                  required
                  className="rs-input"
                  value={loginForm.email}
                  onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="ornek@email.com"
                  data-testid="login-email"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Şifre</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    className="rs-input pr-10"
                    value={loginForm.password}
                    onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    data-testid="login-password"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] hover:text-white">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-semibold py-2.5 rounded-md transition-all hover:shadow-glow flex items-center justify-center gap-2 mt-2"
                data-testid="login-submit-btn"
              >
                {loading ? <Loader size={16} className="animate-spin" /> : 'Giriş Yap'}
              </button>
              <p className="text-center text-xs text-[#a1a1aa] mt-3">
                Test: <span className="text-[#8b5cf6] font-mono">admin@reversound.com</span> / <span className="text-[#8b5cf6] font-mono">Admin123!</span>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Ad Soyad</label>
                  <input
                    type="text"
                    required
                    className="rs-input"
                    value={regForm.name}
                    onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Adın Soyadın"
                    data-testid="register-name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Kullanıcı Adı</label>
                  <input
                    type="text"
                    required
                    className="rs-input"
                    value={regForm.username}
                    onChange={e => setRegForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                    placeholder="kullanici_adi"
                    data-testid="register-username"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">E-posta</label>
                <input
                  type="email"
                  required
                  className="rs-input"
                  value={regForm.email}
                  onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="ornek@email.com"
                  data-testid="register-email"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Şifre</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    minLength={6}
                    className="rs-input pr-10"
                    value={regForm.password}
                    onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="En az 6 karakter"
                    data-testid="register-password"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] hover:text-white">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-2">Rolün Nedir?</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRegForm(f => ({ ...f, role: r.value }))}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md border text-left transition-all ${
                        regForm.role === r.value
                          ? 'border-[#8b5cf6] bg-[#8b5cf6]/10 text-white'
                          : 'border-white/5 bg-[#0d0d0f] text-[#a1a1aa] hover:border-white/10'
                      }`}
                      data-testid={`role-${r.value}`}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{r.label}</p>
                        <p className="text-xs opacity-70">{r.desc}</p>
                      </div>
                      {regForm.role === r.value && (
                        <div className="w-4 h-4 rounded-full bg-[#8b5cf6] flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-semibold py-2.5 rounded-md transition-all hover:shadow-glow flex items-center justify-center gap-2 mt-2"
                data-testid="register-submit-btn"
              >
                {loading ? <Loader size={16} className="animate-spin" /> : 'Ücretsiz Kayıt Ol'}
              </button>
              <p className="text-center text-xs text-[#a1a1aa]">Kayıt olarak, 100 kredi hoş geldin bonusu kazanırsın.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
