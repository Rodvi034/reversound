import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, CheckCircle, AlertTriangle, XCircle, Shield, Loader, Package } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_CONFIG = {
  funded: { label: 'Fon Tutuldu', color: '#f59e0b', icon: Shield, cls: 'badge-held' },
  in_progress: { label: 'Devam Ediyor', color: '#8b5cf6', icon: Clock, cls: 'bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20' },
  delivered: { label: 'Teslim Edildi', color: '#06b6d4', icon: Package, cls: 'bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/20' },
  completed: { label: 'Tamamlandı', color: '#10b981', icon: CheckCircle, cls: 'badge-released' },
  disputed: { label: 'İtirazda', color: '#ec4899', icon: AlertTriangle, cls: 'badge-disputed' },
  cancelled: { label: 'İptal', color: '#6b7280', icon: XCircle, cls: 'badge-refunded' },
  refunded: { label: 'İade Edildi', color: '#6b7280', icon: XCircle, cls: 'badge-refunded' },
};

const OrderCard = ({ order, userId, onAction }) => {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.funded;
  const StatusIcon = cfg.icon;
  const isBuyer = order.buyer_id === userId;
  const isSeller = order.seller_id === userId;
  const [actionLoading, setActionLoading] = useState('');
  const { token } = useAuth();

  const doAction = async (action, body = {}) => {
    setActionLoading(action);
    try {
      await axios.post(`${API}/orders/${order.id}/${action}`, body,
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      onAction();
    } catch (err) {
      alert(err.response?.data?.detail || 'İşlem başarısız');
    } finally {
      setActionLoading(''); }
  };

  return (
    <div className="rs-card p-5 animate-fade-up" data-testid={`order-card-${order.id}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{order.gig_title}</h3>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            {isBuyer ? `Satıcı: ${order.seller_name}` : `Alıcı: ${order.buyer_name}`}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-mono uppercase flex items-center gap-1.5 flex-shrink-0 ${cfg.cls}`}>
          <StatusIcon size={10} /> {cfg.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-[#0d0d0f] rounded-md">
        <div>
          <p className="text-[10px] font-mono uppercase text-[#a1a1aa]">Fiyat</p>
          <p className="text-sm font-bold text-[#10b981]">₺{order.price}</p>
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase text-[#a1a1aa]">Paket</p>
          <p className="text-sm font-semibold text-white capitalize">{order.tier}</p>
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase text-[#a1a1aa]">Teslim</p>
          <p className="text-sm font-semibold text-white">{order.delivery_days} gün</p>
        </div>
      </div>

      {/* Escrow status bar */}
      <div className="flex items-center gap-2 mb-4 text-xs">
        <Shield size={12} className="text-[#f59e0b]" />
        <span className="text-[#a1a1aa]">Escrow Durumu:</span>
        <span className={order.escrow_status === 'released' ? 'text-[#10b981]' : order.escrow_status === 'refunded' ? 'text-[#a1a1aa]' : 'text-[#f59e0b]'}>
          {order.escrow_status === 'held' ? 'Fon Tutuldu' : order.escrow_status === 'released' ? 'Satıcıya Ödendi' : 'İade Edildi'}
        </span>
      </div>

      {/* Delivery note */}
      {order.delivery_note && (
        <div className="mb-4 p-3 bg-[#06b6d4]/5 border border-[#06b6d4]/20 rounded-md">
          <p className="text-xs font-mono uppercase text-[#06b6d4] mb-1">Teslim Notu</p>
          <p className="text-sm text-white">{order.delivery_note}</p>
          {order.delivery_url && (
            <a href={order.delivery_url} target="_blank" rel="noreferrer"
              className="text-xs text-[#8b5cf6] hover:text-[#7c3aed] mt-1 block">
              Teslim Linki
            </a>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Seller actions */}
        {isSeller && order.status === 'funded' && (
          <DeliverModal orderId={order.id} token={token} onSuccess={onAction} />
        )}
        {/* Buyer actions */}
        {isBuyer && order.status === 'delivered' && (
          <>
            <button
              onClick={() => doAction('approve')}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 text-xs bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/20 px-3 py-2 rounded-md transition-all"
              data-testid={`approve-order-${order.id}`}
            >
              {actionLoading === 'approve' ? <Loader size={12} className="animate-spin" /> : <CheckCircle size={12} />} Onayla & Öde
            </button>
            <DisputeModal orderId={order.id} token={token} onSuccess={onAction} />
          </>
        )}
        {(isBuyer || isSeller) && order.status === 'funded' && (
          <button
            onClick={() => doAction('cancel')}
            disabled={!!actionLoading}
            className="flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-[#ec4899] border border-white/10 hover:border-[#ec4899]/30 px-3 py-2 rounded-md transition-all"
            data-testid={`cancel-order-${order.id}`}
          >
            {actionLoading === 'cancel' ? <Loader size={12} className="animate-spin" /> : <XCircle size={12} />} İptal Et
          </button>
        )}
      </div>
    </div>
  );
};

const DeliverModal = ({ orderId, token, onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const deliver = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/orders/${orderId}/deliver`,
        { delivery_note: note, delivery_url: url },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      setOpen(false);
      onSuccess();
    } catch (err) {
      alert(err.response?.data?.detail || 'Teslimat başarısız');
    } finally { setLoading(false); }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-xs bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/20 px-3 py-2 rounded-md transition-all" data-testid={`deliver-btn-${orderId}`}>
        <Package size={12} /> Teslim Et
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#141416] border border-white/10 rounded-lg p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-white mb-4">Teslimat Bilgileri</h3>
            <div className="space-y-3">
              <textarea rows={3} placeholder="Teslim notunu yaz..." value={note} onChange={e => setNote(e.target.value)} className="rs-input resize-none text-sm" />
              <input type="url" placeholder="Teslim linki (Google Drive, WeTransfer...)" value={url} onChange={e => setUrl(e.target.value)} className="rs-input text-sm" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setOpen(false)} className="flex-1 border border-white/10 text-[#a1a1aa] py-2 rounded-md text-sm">İptal</button>
              <button onClick={deliver} disabled={loading || !note.trim()} className="flex-1 bg-[#8b5cf6] text-white py-2 rounded-md text-sm disabled:opacity-50">
                {loading ? <Loader size={14} className="animate-spin mx-auto" /> : 'Teslim Et'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const DisputeModal = ({ orderId, token, onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const dispute = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/orders/${orderId}/dispute`, { reason },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      setOpen(false);
      onSuccess();
    } catch (err) {
      alert(err.response?.data?.detail || 'İtiraz başarısız');
    } finally { setLoading(false); }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-xs text-[#ec4899] border border-[#ec4899]/20 px-3 py-2 rounded-md hover:bg-[#ec4899]/10 transition-all" data-testid={`dispute-btn-${orderId}`}>
        <AlertTriangle size={12} /> İtiraz Et
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#141416] border border-white/10 rounded-lg p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-white mb-1">İtiraz Aç</h3>
            <p className="text-xs text-[#a1a1aa] mb-4">Fon admin kararına kadar tutulmaya devam eder.</p>
            <textarea rows={4} placeholder="İtiraz sebebini açıkla..." value={reason} onChange={e => setReason(e.target.value)} className="rs-input resize-none text-sm" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setOpen(false)} className="flex-1 border border-white/10 text-[#a1a1aa] py-2 rounded-md text-sm">İptal</button>
              <button onClick={dispute} disabled={loading || !reason.trim()} className="flex-1 bg-[#ec4899] text-white py-2 rounded-md text-sm disabled:opacity-50">
                {loading ? <Loader size={14} className="animate-spin mx-auto" /> : 'İtiraz Gönder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const OrderManagement = () => {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('all');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = view !== 'all' ? `?role=${view}` : '';
      const res = await axios.get(`${API}/orders${params}`,
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      setOrders(res.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [view, token]);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading font-bold text-2xl text-white">Siparişlerim</h1>
          <div className="flex bg-[#141416] border border-white/5 rounded-md p-1 gap-1">
            {['all', 'buyer', 'seller'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-mono uppercase rounded transition-all ${view === v ? 'bg-[#8b5cf6] text-white' : 'text-[#a1a1aa] hover:text-white'}`}
                data-testid={`order-tab-${v}`}
              >
                {v === 'all' ? 'Tümü' : v === 'buyer' ? 'Aldıklarım' : 'Sattıklarım'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader size={24} className="text-[#8b5cf6] animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <Package size={40} className="text-[#a1a1aa] mx-auto mb-4 opacity-30" />
            <p className="text-[#a1a1aa]">Henüz sipariş yok.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <OrderCard key={order.id} order={order} userId={user?.id} onAction={fetchOrders} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default OrderManagement;
