import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/i18nContext';
import { HelpCircle, X, Plus, MessageSquare, Ticket, ExternalLink, Loader } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES_TR = {
  payment: 'Ödeme', moderation: 'Moderasyon', technical: 'Teknik',
  account: 'Hesap', order: 'Sipariş', other: 'Diğer'
};

const SupportWidget = () => {
  const { user, token } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState('menu'); // menu | new | tickets
  const [form, setForm] = useState({ subject: '', category: 'technical', description: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API}/support/tickets`, form,
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      setSuccess('Destek talebiniz alındı. En kısa sürede yanıt alacaksınız.');
      setForm({ subject: '', category: 'technical', description: '' });
      setTimeout(() => { setSuccess(''); setView('menu'); }, 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Talep gönderilemedi');
    } finally { setLoading(false); }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${open ? 'bg-[#ec4899] rotate-90' : 'bg-[#8b5cf6] hover:bg-[#7c3aed] hover:shadow-glow'}`}
        data-testid="support-widget-btn"
      >
        {open ? <X size={20} className="text-white" /> : <HelpCircle size={20} className="text-white" />}
      </button>

      {/* Widget panel */}
      {open && (
        <div
          className="fixed bottom-36 right-4 md:bottom-24 md:right-6 z-40 w-80 bg-[#141416] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-up"
          data-testid="support-widget-panel"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.1))' }}>
            <div>
              <p className="text-sm font-semibold text-white">Destek Merkezi</p>
              <p className="text-xs text-[#a1a1aa]">Genellikle &lt; 24 saat yanıt</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          </div>

          <div className="p-4">
            {view === 'menu' && (
              <div className="space-y-2">
                <button
                  onClick={() => setView('new')}
                  className="w-full flex items-center gap-3 p-3 bg-[#0d0d0f] hover:bg-[#1a1a1f] border border-white/5 hover:border-[#8b5cf6]/30 rounded-md transition-all text-left"
                  data-testid="new-ticket-btn"
                >
                  <Plus size={16} className="text-[#8b5cf6]" />
                  <div>
                    <p className="text-sm text-white">Yeni Destek Talebi</p>
                    <p className="text-xs text-[#a1a1aa]">Sorun bildir veya yardım iste</p>
                  </div>
                </button>
                <button
                  onClick={() => { navigate('/support'); setOpen(false); }}
                  className="w-full flex items-center gap-3 p-3 bg-[#0d0d0f] hover:bg-[#1a1a1f] border border-white/5 hover:border-white/10 rounded-md transition-all text-left"
                  data-testid="view-tickets-btn"
                >
                  <Ticket size={16} className="text-[#a1a1aa]" />
                  <div>
                    <p className="text-sm text-white">Taleplerim</p>
                    <p className="text-xs text-[#a1a1aa]">Mevcut destek taleplerim</p>
                  </div>
                </button>
                <div className="pt-2 border-t border-white/5">
                  <p className="text-xs text-[#a1a1aa] mb-2">Sık Sorulan Sorular</p>
                  {['Escrow nasıl çalışır?', 'Siparişimi nasıl iptal ederim?', 'Bakiye yükleyemiyorum'].map(q => (
                    <button
                      key={q}
                      className="w-full text-left text-xs text-[#a1a1aa] hover:text-white py-1.5 transition-colors"
                      onClick={() => { setForm(f => ({ ...f, subject: q, description: q + ' hakkında yardım istiyorum.' })); setView('new'); }}
                    >
                      → {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {view === 'new' && (
              <form onSubmit={handleSubmit} className="space-y-3">
                <button type="button" onClick={() => setView('menu')} className="text-xs text-[#a1a1aa] hover:text-white transition-colors">
                  ← Geri
                </button>
                {success && <div className="p-2 bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] text-xs rounded-md">{success}</div>}
                {error && <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-md">{error}</div>}
                <div>
                  <input
                    required type="text" value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Konu *"
                    className="rs-input text-sm h-9"
                    data-testid="ticket-subject"
                  />
                </div>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="rs-input text-sm h-9"
                  data-testid="ticket-category"
                >
                  {Object.entries(CATEGORIES_TR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <textarea
                  required rows={3} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Sorunu detaylı anlat... *"
                  className="rs-input resize-none text-sm"
                  data-testid="ticket-description"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white text-sm font-medium py-2 rounded-md transition-all flex items-center justify-center gap-2"
                  data-testid="ticket-submit-btn"
                >
                  {loading ? <Loader size={14} className="animate-spin" /> : 'Talebi Gönder'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SupportWidget;
