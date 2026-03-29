import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Loader, ChevronLeft } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CATEGORIES = ['Mixing & Mastering', 'Beat Production', 'Vocal Production', 'Cover Art', 'Music Video', 'Songwriting', 'Distribution', 'PR & Marketing'];

const DEFAULT_TIERS = {
  basic: { price: 150, delivery_days: 3, description: '', revisions: 2, features: [] },
  standard: { price: 300, delivery_days: 5, description: '', revisions: 3, features: [] },
  premium: { price: 600, delivery_days: 7, description: '', revisions: 5, features: [] },
};

const CreateGig = () => {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [form, setForm] = useState({
    title: '', description: '', category: CATEGORIES[0],
    cover_url: '', tags: [],
  });
  const [tiers, setTiers] = useState(DEFAULT_TIERS);
  const [tagInput, setTagInput] = useState('');
  const [featureInput, setFeatureInput] = useState({ basic: '', standard: '', premium: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post(
        `${API}/gigs`,
        { ...form, tiers },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      navigate('/gigs');
    } catch (err) {
      setError(err.response?.data?.detail || 'Gig oluşturulamadı');
    } finally { setLoading(false); }
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(f => ({ ...f, tags: [...f.tags, tagInput.trim().toLowerCase()] }));
      setTagInput('');
    }
  };

  const addFeature = (tier) => {
    const val = featureInput[tier]?.trim();
    if (!val) return;
    setTiers(t => ({ ...t, [tier]: { ...t[tier], features: [...(t[tier].features || []), val] } }));
    setFeatureInput(f => ({ ...f, [tier]: '' }));
  };

  const updateTier = (tier, key, value) => {
    setTiers(t => ({ ...t, [tier]: { ...t[tier], [key]: key === 'price' || key === 'delivery_days' || key === 'revisions' ? parseInt(value) || 0 : value } }));
  };

  const TIER_COLORS = { basic: '#a1a1aa', standard: '#8b5cf6', premium: '#ec4899' };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate('/gigs')} className="flex items-center gap-2 text-[#a1a1aa] hover:text-white text-sm mb-6 transition-colors">
          <ChevronLeft size={16} /> Gig Marketine Dön
        </button>

        <h1 className="font-heading font-bold text-2xl text-white mb-6">Gig Oluştur</h1>

        {error && <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic info */}
          <div className="rs-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">Servis Bilgileri</h3>
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Başlık *</label>
              <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Profesyonel Mixing & Mastering Hizmeti" className="rs-input" data-testid="gig-title-input" />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Kategori *</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="rs-input" data-testid="gig-category-select">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Açıklama *</label>
              <textarea rows={4} required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Hizmetinizi detaylıca açıklayın..." className="rs-input resize-none text-sm" data-testid="gig-description" />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Kapak Görseli URL</label>
              <input type="url" value={form.cover_url} onChange={e => setForm(f => ({ ...f, cover_url: e.target.value }))}
                placeholder="https://..." className="rs-input" data-testid="gig-cover-url" />
            </div>
            {/* Tags */}
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Etiketler</label>
              <div className="flex gap-2 mb-2">
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="mixing, mastering..." className="rs-input flex-1 text-sm h-9" />
                <button type="button" onClick={addTag} className="px-3 py-1.5 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 text-[#8b5cf6] rounded-md hover:bg-[#8b5cf6]/20 transition-colors">
                  <Plus size={14} />
                </button>
              </div>
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
            </div>
          </div>

          {/* Pricing tiers */}
          {['basic', 'standard', 'premium'].map(tierName => (
            <div key={tierName} className="rs-card p-5 space-y-3" style={{ borderColor: `${TIER_COLORS[tierName]}20` }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: TIER_COLORS[tierName] }} />
                <h3 className="text-sm font-semibold font-mono uppercase tracking-wider capitalize" style={{ color: TIER_COLORS[tierName] }}>
                  {tierName} Paket
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1">Fiyat (₺)</label>
                  <input type="number" min={1} value={tiers[tierName].price}
                    onChange={e => updateTier(tierName, 'price', e.target.value)}
                    className="rs-input text-sm h-9" data-testid={`tier-${tierName}-price`} />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1">Teslim (gün)</label>
                  <input type="number" min={1} value={tiers[tierName].delivery_days}
                    onChange={e => updateTier(tierName, 'delivery_days', e.target.value)}
                    className="rs-input text-sm h-9" />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1">Revizyon</label>
                  <input type="number" min={0} value={tiers[tierName].revisions}
                    onChange={e => updateTier(tierName, 'revisions', e.target.value)}
                    className="rs-input text-sm h-9" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1">Açıklama</label>
                <input type="text" value={tiers[tierName].description}
                  onChange={e => updateTier(tierName, 'description', e.target.value)}
                  placeholder={`${tierName} paketi açıklaması...`}
                  className="rs-input text-sm h-9" data-testid={`tier-${tierName}-desc`} />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Özellikler</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={featureInput[tierName]} onChange={e => setFeatureInput(f => ({ ...f, [tierName]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature(tierName))}
                    placeholder="Özellik ekle..." className="rs-input flex-1 text-sm h-8" />
                  <button type="button" onClick={() => addFeature(tierName)} className="px-2 bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[#8b5cf6] rounded-md hover:bg-[#8b5cf6]/20">
                    <Plus size={12} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(tiers[tierName].features || []).map((f, i) => (
                    <span key={i} className="badge-genre flex items-center gap-1">
                      {f}
                      <button type="button" onClick={() => setTiers(t => ({ ...t, [tierName]: { ...t[tierName], features: t[tierName].features.filter((_, j) => j !== i) } }))} className="hover:text-[#ec4899]">
                        <Trash2 size={8} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-semibold py-3 rounded-md transition-all hover:shadow-glow flex items-center justify-center gap-2"
            data-testid="create-gig-submit"
          >
            {loading ? <Loader size={16} className="animate-spin" /> : <><Plus size={16} /> Gig Oluştur</>}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default CreateGig;
