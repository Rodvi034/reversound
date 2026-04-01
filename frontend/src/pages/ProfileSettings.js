import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Camera, FileText, Save, Loader, Check, ArrowLeft, Upload } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';
import DragDropZone from '@/components/DragDropZone';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const GENRES = ['Trap', 'Hip-Hop', 'Pop', 'Drill', 'R&B', 'Techno', 'Lo-Fi', 'EDM', 'Rock', 'Afrobeat', 'Reggaeton'];

const ProfileSettings = () => {
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', bio: '', avatar_url: '', genres: [] });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        bio: user.bio || '',
        avatar_url: user.avatar_url || '',
        genres: user.genres || [],
      });
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.patch(`${API}/auth/profile`, form, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true
      });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Kaydedilemedi');
    } finally { setLoading(false); }
  };

  const toggleGenre = (genre) => {
    setForm(f => ({
      ...f,
      genres: f.genres.includes(genre)
        ? f.genres.filter(g => g !== genre)
        : [...f.genres, genre]
    }));
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-[#a1a1aa] hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft size={16} /> Dashboard
        </button>
        <h1 className="font-heading font-bold text-2xl text-white mb-6 flex items-center gap-3">
          <User size={22} className="text-[#8b5cf6]" /> Profil Ayarları
        </h1>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Avatar */}
          <div className="rs-card p-5">
            <h3 className="text-xs font-mono uppercase text-[#a1a1aa] tracking-wider mb-4">Profil Fotoğrafı</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#8b5cf6]/30 flex-shrink-0">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#8b5cf6]/20 flex items-center justify-center text-xl font-bold text-[#8b5cf6]">
                    {user.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white mb-0.5">{user.name}</p>
                <p className="text-xs text-[#8b5cf6] font-mono uppercase">{user.role}</p>
              </div>
            </div>
            <DragDropZone
              type="image"
              label="Yeni profil fotoğrafı"
              hint="JPG, PNG — max 10MB"
              onUploaded={r => setForm(f => ({ ...f, avatar_url: r.url }))}
              uploadEndpoint={`${API}/upload/image`}
              token={token}
              compact
            />
            {form.avatar_url && (
              <div className="mt-2">
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1">Veya URL girin</label>
                <input type="url" value={form.avatar_url} onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))}
                  className="rs-input text-sm h-9" placeholder="https://..." />
              </div>
            )}
          </div>

          {/* Basic info */}
          <div className="rs-card p-5 space-y-4">
            <h3 className="text-xs font-mono uppercase text-[#a1a1aa] tracking-wider">Temel Bilgiler</h3>
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Görünen Ad *</label>
              <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="rs-input text-sm" placeholder="Adın Soyadın" data-testid="profile-name-input" />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Bio</label>
              <textarea rows={4} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Kendinizi tanıtın — müzik tarzınız, deneyiminiz..."
                className="rs-input resize-none text-sm"
                maxLength={300}
                data-testid="profile-bio-input" />
              <p className="text-xs text-[#a1a1aa] text-right mt-1">{form.bio?.length || 0}/300</p>
            </div>
          </div>

          {/* Genres */}
          <div className="rs-card p-5">
            <h3 className="text-xs font-mono uppercase text-[#a1a1aa] tracking-wider mb-3">Müzik Türleri</h3>
            <div className="flex flex-wrap gap-2">
              {GENRES.map(genre => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-all ${
                    form.genres.includes(genre)
                      ? 'bg-[#8b5cf6] text-white shadow-glow-sm'
                      : 'bg-[#0d0d0f] border border-white/10 text-[#a1a1aa] hover:border-[#8b5cf6]/40 hover:text-white'
                  }`}
                  data-testid={`genre-toggle-${genre}`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Read-only info */}
          <div className="rs-card p-5">
            <h3 className="text-xs font-mono uppercase text-[#a1a1aa] tracking-wider mb-3">Hesap Bilgileri</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Kullanıcı Adı', value: `@${user.username}` },
                { label: 'E-posta', value: user.email },
                { label: 'Rol', value: user.role },
                { label: 'Abonelik', value: user.subscription_tier },
              ].map(item => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-[#a1a1aa]">{item.label}</span>
                  <span className="text-white font-mono text-xs">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-md">{error}</div>}

          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/dashboard')}
              className="flex-1 border border-white/10 text-[#a1a1aa] hover:text-white py-3 rounded-xl text-sm transition-colors hover:bg-white/5">
              İptal
            </button>
            <button type="submit" disabled={loading}
              className="flex-2 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-semibold py-3 px-8 rounded-xl transition-all hover:shadow-glow flex items-center justify-center gap-2"
              data-testid="save-profile-btn">
              {loading ? <Loader size={16} className="animate-spin" /> : saved ? <><Check size={16} /> Kaydedildi!</> : <><Save size={16} /> Kaydet</>}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default ProfileSettings;
