import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PenLine, Tag, Plus, Trash2, Loader, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';
import UpsellModal from '@/components/UpsellModal';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CATEGORIES = ['Production Tips', 'Industry News', 'Marketing', 'Tutorial', 'Announcements'];

const CreateBlogPost = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [form, setForm] = useState({ title: '', content: '', category: CATEGORIES[0], cover_image: '', tags: [], published: false });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUpsell, setShowUpsell] = useState(false);

  const canCreate = user?.role === 'admin' || ['pro', 'enterprise'].includes(user?.subscription_tier);

  if (!canCreate) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <PenLine size={40} className="text-[#a1a1aa] mx-auto mb-4 opacity-30" />
          <h2 className="font-heading font-bold text-xl text-white mb-2">Blog Yazısı Oluştur</h2>
          <p className="text-[#a1a1aa] text-sm mb-6">Bu özellik Pro ve Enterprise planlarına özeldir.</p>
          <button onClick={() => setShowUpsell(true)} className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold px-6 py-3 rounded-md transition-all hover:shadow-glow">
            Pro'ya Yükselt
          </button>
          {showUpsell && <UpsellModal featureName="Blog Yazıları" requiredTier="pro" onClose={() => setShowUpsell(false)} />}
        </div>
      </Layout>
    );
  }

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(f => ({ ...f, tags: [...f.tags, tagInput.trim().toLowerCase()] }));
      setTagInput('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/blog`, form, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true
      });
      navigate(`/blog/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Yazı oluşturulamadı');
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/blog')} className="flex items-center gap-2 text-[#a1a1aa] hover:text-white text-sm mb-6 transition-colors">
          <ChevronLeft size={16} /> Blog'a Dön
        </button>
        <h1 className="font-heading font-bold text-2xl text-white mb-6 flex items-center gap-2">
          <PenLine size={20} className="text-[#8b5cf6]" /> Yeni Yazı
        </h1>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-md">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rs-card p-5 space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Başlık *</label>
              <input required type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="rs-input text-sm" placeholder="Başlık..." data-testid="blog-title-input" />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Kategori</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="rs-input text-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Kapak Görseli URL</label>
              <input type="url" value={form.cover_image} onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))}
                className="rs-input text-sm" placeholder="https://..." />
            </div>
          </div>

          <div className="rs-card p-5">
            <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">İçerik *</label>
            <textarea required rows={14} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Yazını buraya yaz..." className="rs-input resize-none text-sm" data-testid="blog-content-input" />
          </div>

          <div className="rs-card p-5 space-y-3">
            <label className="block text-xs font-mono uppercase text-[#a1a1aa]">Etiketler</label>
            <div className="flex gap-2">
              <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="prodüksiyon, trap..." className="rs-input flex-1 text-sm h-9" />
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

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, published: !f.published }))}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md border text-sm transition-all ${form.published ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]' : 'border-white/10 text-[#a1a1aa] hover:border-white/20'}`}
              data-testid="publish-toggle"
            >
              {form.published ? <Eye size={14} /> : <EyeOff size={14} />}
              {form.published ? 'Yayında' : 'Taslak'}
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-semibold py-2.5 rounded-md transition-all hover:shadow-glow flex items-center justify-center gap-2"
              data-testid="create-blog-submit">
              {loading ? <Loader size={16} className="animate-spin" /> : <><PenLine size={16} /> Yayınla</>}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CreateBlogPost;
