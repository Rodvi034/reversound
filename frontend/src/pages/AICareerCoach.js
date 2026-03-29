import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Trash2, Loader, Zap, Music, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';
import FileUpload from '@/components/FileUpload';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const AI_BG = "https://static.prod-images.emergentagent.com/jobs/8d651a01-9aa6-4ca1-8c99-7adb0f65b5e1/images/5511da9ef17cb91e58c9546e4f84d9fc6ec4cb447279bd1f2245e44e021c1504.png";

const STARTER_PROMPTS = [
  'Trap beat prodüksiyonunda nasıl ilerleyebilirim?',
  "Spotify'de daha fazla dinlenme için ne yapmalıyım?",
  'Freelance müzik kariyeri için yol haritası yap',
  'Beat fiyatlandırması nasıl yapılır?',
];

const AICareerCoach = () => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [analysisQuestion, setAnalysisQuestion] = useState('Bu ses dosyasını analiz et ve geri bildirim ver.');
  const [analyzing, setAnalyzing] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/coach/history`, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true })
      .then(res => setMessages(res.data.messages || []))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [token]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: new Date().toISOString(), type: 'text' }]);
    setLoading(true);
    try {
      const res = await axios.post(`${API}/coach/chat`, { message: msg },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response, timestamp: new Date().toISOString(), type: 'text' }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: err.response?.data?.detail || 'AI koça bağlanılamadı.', timestamp: new Date().toISOString(), error: true }]);
    } finally { setLoading(false); }
  };

  const analyzeAudio = async () => {
    if (!uploadedFile) return;
    setAnalyzing(true);
    const analysisMsgText = `[Ses Analizi: ${uploadedFile.original_filename}]\n${analysisQuestion}`;
    setMessages(prev => [...prev, { role: 'user', content: analysisMsgText, timestamp: new Date().toISOString(), type: 'audio_analysis' }]);
    try {
      const res = await axios.post(`${API}/coach/analyze-audio`, {
        storage_path: uploadedFile.storage_path || uploadedFile.url?.split('/files/')[1] || uploadedFile.url,
        filename: uploadedFile.original_filename || 'audio.mp3',
        file_size: uploadedFile.size || 0,
        question: analysisQuestion
      }, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.analysis, timestamp: new Date().toISOString(), type: 'audio_analysis_response', metadata: res.data.metadata }]);
      setShowAnalysis(false);
      setUploadedFile(null);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: err.response?.data?.detail || 'Analiz başarısız.', timestamp: new Date().toISOString(), error: true }]);
    } finally { setAnalyzing(false); }
  };

  const clearHistory = async () => {
    try {
      await axios.delete(`${API}/coach/history`, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      setMessages([]);
    } catch {}
  };

  const hasMessages = messages.length > 0;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h1 className="font-heading font-bold text-xl text-white flex items-center gap-2">
              <Zap size={18} className="text-[#8b5cf6]" /> AI Kariyer Koçu
            </h1>
            <p className="text-xs text-[#a1a1aa]">Gemini 3.1 Pro • Ses Analizi Destekli</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAnalysis(s => !s)}
              className={`flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-md transition-all ${showAnalysis ? 'border-[#8b5cf6] bg-[#8b5cf6]/10 text-[#8b5cf6]' : 'border-white/10 text-[#a1a1aa] hover:text-white'}`}
              data-testid="audio-analysis-toggle"
            >
              <Music size={12} /> Ses Analizi {showAnalysis ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
            {hasMessages && (
              <button onClick={clearHistory}
                className="flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-[#ec4899] border border-white/10 hover:border-[#ec4899]/30 px-3 py-1.5 rounded-md transition-all"
                data-testid="clear-history-btn">
                <Trash2 size={12} /> Temizle
              </button>
            )}
          </div>
        </div>

        {/* Audio Analysis Panel */}
        {showAnalysis && (
          <div className="rs-card p-4 mb-4 flex-shrink-0 border-[#8b5cf6]/20 animate-fade-up">
            <p className="text-xs font-mono uppercase text-[#8b5cf6] mb-3">Ses Dosyası Analizi</p>
            <FileUpload
              type="audio"
              label="Analiz edilecek ses dosyası"
              hint="Demo, mix veya master dosyan olabilir"
              onUploaded={r => setUploadedFile(r)}
            />
            {uploadedFile && (
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={analysisQuestion}
                  onChange={e => setAnalysisQuestion(e.target.value)}
                  placeholder="Ne öğrenmek istiyorsun?"
                  className="rs-input text-sm h-9"
                  data-testid="analysis-question-input"
                />
                <button
                  onClick={analyzeAudio}
                  disabled={analyzing}
                  className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white text-sm font-medium py-2 rounded-md transition-all hover:shadow-glow flex items-center justify-center gap-2"
                  data-testid="analyze-btn"
                >
                  {analyzing ? <Loader size={14} className="animate-spin" /> : <><Zap size={14} /> Analiz Et</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 overflow-hidden rounded-lg border border-white/5 relative mb-4"
          style={{ backgroundImage: `url(${AI_BG})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <div className="absolute inset-0 bg-[#0d0d0f]/85 backdrop-blur-sm rounded-lg" />
          <div className="relative z-10 p-4 space-y-4 h-full overflow-y-auto">
            {fetching ? (
              <div className="flex items-center justify-center h-full"><Loader size={24} className="text-[#8b5cf6] animate-spin" /></div>
            ) : !hasMessages ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center mb-4">
                  <Zap size={28} className="text-[#8b5cf6]" />
                </div>
                <h3 className="font-heading font-bold text-white text-lg mb-2">AI Kariyer Koçun</h3>
                <p className="text-[#a1a1aa] text-sm mb-6 max-w-xs">Müzik kariyerin için sana özel yol haritası hazırlayayım.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
                  {STARTER_PROMPTS.map((p, i) => (
                    <button key={i} onClick={() => sendMessage(p)}
                      className="text-left text-xs text-[#a1a1aa] hover:text-white bg-white/5 hover:bg-[#8b5cf6]/10 border border-white/5 hover:border-[#8b5cf6]/30 px-3 py-2.5 rounded-md transition-all"
                      data-testid={`starter-prompt-${i}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-[#8b5cf6] flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                      {msg.type === 'audio_analysis_response' ? <Music size={10} className="text-white" /> : <Zap size={10} className="text-white" />}
                    </div>
                  )}
                  <div className={`max-w-[82%] rounded-lg px-4 py-3 ${
                    msg.role === 'user' ? 'bg-[#8b5cf6] text-white' :
                    msg.error ? 'bg-red-500/10 border border-red-500/20 text-red-400' :
                    msg.type === 'audio_analysis_response' ? 'bg-[#141416] border border-[#ec4899]/20 text-white' :
                    'bg-[#141416] border border-[#8b5cf6]/20 text-white'
                  }`}>
                    {msg.type === 'audio_analysis' && (
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                        <Music size={12} className="text-[#ec4899]" />
                        <span className="text-xs text-[#ec4899] font-mono uppercase">Ses Analizi</span>
                      </div>
                    )}
                    {msg.metadata && (
                      <div className="mb-2 p-2 bg-white/5 rounded text-xs font-mono text-[#a1a1aa] grid grid-cols-2 gap-1">
                        <span>Format: {msg.metadata.format}</span>
                        <span>Süre: {msg.metadata.duration_str}</span>
                        <span>Bitrate: {msg.metadata.bitrate} kbps</span>
                        <span>Boyut: {msg.metadata.size_mb} MB</span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-white/60' : 'text-[#a1a1aa]'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            {(loading || analyzing) && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#8b5cf6] flex items-center justify-center">
                  <Zap size={10} className="text-white" />
                </div>
                <div className="bg-[#141416] border border-[#8b5cf6]/20 px-4 py-3 rounded-lg flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                  <span className="text-xs text-[#a1a1aa]">{analyzing ? 'Analiz ediliyor...' : 'Düşünüyor...'}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex gap-2 flex-shrink-0">
          <input
            type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder="Kariyer sorun veya hedefin nedir?"
            className="rs-input flex-1 text-sm h-10" disabled={loading}
            data-testid="coach-input"
          />
          <button type="submit" disabled={loading || !input.trim()}
            className="w-10 h-10 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-40 text-white rounded-md transition-all flex items-center justify-center hover:shadow-glow"
            data-testid="coach-send-btn">
            {loading ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default AICareerCoach;
