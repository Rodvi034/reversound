import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  ChevronLeft, Shield, Clock, CheckCircle, Package, AlertTriangle,
  XCircle, RefreshCw, Send, Paperclip, Loader, Wifi, WifiOff, FileText
} from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';
import FileUpload from '@/components/FileUpload';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const WS_BASE = process.env.REACT_APP_BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://') || 'ws://localhost:8001';

const STEPS = [
  { key: 'funded', label: 'Ödendi', icon: Shield },
  { key: 'in_progress', label: 'Üretimde', icon: Clock },
  { key: 'delivered', label: 'Teslim Edildi', icon: Package },
  { key: 'completed', label: 'Tamamlandı', icon: CheckCircle },
];

const STATUS_STEP = {
  funded: 0, in_progress: 1, delivered: 2, completed: 3,
  disputed: 2, cancelled: -1, refunded: -1, revision_requested: 1
};

const ProgressTracker = ({ status }) => {
  const currentStep = STATUS_STEP[status] ?? 0;
  const isNegative = status === 'cancelled' || status === 'refunded';

  return (
    <div className="rs-card p-5">
      <p className="text-xs font-mono uppercase text-[#a1a1aa] mb-4">Süreç Takibi</p>
      {isNegative ? (
        <div className="flex items-center gap-2 text-[#a1a1aa]">
          <XCircle size={16} className="text-[#ec4899]" />
          <span className="text-sm capitalize">{status === 'cancelled' ? 'İptal Edildi' : 'İade Edildi'}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const done = i < currentStep;
            const active = i === currentStep;
            const disputed = status === 'disputed' && i === 2;
            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    disputed ? 'bg-[#ec4899]/20 border border-[#ec4899]' :
                    done ? 'bg-[#10b981] border border-[#10b981]' :
                    active ? 'bg-[#8b5cf6]/20 border border-[#8b5cf6] shadow-glow-sm' :
                    'bg-white/5 border border-white/10'
                  }`}>
                    <Icon size={14} className={disputed ? 'text-[#ec4899]' : done ? 'text-white' : active ? 'text-[#8b5cf6]' : 'text-[#a1a1aa]'} />
                  </div>
                  <p className={`text-[9px] mt-1 font-mono ${active ? 'text-[#8b5cf6]' : done ? 'text-[#10b981]' : 'text-[#a1a1aa]'}`}>
                    {step.label}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 ${done ? 'bg-[#10b981]' : 'bg-white/10'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
      {status === 'disputed' && (
        <div className="mt-3 flex items-center gap-2 text-xs text-[#ec4899]">
          <AlertTriangle size={12} /> Admin inceliyor — En geç 24 saat içinde çözülecek
        </div>
      )}
    </div>
  );
};

const OrderDetail = () => {
  const { id: orderId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [showDeliver, setShowDeliver] = useState(false);
  const [showRevision, setShowRevision] = useState(false);
  const [deliverForm, setDeliverForm] = useState({ delivery_note: '', delivery_url: '' });
  const [revisionReason, setRevisionReason] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const convIdRef = useRef(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchOrder = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/orders/${orderId}`, { headers, withCredentials: true });
      setOrder(res.data);
      return res.data;
    } catch { return null; } finally { setLoading(false); }
  }, [orderId, token]);

  const getOrCreateOrderConv = useCallback(async (ord) => {
    if (!ord) return null;
    try {
      // Find conversation linked to this order
      const convRes = await axios.post(`${API}/conversations`,
        { participant_id: user.id === ord.buyer_id ? ord.seller_id : ord.buyer_id, order_id: orderId },
        { headers, withCredentials: true }
      );
      return convRes.data.id;
    } catch { return null; }
  }, [orderId, token, user]);

  const fetchMessages = useCallback(async (convId) => {
    if (!convId) return;
    try {
      const res = await axios.get(`${API}/conversations/${convId}/messages`, { headers, withCredentials: true });
      setMessages(res.data.messages || []);
    } catch {}
  }, [token]);

  const connectWS = useCallback((convId) => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (!convId || !token) return;
    const ws = new WebSocket(`${WS_BASE}/ws/conversations/${convId}?token=${token}`);
    wsRef.current = ws;
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      } catch {}
    };
  }, [token]);

  useEffect(() => {
    fetchOrder().then(ord => {
      if (ord) {
        getOrCreateOrderConv(ord).then(convId => {
          convIdRef.current = convId;
          if (convId) { fetchMessages(convId); connectWS(convId); }
        });
      }
    });
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [fetchOrder, getOrCreateOrderConv, fetchMessages, connectWS]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMsg = (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ content: newMsg }));
    setNewMsg('');
  };

  const doAction = async (action, body = {}) => {
    setActionLoading(action);
    try {
      await axios.post(`${API}/orders/${orderId}/${action}`, body, { headers, withCredentials: true });
      await fetchOrder();
      setShowDeliver(false);
      setShowRevision(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'İşlem başarısız');
    } finally { setActionLoading(''); }
  };

  const addAttachment = async (fileResult) => {
    try {
      await axios.post(`${API}/orders/${orderId}/attachments`,
        { file_url: fileResult.url, filename: fileResult.original_filename || 'file', file_type: 'audio' },
        { headers, withCredentials: true });
      await fetchOrder();
    } catch {}
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center py-24">
        <Loader size={24} className="text-[#8b5cf6] animate-spin" />
      </div>
    </Layout>
  );

  if (!order) return (
    <Layout>
      <div className="text-center py-24 text-[#a1a1aa]">Sipariş bulunamadı.</div>
    </Layout>
  );

  const isBuyer = order.buyer_id === user?.id;
  const isSeller = order.seller_id === user?.id;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <button onClick={() => navigate('/orders')} className="flex items-center gap-2 text-[#a1a1aa] hover:text-white text-sm mb-6 transition-colors">
          <ChevronLeft size={16} /> Siparişlerime Dön
        </button>

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading font-bold text-xl text-white">{order.gig_title}</h1>
            <p className="text-xs text-[#a1a1aa] mt-0.5">
              {isBuyer ? `Satıcı: ${order.seller_name}` : `Alıcı: ${order.buyer_name}`}
              {' '} • ₺{order.price} • {order.tier} paket
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Seller actions */}
            {isSeller && order.status === 'funded' && (
              <button onClick={() => doAction('start')} disabled={!!actionLoading}
                className="flex items-center gap-1.5 text-xs bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/20 px-3 py-2 rounded-md transition-all"
                data-testid="start-order-btn">
                <Clock size={12} /> {actionLoading === 'start' ? <Loader size={10} className="animate-spin" /> : 'Başlat'}
              </button>
            )}
            {isSeller && (order.status === 'in_progress' || order.status === 'funded') && (
              <button onClick={() => setShowDeliver(true)} disabled={!!actionLoading}
                className="flex items-center gap-1.5 text-xs bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-3 py-2 rounded-md transition-all"
                data-testid="deliver-btn">
                <Package size={12} /> Teslim Et
              </button>
            )}
            {/* Buyer actions */}
            {isBuyer && order.status === 'delivered' && (
              <>
                <button onClick={() => doAction('approve')} disabled={!!actionLoading}
                  className="flex items-center gap-1.5 text-xs bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/20 px-3 py-2 rounded-md transition-all"
                  data-testid="approve-btn">
                  <CheckCircle size={12} /> {actionLoading === 'approve' ? <Loader size={10} className="animate-spin" /> : 'Onayla & Öde'}
                </button>
                <button onClick={() => setShowRevision(true)} disabled={!!actionLoading || order.revisions_used >= order.revisions}
                  className="flex items-center gap-1.5 text-xs text-[#f59e0b] border border-[#f59e0b]/20 px-3 py-2 rounded-md hover:bg-[#f59e0b]/10 transition-all disabled:opacity-40"
                  data-testid="revision-btn">
                  <RefreshCw size={12} /> Revizyon ({order.revisions_used || 0}/{order.revisions})
                </button>
              </>
            )}
            {(isBuyer || isSeller) && ['funded', 'in_progress'].includes(order.status) && (
              <button onClick={() => doAction('cancel')} disabled={!!actionLoading}
                className="flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-[#ec4899] border border-white/10 hover:border-[#ec4899]/30 px-3 py-2 rounded-md transition-all"
                data-testid="cancel-order-btn">
                <XCircle size={12} /> İptal
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left: Progress + Details */}
          <div className="lg:col-span-2 space-y-4">
            <ProgressTracker status={order.status} />

            {/* Order info */}
            <div className="rs-card p-5 space-y-3">
              <p className="text-xs font-mono uppercase text-[#a1a1aa]">Sipariş Detayları</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#0d0d0f] rounded-md">
                  <p className="text-[10px] font-mono uppercase text-[#a1a1aa]">Fiyat</p>
                  <p className="text-sm font-bold text-[#10b981]">₺{order.price}</p>
                </div>
                <div className="p-3 bg-[#0d0d0f] rounded-md">
                  <p className="text-[10px] font-mono uppercase text-[#a1a1aa]">Escrow</p>
                  <p className="text-sm font-semibold text-[#f59e0b]">{order.escrow_status === 'held' ? 'Tutuldu' : order.escrow_status === 'released' ? 'Ödendi' : 'İade'}</p>
                </div>
                <div className="p-3 bg-[#0d0d0f] rounded-md">
                  <p className="text-[10px] font-mono uppercase text-[#a1a1aa]">Teslim</p>
                  <p className="text-sm font-semibold text-white">{order.delivery_days} gün</p>
                </div>
                <div className="p-3 bg-[#0d0d0f] rounded-md">
                  <p className="text-[10px] font-mono uppercase text-[#a1a1aa]">Revizyon</p>
                  <p className="text-sm font-semibold text-white">{order.revisions_used || 0}/{order.revisions}</p>
                </div>
              </div>
              <div className="p-3 bg-[#0d0d0f] rounded-md">
                <p className="text-[10px] font-mono uppercase text-[#a1a1aa] mb-1">Gereksinimler</p>
                <p className="text-xs text-white">{order.requirements}</p>
              </div>
            </div>

            {/* Delivery */}
            {order.delivery_note && (
              <div className="rs-card p-4 border-[#8b5cf6]/20">
                <p className="text-xs font-mono uppercase text-[#8b5cf6] mb-2">Teslim Notu</p>
                <p className="text-sm text-white">{order.delivery_note}</p>
                {order.delivery_url && (
                  <a href={order.delivery_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#8b5cf6] hover:text-[#7c3aed] mt-2 transition-colors">
                    <FileText size={12} /> Dosyayı Görüntüle
                  </a>
                )}
              </div>
            )}

            {/* Attachments */}
            <div className="rs-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-mono uppercase text-[#a1a1aa]">Dosyalar</p>
                <button onClick={() => setShowAttach(s => !s)} className="text-xs text-[#8b5cf6] hover:text-[#7c3aed]" data-testid="attach-file-btn">
                  + Ekle
                </button>
              </div>
              {showAttach && (
                <div className="mb-3">
                  <FileUpload type="audio" label="Dosya Ekle" onUploaded={(r) => { addAttachment(r); setShowAttach(false); }} />
                </div>
              )}
              {(order.attachments || []).length === 0 ? (
                <p className="text-xs text-[#a1a1aa]">Henüz dosya eklenmemiş.</p>
              ) : (
                <div className="space-y-2">
                  {order.attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <FileText size={12} className="text-[#8b5cf6]" />
                      <a href={att.file_url} target="_blank" rel="noreferrer" className="text-white hover:text-[#8b5cf6] transition-colors truncate">
                        {att.filename}
                      </a>
                      <span className="text-[#a1a1aa] ml-auto">{att.uploader_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Integrated Chat */}
          <div className="lg:col-span-3 rs-card flex flex-col h-[500px]">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <p className="text-xs font-mono uppercase text-white">Sipariş Sohbeti</p>
              <div className="flex items-center gap-1.5 text-xs">
                {wsConnected
                  ? <><Wifi size={10} className="text-[#10b981]" /><span className="text-[#10b981]">Canlı</span></>
                  : <><WifiOff size={10} className="text-[#a1a1aa]" /><span className="text-[#a1a1aa]">Bağlanıyor</span></>
                }
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8 text-[#a1a1aa] text-xs">
                  Sipariş sohbetini başlatın. Tüm iletişim burada kayıt altındadır.
                </div>
              )}
              {messages.map((msg, i) => {
                const isMine = msg.sender_id === user?.id;
                return (
                  <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 ${isMine ? 'bg-[#8b5cf6] text-white' : 'bg-[#1a1a1f] border border-white/5 text-white'}`}>
                      {!isMine && <p className="text-[10px] text-[#a1a1aa] mb-1">{msg.sender_name}</p>}
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-[#a1a1aa]'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMsg} className="border-t border-white/5 p-3 flex gap-2">
              <input
                type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)}
                placeholder={wsConnected ? "Mesaj yaz..." : "Bağlanıyor..."}
                disabled={!wsConnected}
                className="rs-input flex-1 text-sm h-9"
                data-testid="order-chat-input"
              />
              <button type="submit" disabled={!wsConnected || !newMsg.trim()}
                className="w-9 h-9 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-40 text-white rounded-md transition-all flex items-center justify-center"
                data-testid="order-chat-send">
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>

        {/* Deliver Modal */}
        {showDeliver && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#141416] border border-white/10 rounded-lg p-6 w-full max-w-sm mx-4">
              <h3 className="font-semibold text-white mb-4">Teslimat Bilgileri</h3>
              <div className="space-y-3">
                <textarea rows={3} placeholder="Teslim notunu yaz..." value={deliverForm.delivery_note}
                  onChange={e => setDeliverForm(f => ({ ...f, delivery_note: e.target.value }))}
                  className="rs-input resize-none text-sm" />
                <input type="url" placeholder="Teslim linki (opsiyonel)" value={deliverForm.delivery_url}
                  onChange={e => setDeliverForm(f => ({ ...f, delivery_url: e.target.value }))}
                  className="rs-input text-sm h-9" />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowDeliver(false)} className="flex-1 border border-white/10 text-[#a1a1aa] py-2 rounded-md text-sm">İptal</button>
                <button onClick={() => doAction('deliver', deliverForm)} disabled={!deliverForm.delivery_note.trim() || !!actionLoading}
                  className="flex-1 bg-[#8b5cf6] text-white py-2 rounded-md text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {actionLoading === 'deliver' ? <Loader size={12} className="animate-spin" /> : 'Teslim Et'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Revision Modal */}
        {showRevision && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#141416] border border-white/10 rounded-lg p-6 w-full max-w-sm mx-4">
              <h3 className="font-semibold text-white mb-1">Revizyon Talebi</h3>
              <p className="text-xs text-[#a1a1aa] mb-4">Kalan hak: {order.revisions - (order.revisions_used || 0)}</p>
              <textarea rows={3} placeholder="Neyin değiştirilmesini istiyorsun?" value={revisionReason}
                onChange={e => setRevisionReason(e.target.value)} className="rs-input resize-none text-sm" />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowRevision(false)} className="flex-1 border border-white/10 text-[#a1a1aa] py-2 rounded-md text-sm">İptal</button>
                <button onClick={() => doAction('revision', { reason: revisionReason })} disabled={!revisionReason.trim() || !!actionLoading}
                  className="flex-1 bg-[#f59e0b] text-white py-2 rounded-md text-sm disabled:opacity-50 flex items-center justify-center">
                  {actionLoading === 'revision' ? <Loader size={12} className="animate-spin" /> : 'Gönder'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default OrderDetail;
