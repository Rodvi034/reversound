import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Send, MessageSquare, AlertTriangle, Loader } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Messaging = () => {
  const { id: convId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeConv, setActiveConv] = useState(convId || null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/conversations`,
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      setConversations(res.data || []);
    } catch {} finally { setLoadingConvs(false); }
  }, [token]);

  const fetchMessages = useCallback(async (convId) => {
    if (!convId) return;
    setLoadingMsgs(true);
    try {
      const res = await axios.get(`${API}/conversations/${convId}/messages`,
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      setMessages(res.data.messages || []);
    } catch {} finally { setLoadingMsgs(false); }
  }, [token]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (activeConv) { fetchMessages(activeConv); }
  }, [activeConv, fetchMessages]);

  useEffect(() => {
    if (convId) setActiveConv(convId);
  }, [convId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-refresh messages every 5 seconds
  useEffect(() => {
    if (!activeConv) return;
    const interval = setInterval(() => fetchMessages(activeConv), 5000);
    return () => clearInterval(interval);
  }, [activeConv, fetchMessages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv || sending) return;
    setSending(true);
    const content = newMessage;
    setNewMessage('');
    try {
      const res = await axios.post(
        `${API}/conversations/${activeConv}/messages`,
        { content },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      setMessages(prev => [...prev, res.data]);
      if (res.data.warning) {
        // Show moderation warning
        setTimeout(() => {
          setMessages(prev => prev.map(m => m.id === res.data.id ? { ...m, _warning: res.data.warning } : m));
        }, 100);
      }
    } catch (err) {
      // Restore message if failed
      setNewMessage(content);
    } finally { setSending(false); }
  };

  const activeConvData = conversations.find(c => c.id === activeConv);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="font-heading font-bold text-2xl text-white mb-6">Mesajlar</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
          {/* Conversations list */}
          <div className="rs-card overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-xs font-mono uppercase text-[#a1a1aa]">Konuşmalar</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingConvs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader size={18} className="text-[#8b5cf6] animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <MessageSquare size={24} className="text-[#a1a1aa] mx-auto mb-2 opacity-30" />
                  <p className="text-xs text-[#a1a1aa]">Henüz konuşma yok.</p>
                </div>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => { setActiveConv(conv.id); navigate(`/messages/${conv.id}`); }}
                    className={`w-full flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-[#1a1a1f] transition-colors text-left ${activeConv === conv.id ? 'bg-[#8b5cf6]/5 border-l-2 border-l-[#8b5cf6]' : ''}`}
                    data-testid={`conv-${conv.id}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center text-xs font-bold text-[#8b5cf6] flex-shrink-0">
                      {conv.other_user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{conv.other_user?.name || 'Kullanıcı'}</p>
                      <p className="text-xs text-[#a1a1aa] truncate">{conv.last_message || 'Henüz mesaj yok'}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Messages area */}
          <div className="md:col-span-2 rs-card flex flex-col overflow-hidden">
            {!activeConv ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare size={40} className="text-[#a1a1aa] mx-auto mb-3 opacity-20" />
                  <p className="text-[#a1a1aa] text-sm">Bir konuşma seç</p>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center text-xs font-bold text-[#8b5cf6]">
                    {activeConvData?.other_user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{activeConvData?.other_user?.name || 'Kullanıcı'}</p>
                    <p className="text-xs text-[#10b981]">Çevrimiçi</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20 px-3 py-1 rounded-md">
                    <AlertTriangle size={10} />
                    <span className="text-xs font-mono">Kişisel bilgi paylaşımı yasaktır</span>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader size={18} className="text-[#8b5cf6] animate-spin" />
                    </div>
                  ) : messages.map(msg => {
                    const isMine = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-lg px-4 py-2.5 ${
                          msg.is_flagged
                            ? 'bg-[#ec4899]/10 border border-[#ec4899]/20'
                            : isMine
                              ? 'bg-[#8b5cf6] text-white'
                              : 'bg-[#1a1a1f] border border-white/5 text-white'
                        }`}>
                          {msg.is_flagged ? (
                            <div className="flex items-center gap-2">
                              <AlertTriangle size={12} className="text-[#ec4899]" />
                              <p className="text-xs text-[#ec4899]">{msg.content}</p>
                            </div>
                          ) : (
                            <p className="text-sm">{msg.content}</p>
                          )}
                          <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-[#a1a1aa]'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} className="border-t border-white/5 p-3 flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Mesajını yaz... (Kişisel bilgi paylaşma)"
                    className="rs-input flex-1 text-sm h-9"
                    data-testid="message-input"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="w-9 h-9 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-40 text-white rounded-md transition-all flex items-center justify-center flex-shrink-0"
                    data-testid="send-message-btn"
                  >
                    {sending ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Messaging;
