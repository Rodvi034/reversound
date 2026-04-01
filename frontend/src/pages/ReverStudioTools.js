import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Zap, Music2, Layers, Headphones, Play, Upload, Loader, Check, Info, ChevronRight } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';
import DragDropZone from '@/components/DragDropZone';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TABS = [
  { id: 'bpm', icon: Music2, label: 'BPM & Key', color: '#8b5cf6', desc: 'Tempo ve ton analizi' },
  { id: 'stems', icon: Layers, label: 'Stem Splitter', color: '#10b981', desc: 'Vokal, davul, bas ayrıştırma' },
  { id: 'master', icon: Headphones, label: 'AI Mastering', color: '#ec4899', desc: 'Streaming standartlarına master' },
];

// BPM/Key Tool
const BpmKeyTool = ({ token }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const analyze = async () => {
    if (!file) return;
    setLoading(true); setError(''); setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/studio-tools/bpm-key`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analiz başarısız');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="rs-card p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Ses Dosyası Yükle</h3>
        <DragDropZone type="audio" label="Analiz için ses dosyası" onFile={setFile} compact />
        {file && <p className="text-xs text-[#10b981] mt-2">Seçildi: {file.name}</p>}
        <button onClick={analyze} disabled={!file || loading}
          className="mt-4 w-full bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-40 text-white font-semibold py-3 rounded-md transition-all hover:shadow-glow flex items-center justify-center gap-2"
          data-testid="analyze-bpm-btn">
          {loading ? <Loader size={16} className="animate-spin" /> : <><Zap size={16} /> Analiz Et</>}
        </button>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>
      {result && (
        <div className="rs-card p-5 animate-fade-up border-[#8b5cf6]/20" data-testid="bpm-result">
          <h3 className="text-sm font-semibold text-[#8b5cf6] mb-4 font-mono uppercase">Analiz Sonuçları</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'BPM', value: result.bpm, color: '#8b5cf6' },
              { label: 'Key', value: result.key, color: '#10b981' },
              { label: 'Mode', value: result.mode, color: '#f59e0b' },
              { label: 'Süre', value: result.duration_seconds ? `${result.duration_seconds}s` : '—', color: '#06b6d4' },
            ].map(s => (
              <div key={s.label} className="p-3 bg-[#0d0d0f] rounded-lg text-center">
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value || '—'}</p>
                <p className="text-[10px] font-mono uppercase text-[#a1a1aa] mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          {result.confidence && <p className="text-xs text-[#a1a1aa] text-center mt-3">Key güven skoru: %{Math.round(result.confidence * 100)}</p>}
        </div>
      )}
    </div>
  );
};

// Stem Splitter Tool
const StemTool = ({ token }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const split = async () => {
    if (!file) return;
    setLoading(true); setError(''); setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'htdemucs');
    try {
      const res = await axios.post(`${API}/studio-tools/stem-split`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ayrıştırma başarısız');
    } finally { setLoading(false); }
  };

  const STEM_COLORS = { vocals: '#ec4899', drums: '#f59e0b', bass: '#10b981', other: '#8b5cf6' };
  const STEM_LABELS = { vocals: 'Vokal', drums: 'Davul', bass: 'Bas', other: 'Enstrüman' };

  return (
    <div className="space-y-5">
      <div className="rs-card p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Stem Ayrıştırma</h3>
        <p className="text-xs text-[#a1a1aa] mb-4">Sesi 4 ayrı parçaya böl: Vokal, Davul, Bas, Enstrüman</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {Object.entries(STEM_LABELS).map(([k, v]) => (
            <div key={k} className="p-3 rounded-lg text-center" style={{ background: `${STEM_COLORS[k]}10`, border: `1px solid ${STEM_COLORS[k]}20` }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1" style={{ background: `${STEM_COLORS[k]}20` }}>
                <Layers size={14} style={{ color: STEM_COLORS[k] }} />
              </div>
              <p className="text-xs font-semibold" style={{ color: STEM_COLORS[k] }}>{v}</p>
            </div>
          ))}
        </div>
        <DragDropZone type="audio" label="Ayrıştırmak istediğin ses dosyası" onFile={setFile} compact />
        {file && <p className="text-xs text-[#10b981] mt-2">Seçildi: {file.name}</p>}
        <button onClick={split} disabled={!file || loading}
          className="mt-4 w-full bg-[#10b981] hover:bg-[#059669] disabled:opacity-40 text-white font-semibold py-3 rounded-md transition-all flex items-center justify-center gap-2"
          data-testid="stem-split-btn">
          {loading ? <Loader size={16} className="animate-spin" /> : <><Layers size={16} /> Stem'lere Böl</>}
        </button>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>
      {result && (
        <div className="rs-card p-5 animate-fade-up" data-testid="stem-result">
          <h3 className="text-sm font-semibold text-white mb-3">{result.mock ? 'Mimari Hazır' : 'Ayrıştırma Tamamlandı'}</h3>
          {result.mock && (
            <div className="flex gap-2 p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-md mb-3">
              <Info size={14} className="text-[#f59e0b] flex-shrink-0" />
              <p className="text-xs text-[#a1a1aa]">
                Stem Splitter mimari hazır. Aktive etmek için Demucs Docker container'ı başlatın ve
                <code className="text-[#8b5cf6] mx-1">STEM_SPLIT_API_URL</code> ortam değişkenini ayarlayın.
              </p>
            </div>
          )}
          <p className="text-xs text-[#a1a1aa]">Model: {result.model_used || result.model} · Job ID: {result.job_id}</p>
        </div>
      )}
    </div>
  );
};

// AI Mastering Tool
const MasterTool = ({ token }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loudness, setLoudness] = useState(-14);

  const PRESETS = [
    { label: 'Spotify', value: -14, desc: '-14 LUFS' },
    { label: 'Apple Music', value: -16, desc: '-16 LUFS' },
    { label: 'YouTube', value: -13, desc: '-13 LUFS' },
    { label: 'Club', value: -8, desc: '-8 LUFS' },
  ];

  const master = async () => {
    if (!file) return;
    setLoading(true); setError(''); setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_loudness', loudness.toString());
    try {
      const res = await axios.post(`${API}/studio-tools/master`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Mastering başarısız');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="rs-card p-5">
        <h3 className="text-sm font-semibold text-white mb-3">AI Mastering</h3>
        <p className="text-xs text-[#a1a1aa] mb-4">Otomatik mastering — streaming standartlarını seç</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {PRESETS.map(p => (
            <button key={p.value} onClick={() => setLoudness(p.value)}
              className={`p-3 rounded-md border text-center transition-all ${loudness === p.value ? 'border-[#ec4899] bg-[#ec4899]/10' : 'border-white/10 hover:border-white/20'}`}>
              <p className="text-sm font-bold text-white">{p.label}</p>
              <p className="text-[10px] text-[#a1a1aa] font-mono">{p.desc}</p>
            </button>
          ))}
        </div>
        <DragDropZone type="audio" label="Master edilecek ses dosyası" onFile={setFile} compact />
        {file && <p className="text-xs text-[#10b981] mt-2">Seçildi: {file.name}</p>}
        <button onClick={master} disabled={!file || loading}
          className="mt-4 w-full bg-[#ec4899] hover:bg-[#be185d] disabled:opacity-40 text-white font-semibold py-3 rounded-md transition-all flex items-center justify-center gap-2"
          data-testid="master-btn">
          {loading ? <Loader size={16} className="animate-spin" /> : <><Headphones size={16} /> Master Et</>}
        </button>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>
      {result && (
        <div className="rs-card p-5 animate-fade-up border-[#ec4899]/20" data-testid="master-result">
          <h3 className="text-sm font-semibold text-white mb-3">Mastering Sonucu</h3>
          {result.mock && (
            <div className="flex gap-2 p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-md mb-3">
              <Info size={14} className="text-[#f59e0b] flex-shrink-0" />
              <p className="text-xs text-[#a1a1aa]">
                Aktive etmek için <code className="text-[#ec4899] mx-1">DOLBY_APP_KEY</code> ve
                <code className="text-[#ec4899] mx-1">DOLBY_APP_SECRET</code> ayarlayın (dolby.io/dashboard).
              </p>
            </div>
          )}
          {result.recommended_settings && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(result.recommended_settings).map(([k, v]) => (
                <div key={k} className="flex justify-between p-2 bg-[#0d0d0f] rounded">
                  <span className="text-[#a1a1aa]">{k.replace(/_/g, ' ')}</span>
                  <span className="text-white font-mono">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ReverStudioTools = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('bpm');

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 rounded-full px-4 py-1.5 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#8b5cf6] animate-pulse" />
            <span className="text-xs text-[#a1a1aa] font-mono uppercase tracking-wider">Rever Studio AI Tools</span>
          </div>
          <h1 className="font-heading font-bold text-3xl text-white mb-2">Stüdyo Araçları</h1>
          <p className="text-[#a1a1aa] text-sm">Profesyonel ses analizi ve üretim araçları</p>
        </div>

        {/* Tab selector */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-4 rounded-xl border text-center transition-all ${activeTab === tab.id ? 'border-current shadow-lg' : 'border-white/10 hover:border-white/20'}`}
                style={{ borderColor: activeTab === tab.id ? tab.color : undefined, background: activeTab === tab.id ? `${tab.color}10` : undefined }}
                data-testid={`tool-tab-${tab.id}`}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3" style={{ background: `${tab.color}15`, border: `1px solid ${tab.color}25` }}>
                  <Icon size={18} style={{ color: tab.color }} />
                </div>
                <p className="text-sm font-semibold text-white">{tab.label}</p>
                <p className="text-[11px] text-[#a1a1aa] mt-0.5">{tab.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Active tool */}
        {activeTab === 'bpm' && <BpmKeyTool token={token} />}
        {activeTab === 'stems' && <StemTool token={token} />}
        {activeTab === 'master' && <MasterTool token={token} />}
      </div>
    </Layout>
  );
};

export default ReverStudioTools;
