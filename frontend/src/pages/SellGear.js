import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Loader, ChevronLeft } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';
import DragDropZone from '@/components/DragDropZone';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CATEGORIES = { guitars: 'Gitarlar', synths: 'Synth/Klavye', microphones: 'Mikrofonlar', studio: 'Stüdyo Ekipmanı', effects: 'Efektler', drums: 'Davul', dj: 'DJ Ekipmanı', other: 'Diğer' };
const CONDITIONS = ['Sıfır', 'Sıfır Gibi', 'İyi', 'Orta', 'Parça İçin'];

const SellGear = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [form, setForm] = useState({ title: '', description: '', price: '', category: 'guitars', brand: '', condition: 'İyi', city: '', is_negotiable: true, images: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imgUrl, setImgUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post(`${API}/gear`, { ...form, price: parseFloat(form.price) }, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true
      });
      navigate('/gear');
    } catch (err) {
      setError(err.response?.data?.detail || 'İlan oluşturulamadı');
    } finally { setLoading(false); }
  };

  const addImg = () => {
    if (imgUrl.trim() && !form.images.includes(imgUrl.trim())) {
      setForm(f => ({ ...f, images: [...f.images, imgUrl.trim()] }));
      setImgUrl('');
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 py-6">
        <button onClick={() => navigate('/gear')} className="flex items-center gap-2 text-[#a1a1aa] hover:text-white text-sm mb-6 transition-colors">
          <ChevronLeft size={16} /> Gear Market
        </button>
        <h1 className="font-heading font-bold text-2xl text-white mb-6">İlan Ver</h1>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-md">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rs-card p-5 space-y-4">
            <h3 className="text-xs font-mono uppercase text-[#a1a1aa] tracking-wider">Alet Bilgileri</h3>
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Başlık *</label>
              <input required type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="rs-input text-sm" placeholder="Gibson Les Paul Standard 2020" data-testid="gear-title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Kategori</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="rs-input text-sm">
                  {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Durum</label>
                <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} className="rs-input text-sm">
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Marka *</label>
                <input required type="text" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                  className="rs-input text-sm h-9" placeholder="Gibson, Fender..." data-testid="gear-brand" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Şehir *</label>
                <input required type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  className="rs-input text-sm h-9" placeholder="İstanbul" data-testid="gear-city" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Açıklama *</label>
              <textarea required rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Aletin durumu, ne kadar kullanıldı, ne ile birlikte geliyor..." className="rs-input resize-none text-sm" data-testid="gear-description" />
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Fiyat (₺) *</label>
                <input required type="number" min={1} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  className="rs-input text-sm h-9" placeholder="5000" data-testid="gear-price" />
              </div>
              <label className="flex items-center gap-2 text-sm text-[#a1a1aa] cursor-pointer pb-1">
                <input type="checkbox" checked={form.is_negotiable} onChange={e => setForm(f => ({ ...f, is_negotiable: e.target.checked }))}
                  className="accent-[#8b5cf6]" />
                Pazarlık
              </label>
            </div>
          </div>

          {/* Photos */}
          <div className="rs-card p-5 space-y-3">
            <h3 className="text-xs font-mono uppercase text-[#a1a1aa] tracking-wider">Fotoğraflar</h3>
            <div className="flex gap-2">
              <input type="url" value={imgUrl} onChange={e => setImgUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addImg())}
                placeholder="Fotoğraf URL ekle..." className="rs-input flex-1 text-sm h-9" />
              <button type="button" onClick={addImg} className="px-3 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 text-[#8b5cf6] rounded-md hover:bg-[#8b5cf6]/20">
                <Plus size={14} />
              </button>
            </div>
            {form.images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {form.images.map((url, i) => (
                  <div key={i} className="relative rounded-md overflow-hidden h-24 group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }))}
                      className="absolute top-1 right-1 w-5 h-5 bg-[#ec4899] rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-semibold py-3 rounded-md transition-all hover:shadow-glow flex items-center justify-center gap-2"
            data-testid="gear-submit">
            {loading ? <Loader size={16} className="animate-spin" /> : <><Plus size={16} /> İlanı Yayınla</>}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default SellGear;
