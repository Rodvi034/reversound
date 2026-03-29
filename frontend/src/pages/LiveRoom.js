import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { Play, Pause, Users, Copy, Check, Radio, Loader, Music2, Volume2 } from 'lucide-react';
import Layout from '@/components/Layout';

const WS_BASE = process.env.REACT_APP_BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://') || 'ws://localhost:8001';
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LiveRoom = () => {
  const { roomId: paramRoomId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { playBeat, togglePlay, isPlaying, currentBeat } = usePlayer();

  const [roomId, setRoomId] = useState(paramRoomId || '');
  const [isHost, setIsHost] = useState(!paramRoomId);
  const [connected, setConnected] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [roomState, setRoomState] = useState(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | connecting | connected | error
  const wsRef = useRef(null);
  const chatEndRef = useRef(null);

  const generatedRoomId = React.useMemo(() =>
    `room-${Math.random().toString(36).substr(2, 8)}`, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const connect = (rid, role) => {
    if (!token) return;
    setStatus('connecting');
    const ws = new WebSocket(`${WS_BASE}/ws/liveroom/${rid}?token=${token}&role=${role}`);
    wsRef.current = ws;

    ws.onopen = () => { setConnected(true); setStatus('connected'); };
    ws.onclose = () => { setConnected(false); setStatus('idle'); };
    ws.onerror = () => setStatus('error');
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === 'room_state') {
          setRoomState(data);
          setListenerCount(data.listener_count);
        } else if (data.type === 'user_joined' || data.type === 'user_left') {
          setListenerCount(data.listener_count);
        } else if (data.type === 'play') {
          // Guest: sync playback
          if (!isHost && roomState?.current_track) {
            // Trigger play in player if not already playing
          }
        } else if (data.type === 'chat') {
          setChatMessages(prev => [...prev, {
            user: data.sender_id?.slice(-6) || 'anon',
            text: data.text,
            isMe: data.sender_id === user?.id
          }]);
        }
      } catch {}
    };
  };

  const sendToRoom = (payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  const handleHostStart = () => {
    const rid = generatedRoomId;
    setRoomId(rid);
    setIsHost(true);
    connect(rid, 'host');
  };

  const handleGuestJoin = () => {
    if (!roomId) return;
    setIsHost(false);
    connect(roomId, 'guest');
  };

  const sendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendToRoom({ type: 'chat', text: chatInput });
    setChatMessages(prev => [...prev, { user: 'Sen', text: chatInput, isMe: true }]);
    setChatInput('');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/liveroom/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!connected && status !== 'connecting') {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center mx-auto mb-4">
              <Radio size={28} className="text-[#8b5cf6]" />
            </div>
            <h1 className="font-heading font-bold text-2xl text-white mb-2">Canlı Oda</h1>
            <p className="text-[#a1a1aa] text-sm">Beat pitch et, müzik dinle, canlı geri bildirim al.</p>
          </div>

          <div className="space-y-4">
            <div className="rs-card p-5">
              <h3 className="text-sm font-semibold text-white mb-1">Yayıncı Ol</h3>
              <p className="text-xs text-[#a1a1aa] mb-4">Beatlerini canlı olarak dinleyicilerle paylaş.</p>
              <button
                onClick={handleHostStart}
                className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-medium py-2.5 rounded-md transition-all hover:shadow-glow text-sm"
                data-testid="host-room-btn"
              >
                Oda Oluştur
              </button>
            </div>

            <div className="rs-card p-5">
              <h3 className="text-sm font-semibold text-white mb-1">Odaya Katıl</h3>
              <p className="text-xs text-[#a1a1aa] mb-3">Oda ID'si ile dinleyici olarak katıl.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomId}
                  onChange={e => setRoomId(e.target.value)}
                  placeholder="Oda ID'si (örn: room-abc123)"
                  className="rs-input flex-1 text-sm h-9"
                  data-testid="room-id-input"
                />
                <button
                  onClick={handleGuestJoin}
                  disabled={!roomId}
                  className="bg-[#141416] hover:bg-[#1a1a1f] border border-white/10 hover:border-[#8b5cf6]/30 text-white text-sm px-4 py-1.5 rounded-md transition-all disabled:opacity-50"
                  data-testid="join-room-btn"
                >
                  Katıl
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Room header */}
        <div className="rs-card p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <div>
              <p className="text-sm font-semibold text-white">
                {isHost ? 'Sen Yayıncısın' : 'Dinleyici Modunda'}
              </p>
              <p className="text-xs text-[#a1a1aa] font-mono">{roomId}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[#a1a1aa]">
              <Users size={14} /> {listenerCount} dinleyici
            </div>
            {isHost && (
              <button onClick={copyLink} className="flex items-center gap-1.5 text-xs border border-white/10 px-3 py-1.5 rounded-md text-[#a1a1aa] hover:text-white hover:border-white/20 transition-all">
                {copied ? <><Check size={12} className="text-[#10b981]" /> Kopyalandı</> : <><Copy size={12} /> Linki Paylaş</>}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Player area */}
          <div className="lg:col-span-2 rs-card p-6 text-center">
            {currentBeat ? (
              <div>
                <div className="w-32 h-32 rounded-xl overflow-hidden mx-auto mb-4 border border-white/10">
                  {currentBeat.cover_url
                    ? <img src={currentBeat.cover_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-[#8b5cf6]/20 flex items-center justify-center"><Music2 size={40} className="text-[#8b5cf6]" /></div>
                  }
                </div>
                <p className="font-heading font-bold text-white text-lg">{currentBeat.title}</p>
                <p className="text-[#a1a1aa] text-sm">{currentBeat.producer_name}</p>
                {isHost && (
                  <button
                    onClick={() => { togglePlay(); sendToRoom({ type: isPlaying ? 'pause' : 'play' }); }}
                    className="mt-4 w-12 h-12 rounded-full bg-[#8b5cf6] hover:bg-[#7c3aed] flex items-center justify-center mx-auto transition-all hover:shadow-glow"
                    data-testid="room-play-btn"
                  >
                    {isPlaying ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white ml-0.5" />}
                  </button>
                )}
              </div>
            ) : (
              <div className="py-10">
                <Music2 size={48} className="text-[#a1a1aa] mx-auto mb-4 opacity-20" />
                <p className="text-[#a1a1aa] text-sm">
                  {isHost ? 'Beat Market\'ten bir beat çalmaya başla.' : 'Yayıncı henüz müzik başlatmadı.'}
                </p>
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="rs-card flex flex-col h-72 lg:h-auto">
            <div className="px-3 py-2 border-b border-white/5">
              <p className="text-xs font-mono uppercase text-[#a1a1aa]">Oda Sohbeti</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`text-xs ${msg.isMe ? 'text-right' : ''}`}>
                  <span className="text-[#a1a1aa]">{msg.user}: </span>
                  <span className={msg.isMe ? 'text-[#8b5cf6]' : 'text-white'}>{msg.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={sendChat} className="p-2 border-t border-white/5 flex gap-2">
              <input
                type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                placeholder="Mesaj..." className="rs-input flex-1 text-xs h-8"
                data-testid="room-chat-input"
              />
              <button type="submit" disabled={!chatInput.trim()}
                className="w-8 h-8 bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/20 rounded-md disabled:opacity-40 flex items-center justify-center">
                <Play size={12} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LiveRoom;
