import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Check, CheckCheck, X, Package, Shield, Clock, MessageSquare, Briefcase, Wallet, AlertTriangle, RefreshCw, Music } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const WS_BASE = process.env.REACT_APP_BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://') || 'ws://localhost:8001';

const ICON_MAP = {
  new_message: MessageSquare, order_funded: Shield, order_started: Clock,
  order_delivered: Package, order_completed: CheckCheck, order_disputed: AlertTriangle,
  order_revision: RefreshCw, order_cancelled: X, payment_received: Wallet,
  support_reply: Bell, new_order: Briefcase, beat_approved: Music, gig_approved: Briefcase
};

const COLOR_MAP = {
  order_completed: 'text-[#10b981]', payment_received: 'text-[#10b981]', beat_approved: 'text-[#10b981]',
  order_delivered: 'text-[#06b6d4]', new_order: 'text-[#8b5cf6]', order_funded: 'text-[#f59e0b]',
  order_disputed: 'text-[#ec4899]', order_cancelled: 'text-[#ec4899]', support_reply: 'text-[#8b5cf6]',
};

const NotificationItem = ({ notif, onRead, navigate }) => {
  const Icon = ICON_MAP[notif.type] || Bell;
  const color = COLOR_MAP[notif.type] || 'text-[#a1a1aa]';

  const handleClick = () => {
    onRead(notif.id);
    if (notif.ref_type === 'order' && notif.ref_id) navigate(`/orders/${notif.ref_id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`flex gap-3 px-4 py-3 hover:bg-[#1a1a1f] transition-colors cursor-pointer border-b border-white/5 ${!notif.is_read ? 'bg-[#8b5cf6]/3' : ''}`}
      data-testid={`notif-${notif.id}`}
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-white/5 ${color}`}>
        <Icon size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white leading-snug">{notif.title}</p>
        <p className="text-xs text-[#a1a1aa] mt-0.5 leading-snug truncate">{notif.message}</p>
        <p className="text-[10px] text-[#a1a1aa] mt-1 font-mono">
          {new Date(notif.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {!notif.is_read && (
        <div className="w-2 h-2 rounded-full bg-[#8b5cf6] flex-shrink-0 mt-2 shadow-glow-sm" />
      )}
    </div>
  );
};

const NotificationCenter = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);
  const dropdownRef = useRef(null);
  const headers = { Authorization: `Bearer ${token}` };

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // WebSocket for real-time push
  useEffect(() => {
    if (!token) return;
    const ws = new WebSocket(`${WS_BASE}/ws/notifications?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.event === 'notification') {
          setNotifications(prev => [data.data, ...prev]);
          setUnreadCount(c => c + 1);
        } else if (data.event === 'unread_count') {
          setUnreadCount(data.count);
        } else if (data.event === 'all_read') {
          setUnreadCount(0);
          setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        }
      } catch {}
    };

    return () => { try { ws.close(); } catch {} };
  }, [token]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/notifications?limit=20`, { headers, withCredentials: true });
      setNotifications(res.data || []);
      const unread = (res.data || []).filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user, fetchNotifications]);

  const markRead = async (id) => {
    try {
      await axios.post(`${API}/notifications/${id}/read`, {}, { headers, withCredentials: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await axios.post(`${API}/notifications/read-all`, {}, { headers, withCredentials: true });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifications(); }}
        className="relative p-1.5 rounded-md text-[#a1a1aa] hover:text-white hover:bg-white/5 transition-colors"
        data-testid="notification-bell-btn"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#ec4899] text-white text-[9px] rounded-full flex items-center justify-center font-bold shadow-glow-pink">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 w-80 bg-[#141416] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-up"
          data-testid="notification-panel"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <p className="text-sm font-semibold text-white">Bildirimler</p>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-[#8b5cf6] hover:text-[#7c3aed] transition-colors" data-testid="mark-all-read-btn">
                  Tümünü Oku
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-[#a1a1aa] hover:text-white"><X size={14} /></button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-[#a1a1aa]"><Bell size={20} className="animate-pulse" /></div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10">
                <Bell size={24} className="text-[#a1a1aa] mx-auto mb-2 opacity-30" />
                <p className="text-xs text-[#a1a1aa]">Henüz bildirim yok.</p>
              </div>
            ) : (
              notifications.map(n => (
                <NotificationItem key={n.id} notif={n} onRead={markRead} navigate={navigate} />
              ))
            )}
          </div>
          <div className="px-4 py-2 border-t border-white/5 text-center">
            <button onClick={() => { setOpen(false); navigate('/orders'); }} className="text-xs text-[#a1a1aa] hover:text-white transition-colors">
              Siparişlere Git →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
