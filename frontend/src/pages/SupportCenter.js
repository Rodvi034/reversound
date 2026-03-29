import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Ticket, Plus, MessageSquare, Clock, CheckCircle, XCircle, Loader, Send } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_CONFIG = {
  open: { label: 'Açık', color: '#f59e0b', icon: Clock },
  in_progress: { label: 'İnceleniyor', color: '#8b5cf6', icon: MessageSquare },
  resolved: { label: 'Çözüldü', color: '#10b981', icon: CheckCircle },
  closed: { label: 'Kapatıldı', color: '#6b7280', icon: XCircle },
};

const CATEGORIES = { payment: 'Ödeme', moderation: 'Moderasyon', technical: 'Teknik', account: 'Hesap', order: 'Sipariş', other: 'Diğer' };

const TicketDetail = ({ ticket, token, onUpdate }) => {
  const { user } = useAuth();
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await axios.post(`${API}/support/tickets/${ticket.id}/reply`,
        { message: reply },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      setReply('');
      onUpdate();
    } catch {} finally { setSending(false); }
  };

  const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const StatusIcon = cfg.icon;

  return (
    <div className="rs-card overflow-hidden">
      <div className="p-5 border-b border-white/5 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">{ticket.subject}</h3>
          <p className="text-xs text-[#a1a1aa] mt-0.5">{CATEGORIES[ticket.category]} · {new Date(ticket.created_at).toLocaleDateString('tr-TR')}</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-mono" style={{ background: `${cfg.color}15`, color: cfg.color }}>
          <StatusIcon size={10} /> {cfg.label}
        </span>
      </div>
      {/* Messages */}
      <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
        {(ticket.messages || []).map((msg, i) => (
          <div key={i} className={`p-4 ${msg.is_admin ? 'bg-[#8b5cf6]/5' : ''}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-white">{msg.sender_name}</span>
              {msg.is_admin && <span className="badge-genre text-[10px] text-[#8b5cf6]">Admin</span>}
              <span className="text-[10px] text-[#a1a1aa] ml-auto">{new Date(msg.created_at).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
            </div>
            <p className="text-sm text-[#a1a1aa]">{msg.content}</p>
          </div>
        ))}
      </div>
      {/* Reply */}
      {ticket.status !== 'closed' && (
        <form onSubmit={sendReply} className="p-4 border-t border-white/5 flex gap-2">
          <input type="text" value={reply} onChange={e => setReply(e.target.value)}
            placeholder="Yanıt yaz..."
            className="rs-input flex-1 text-sm h-9"
            data-testid={`ticket-reply-${ticket.id}`} />
          <button type="submit" disabled={sending || !reply.trim()}
            className="w-9 h-9 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-40 text-white rounded-md flex items-center justify-center">
            {sending ? <Loader size={12} className="animate-spin" /> : <Send size={14} />}
          </button>
        </form>
      )}
    </div>
  );
};

const SupportCenter = () => {
  const { user, token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'technical', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchTickets = async () => {
    try {
      const res = await axios.get(`${API}/support/tickets`, { headers, withCredentials: true });
      setTickets(res.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchTickets(); }, [token]);

  const fetchTicketDetail = async (ticketId) => {
    try {
      const res = await axios.get(`${API}/support/tickets/${ticketId}`, { headers, withCredentials: true });
      setActiveTicket(res.data);
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/support/tickets`, form, { headers, withCredentials: true });
      setTickets(prev => [res.data, ...prev]);
      setShowNew(false);
      setForm({ subject: '', category: 'technical', description: '' });
      setActiveTicket(res.data);
    } catch {} finally { setSubmitting(false); }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading font-bold text-2xl text-white flex items-center gap-2">
              <Ticket size={20} className="text-[#8b5cf6]" /> Destek Merkezi
            </h1>
            <p className="text-xs text-[#a1a1aa]">Ortalama yanıt süresi: &lt; 24 saat</p>
          </div>
          <button onClick={() => setShowNew(s => !s)}
            className="flex items-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-medium px-4 py-2 rounded-md transition-all hover:shadow-glow"
            data-testid="new-ticket-page-btn">
            <Plus size={14} /> Yeni Talep
          </button>
        </div>

        {showNew && (
          <div className="rs-card p-5 mb-6 animate-fade-up">
            <h3 className="text-sm font-semibold text-white mb-4">Yeni Destek Talebi</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Konu *</label>
                  <input required type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    className="rs-input text-sm" placeholder="Sorun başlığı" data-testid="sc-subject" />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Kategori</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="rs-input text-sm">
                    {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Açıklama *</label>
                <textarea required rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Sorunu detaylı anlat..." className="rs-input resize-none text-sm" data-testid="sc-description" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowNew(false)} className="border border-white/10 text-[#a1a1aa] px-4 py-2 rounded-md text-sm">İptal</button>
                <button type="submit" disabled={submitting}
                  className="bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white px-6 py-2 rounded-md text-sm flex items-center gap-2">
                  {submitting ? <Loader size={14} className="animate-spin" /> : 'Gönder'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Tickets list */}
          <div className="space-y-2">
            <p className="text-xs font-mono uppercase text-[#a1a1aa] mb-3">
              {user?.role === 'admin' ? 'Tüm Talepler' : 'Taleplerim'} ({tickets.length})
            </p>
            {loading ? (
              <div className="flex items-center justify-center py-8"><Loader size={18} className="text-[#8b5cf6] animate-spin" /></div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-10 text-[#a1a1aa] text-sm">Henüz talep yok.</div>
            ) : (
              tickets.map(ticket => {
                const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                return (
                  <button
                    key={ticket.id}
                    onClick={() => fetchTicketDetail(ticket.id)}
                    className={`w-full text-left p-3 rounded-md border transition-all ${activeTicket?.id === ticket.id ? 'border-[#8b5cf6] bg-[#8b5cf6]/5' : 'border-white/5 bg-[#141416] hover:border-white/10'}`}
                    data-testid={`ticket-${ticket.id}`}
                  >
                    <p className="text-sm font-medium text-white truncate">{ticket.subject}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-[#a1a1aa]">{CATEGORIES[ticket.category]}</span>
                      <span className="text-xs font-mono" style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Ticket detail */}
          <div className="lg:col-span-2">
            {activeTicket ? (
              <TicketDetail ticket={activeTicket} token={token} onUpdate={() => fetchTicketDetail(activeTicket.id)} />
            ) : (
              <div className="rs-card p-10 text-center">
                <Ticket size={40} className="text-[#a1a1aa] mx-auto mb-4 opacity-20" />
                <p className="text-[#a1a1aa] text-sm">Detayları görmek için bir talep seç.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SupportCenter;
