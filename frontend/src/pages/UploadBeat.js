import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, Plus, Trash2, Loader, ChevronLeft } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const GENRES = ['Trap', 'Hip-Hop', 'Pop', 'Drill', 'R&B', 'Techno', 'Lo-Fi', 'EDM', 'Rock', 'Afrobeat', 'Reggaeton', 'Other'];
const KEYS = ['C', 'Cm', 'C#', 'C#m', 'D', 'Dm', 'D#', 'D#m', 'E', 'Em', 'F', 'Fm', 'F#', 'F#m', 'G', 'Gm', 'G#', 'G#m', 'A', 'Am', 'A#', 'A#m', 'B', 'Bm'];

const DEFAULT_LICENSES = [
  { type: 'basic', price: 25, rights: 'Non-exclusive MP3 lease' },
  { type: 'premium', price: 75, rights: 'Non-exclusive WAV + stems' },
  { type: 'exclusive', price: 350, rights: 'Full exclusive rights + contract' },
];

const UploadBeat = () => {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [form, setForm] = useState({
    title: '', genre: 'Trap', bpm: 140, key: 'Am',
    description: '', audio_url: '', cover_url: '',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [licenses, setLicenses] = useState(DEFAULT_LICENSES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post(
        `${API}/beats`,
        { ...form, licenses },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      setSuccess('Beat başarıyla yüklendi! İnceleme sonrası yayına alınacak.');
      setTimeout(() => navigate('/beats'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Beat yüklenemedi');
    } finally { setLoading(false); }
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(f => ({ ...f, tags: [...f.tags, tagInput.trim().toLowerCase()] }));
      setTagInput('');
    }
  };

  const updateLicense = (i, key, value) => {
    setLicenses(prev => prev.map((l, idx) => idx === i ? { ...l, [key]: key === 'price' ? parseFloat(value) : value } : l));
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate('/beats')} className="flex items-center gap-2 text-[#a1a1aa] hover:text-white text-sm mb-6 transition-colors">
          <ChevronLeft size={16} /> Beat Marketine Dön
        </button>

        <h1 className="font-heading font-bold text-2xl text-white mb-6">Beat Yükle</h1>

        {error && <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 rounded-md bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] text-sm">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic info */}
          <div className="rs-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">Beat Bilgileri</h3>
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Başlık *</label>
              <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Dark Trap 808" className="rs-input" data-testid="beat-title-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Tür *</label>
                <select value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
                  className="rs-input" data-testid="beat-genre-select">
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Key *</label>
                <select value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
                  className="rs-input" data-testid="beat-key-select">
                  {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">BPM *</label>
              <input type="number" required min={40} max={300} value={form.bpm}
                onChange={e => setForm(f => ({ ...f, bpm: parseInt(e.target.value) }))}
                className="rs-input" data-testid="beat-bpm-input" />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Açıklama</label>
              <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Beat hakkında açıklama..." className="rs-input resize-none text-sm" data-testid="beat-description" />
            </div>
          </div>

          {/* Audio & Cover */}
          <div className="rs-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">Medya</h3>
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Ses Dosyası URL * (MP3/WAV)</label>
              <input type="url" required value={form.audio_url} onChange={e => setForm(f => ({ ...f, audio_url: e.target.value }))}
                placeholder="https://..." className="rs-input" data-testid="beat-audio-url" />
              <p className="text-xs text-[#a1a1aa] mt-1">Ses dosyanı Google Drive, Dropbox veya S3'te barındır.</p>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Kapak Görseli URL</label>
              <input type="url" value={form.cover_url} onChange={e => setForm(f => ({ ...f, cover_url: e.target.value }))}
                placeholder="https://..." className="rs-input" data-testid="beat-cover-url" />
            </div>
          </div>

          {/* Tags */}
          <div className="rs-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">Etiketler</h3>
            <div className="flex gap-2">
              <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="trap, dark, 808..." className="rs-input flex-1 text-sm h-9" data-testid="beat-tag-input" />
              <button type="button" onClick={addTag} className="px-3 py-1.5 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 text-[#8b5cf6] rounded-md text-sm hover:bg-[#8b5cf6]/20 transition-colors">
                <Plus size={14} />
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.tags.map(tag => (
                  <span key={tag} className="badge-genre flex items-center gap-1">
                    #{tag}
                    <button type="button" onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))} className="hover:text-[#ec4899]">
                      <Trash2 size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* License tiers */}
          <div className="rs-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">Lisans Fiyatları</h3>
            {licenses.map((lic, i) => (
              <div key={lic.type} className="grid grid-cols-3 gap-3 p-3 bg-[#0d0d0f] rounded-md">
                <div>
                  <p className="text-xs font-mono uppercase text-[#a1a1aa] mb-1">Tip</p>
                  <p className="text-sm font-semibold text-[#8b5cf6] capitalize">{lic.type}</p>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1">Fiyat (₺)</label>
                  <input type="number" min={1} value={lic.price}
                    onChange={e => updateLicense(i, 'price', e.target.value)}
                    className="rs-input text-sm h-8" />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1">Haklar</label>
                  <input type="text" value={lic.rights}
                    onChange={e => updateLicense(i, 'rights', e.target.value)}
                    className="rs-input text-sm h-8" />
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-semibold py-3 rounded-md transition-all hover:shadow-glow flex items-center justify-center gap-2"
            data-testid="upload-beat-submit"
          >
            {loading ? <Loader size={16} className="animate-spin" /> : <><Upload size={16} /> Beat Yükle</>}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default UploadBeat;
