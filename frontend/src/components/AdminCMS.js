import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Layout as LayoutIcon, Image, Type, Users, Megaphone, Save, RefreshCw,
  Plus, Trash2, Loader, Check, Eye, Music2, ChevronDown, ChevronUp
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Section = ({ title, icon: Icon, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rs-card overflow-hidden mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#1a1a1f] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#8b5cf6]/10 flex items-center justify-center">
            <Icon size={15} className="text-[#8b5cf6]" />
          </div>
          <p className="text-sm font-semibold text-white">{title}</p>
        </div>
        {open ? <ChevronUp size={16} className="text-[#a1a1aa]" /> : <ChevronDown size={16} className="text-[#a1a1aa]" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-white/5">{children}</div>}
    </div>
  );
};

const Field = ({ label, value, onChange, type = 'text', placeholder = '' }) => (
  <div className="mb-4">
    <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">{label}</label>
    {type === 'textarea' ? (
      <textarea rows={3} value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className="rs-input resize-none text-sm" />
    ) : (
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className="rs-input text-sm h-9" />
    )}
  </div>
);

const AdminCMS = ({ token }) => {
  const [cms, setCms] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    axios.get(`${API}/cms`)
      .then(res => { setCms(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      await axios.put(`${API}/cms`, cms, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true
      });
      setSaveMsg('Kaydedildi!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveMsg('Kaydetme başarısız');
    } finally { setSaving(false); }
  };

  const reset = async () => {
    if (!window.confirm('CMS içeriği varsayılanlara sıfırlansın mı?')) return;
    try {
      await axios.post(`${API}/cms/reset`, {}, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      const res = await axios.get(`${API}/cms`);
      setCms(res.data);
      setSaveMsg('Sıfırlandı!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch {}
  };

  const updateField = (path: string, value: any) => {
    const keys = path.split('.');
    setCms(prev => {
      const next = { ...prev };
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  if (loading) return <div className="flex items-center justify-center py-8"><Loader size={18} className="text-[#8b5cf6] animate-spin" /></div>;
  if (!cms) return <div className="text-center py-8 text-[#a1a1aa]">CMS yüklenemedi.</div>;

  return (
    <div className="space-y-3">
      {/* Save bar */}
      <div className="flex items-center justify-between p-4 bg-[#141416] rounded-lg border border-white/5 mb-6">
        <div>
          <p className="text-sm font-semibold text-white">Ana Sayfa İçerik Yönetimi</p>
          <p className="text-xs text-[#a1a1aa]">Değişiklikler anında yayına girer</p>
        </div>
        <div className="flex items-center gap-2">
          {saveMsg && <span className={`text-xs ${saveMsg.includes('başarısız') ? 'text-[#ec4899]' : 'text-[#10b981]'}`}>{saveMsg}</span>}
          <button onClick={reset} className="flex items-center gap-1.5 text-xs border border-white/10 text-[#a1a1aa] hover:text-white px-3 py-2 rounded-md transition-colors">
            <RefreshCw size={12} /> Sıfırla
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 text-xs bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-4 py-2 rounded-md transition-all disabled:opacity-50"
            data-testid="cms-save-btn">
            {saving ? <Loader size={12} className="animate-spin" /> : <Save size={12} />} Kaydet
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <Section title="Hero Bölümü" icon={Type} defaultOpen>
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Ana Başlık" value={cms.hero?.title} onChange={v => updateField('hero.title', v)} placeholder="İLK HİTİN BURADA BAŞLIYOR" />
          <Field label="Rozet Metni" value={cms.hero?.badge_text} onChange={v => updateField('hero.badge_text', v)} placeholder="Türkiye'nin Müzik Platformu" />
          <Field label="Alt Başlık" type="textarea" value={cms.hero?.subtitle} onChange={v => updateField('hero.subtitle', v)} />
          <Field label="CTA Birincil" value={cms.hero?.cta_primary_text} onChange={v => updateField('hero.cta_primary_text', v)} />
          <Field label="Arka Plan Video URL (MP4)" value={cms.hero?.background_video_url} onChange={v => updateField('hero.background_video_url', v)} placeholder="https://..." />
        </div>
      </Section>

      {/* Stats */}
      <Section title="İstatistikler" icon={Users}>
        <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['beats', 'producers', 'freelancers', 'satisfaction'].map(key => (
            <Field key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={cms.stats?.[key]} onChange={v => updateField(`stats.${key}`, v)} placeholder={key === 'satisfaction' ? '98%' : '12K+'} />
          ))}
        </div>
      </Section>

      {/* Genre Cards */}
      <Section title="Tür Kartları" icon={Music2}>
        <div className="pt-4 space-y-3">
          {(cms.genres || []).map((genre, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 p-3 bg-[#0d0d0f] rounded-md">
              <input type="text" value={genre.name || ''} onChange={e => { const g = [...cms.genres]; g[i] = { ...g[i], name: e.target.value }; updateField('genres', g); }}
                className="rs-input text-xs h-8" placeholder="TRAP" />
              <input type="color" value={genre.color || '#8b5cf6'} onChange={e => { const g = [...cms.genres]; g[i] = { ...g[i], color: e.target.value }; updateField('genres', g); }}
                className="rs-input text-xs h-8 cursor-pointer" />
              <input type="url" value={genre.image_url || ''} onChange={e => { const g = [...cms.genres]; g[i] = { ...g[i], image_url: e.target.value }; updateField('genres', g); }}
                className="rs-input text-xs h-8 col-span-1" placeholder="Image URL" />
              <button onClick={() => updateField('genres', cms.genres.filter((_, j) => j !== i))}
                className="text-[#ec4899] hover:bg-[#ec4899]/10 rounded-md transition-colors flex items-center justify-center">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button onClick={() => updateField('genres', [...(cms.genres || []), { name: '', color: '#8b5cf6', image_url: '' }])}
            className="flex items-center gap-2 text-xs text-[#8b5cf6] hover:text-[#7c3aed] transition-colors">
            <Plus size={12} /> Tür Ekle
          </button>
        </div>
      </Section>

      {/* Announcement Banner */}
      <Section title="Duyuru Bandı" icon={Megaphone}>
        <div className="pt-4 space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-xs font-mono uppercase text-[#a1a1aa]">Aktif</label>
            <button
              onClick={() => updateField('announcement.enabled', !cms.announcement?.enabled)}
              className={`w-10 h-5 rounded-full transition-all ${cms.announcement?.enabled ? 'bg-[#10b981]' : 'bg-white/10'}`}
              data-testid="announcement-toggle"
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-0.5 ${cms.announcement?.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <Field label="Duyuru Metni" value={cms.announcement?.text} onChange={v => updateField('announcement.text', v)} placeholder="Büyük indirim! Tüm beatler %30 indirimli." />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Link URL" value={cms.announcement?.link_url} onChange={v => updateField('announcement.link_url', v)} placeholder="/subscriptions" />
            <Field label="Link Metni" value={cms.announcement?.link_text} onChange={v => updateField('announcement.link_text', v)} placeholder="İndirimden Yararlan →" />
          </div>
        </div>
      </Section>

      {/* Testimonials */}
      <Section title="Yorumlar / Testimonials" icon={Users}>
        <div className="pt-4 space-y-3">
          {(cms.testimonials || []).map((t, i) => (
            <div key={i} className="p-3 bg-[#0d0d0f] rounded-md space-y-2">
              <input type="text" value={t.quote || ''} onChange={e => { const arr = [...cms.testimonials]; arr[i] = { ...arr[i], quote: e.target.value }; updateField('testimonials', arr); }}
                className="rs-input text-xs h-8 w-full" placeholder="Kullanıcı yorumu..." />
              <div className="grid grid-cols-3 gap-2">
                <input type="text" value={t.name || ''} onChange={e => { const arr = [...cms.testimonials]; arr[i] = { ...arr[i], name: e.target.value }; updateField('testimonials', arr); }}
                  className="rs-input text-xs h-8" placeholder="Ad" />
                <input type="text" value={t.role || ''} onChange={e => { const arr = [...cms.testimonials]; arr[i] = { ...arr[i], role: e.target.value }; updateField('testimonials', arr); }}
                  className="rs-input text-xs h-8" placeholder="Rol" />
                <button onClick={() => updateField('testimonials', cms.testimonials.filter((_, j) => j !== i))}
                  className="text-[#ec4899] hover:bg-[#ec4899]/10 rounded-md transition-colors flex items-center justify-center">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          <button onClick={() => updateField('testimonials', [...(cms.testimonials || []), { quote: '', name: '', role: '', avatar: '' }])}
            className="flex items-center gap-2 text-xs text-[#8b5cf6] transition-colors">
            <Plus size={12} /> Yorum Ekle
          </button>
        </div>
      </Section>
    </div>
  );
};

export default AdminCMS;
