import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Briefcase, Clock, Loader, ChevronRight, Users, Send, Filter } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';
import { SkeletonCard } from '@/components/SkeletonLoader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CATEGORIES = ['All', 'Mixing & Mastering', 'Beat Production', 'Vocal Production', 'Cover Art', 'Music Video', 'Songwriting', 'Other'];

const JobBoard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: CATEGORIES[1], budget_min: 100, budget_max: 500, delivery_days: 7, genres: [] });
  const [activeJob, setActiveJob] = useState(null);
  const [proposal, setProposal] = useState({ message: '', price: '', delivery_days: 7 });
  const [submittingProposal, setSubmittingProposal] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: 'open' });
      if (category !== 'All') params.append('category', category);
      const res = await axios.get(`${API}/job-requests?${params}`);
      setJobs(res.data.requests || []);
      setTotal(res.data.total || 0);
    } catch {} finally { setLoading(false); }
  }, [category]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const createJob = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await axios.post(`${API}/job-requests`, form, { headers, withCredentials: true });
      setJobs(prev => [res.data, ...prev]);
      setShowCreate(false);
      setForm({ title: '', description: '', category: CATEGORIES[1], budget_min: 100, budget_max: 500, delivery_days: 7, genres: [] });
    } catch (err) {
      alert(err.response?.data?.detail || 'Talep oluşturulamadı');
    } finally { setCreating(false); }
  };

  const submitProposal = async (jobId) => {
    setSubmittingProposal(true);
    try {
      await axios.post(`${API}/job-requests/${jobId}/proposals`,
        { ...proposal, price: parseFloat(proposal.price) },
        { headers, withCredentials: true }
      );
      alert('Teklifiniz gönderildi!');
      setActiveJob(null);
      setProposal({ message: '', price: '', delivery_days: 7 });
    } catch (err) {
      alert(err.response?.data?.detail || 'Teklif gönderilemedi');
    } finally { setSubmittingProposal(false); }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading font-bold text-2xl text-white flex items-center gap-2">
              <Users size={20} className="text-[#8b5cf6]" /> İş Talep Panosu
            </h1>
            <p className="text-[#a1a1aa] text-sm mt-0.5">{total} açık proje talebi</p>
          </div>
          {user && (
            <button
              onClick={() => setShowCreate(s => !s)}
              className="flex items-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-medium px-4 py-2 rounded-md transition-all hover:shadow-glow"
              data-testid="create-job-btn"
            >
              <Plus size={14} /> Talep Oluştur
            </button>
          )}
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="rs-card p-5 mb-6 animate-fade-up border-[#8b5cf6]/20">
            <h3 className="text-sm font-semibold text-white mb-4">Yeni Proje Talebi</h3>
            <form onSubmit={createJob} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Proje Başlığı *</label>
                <input required type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="rs-input text-sm" placeholder="Trap single için mix/master gerekiyor" data-testid="job-title-input" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Kategori</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="rs-input text-sm">
                  {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Teslim Süresi (Gün)</label>
                <input type="number" min={1} value={form.delivery_days} onChange={e => setForm(f => ({ ...f, delivery_days: parseInt(e.target.value) }))} className="rs-input text-sm h-9" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Min. Bütçe (₺)</label>
                <input type="number" value={form.budget_min} onChange={e => setForm(f => ({ ...f, budget_min: parseFloat(e.target.value) }))} className="rs-input text-sm h-9" data-testid="job-budget-min" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Max. Bütçe (₺)</label>
                <input type="number" value={form.budget_max} onChange={e => setForm(f => ({ ...f, budget_max: parseFloat(e.target.value) }))} className="rs-input text-sm h-9" data-testid="job-budget-max" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Açıklama *</label>
                <textarea required rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Projenizi detaylıca açıklayın..." className="rs-input resize-none text-sm" data-testid="job-description" />
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="border border-white/10 text-[#a1a1aa] px-4 py-2 rounded-md text-sm">İptal</button>
                <button type="submit" disabled={creating}
                  className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-6 py-2 rounded-md text-sm flex items-center gap-2 disabled:opacity-50">
                  {creating ? <Loader size={14} className="animate-spin" /> : 'Talep Yayınla'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-all ${category === cat ? 'bg-[#8b5cf6] text-white' : 'bg-[#141416] border border-white/5 text-[#a1a1aa] hover:text-white'}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Jobs list */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-[#a1a1aa]">Bu kategoride talep yok.</div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="rs-card p-5 hover:border-[#8b5cf6]/20 transition-all" data-testid={`job-${job.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge-genre">{job.category}</span>
                      <span className="text-xs text-[#a1a1aa]">{job.buyer_name}</span>
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1">{job.title}</h3>
                    <p className="text-sm text-[#a1a1aa] line-clamp-2">{job.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[#a1a1aa]">
                      <span className="text-[#10b981] font-bold">₺{job.budget_min} — ₺{job.budget_max}</span>
                      <span className="flex items-center gap-1"><Clock size={10} /> {job.delivery_days} gün</span>
                      <span className="flex items-center gap-1"><Users size={10} /> {job.proposals_count} teklif</span>
                    </div>
                  </div>
                  {user && job.buyer_id !== user.id && (
                    <button
                      onClick={() => setActiveJob(activeJob === job.id ? null : job.id)}
                      className="flex items-center gap-1.5 bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/20 px-3 py-2 rounded-md text-xs transition-all flex-shrink-0"
                      data-testid={`propose-${job.id}`}
                    >
                      <Send size={12} /> Teklif Ver
                    </button>
                  )}
                </div>

                {/* Proposal form */}
                {activeJob === job.id && (
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1">Fiyat (₺) *</label>
                        <input type="number" value={proposal.price} onChange={e => setProposal(p => ({ ...p, price: e.target.value }))}
                          className="rs-input text-sm h-9" placeholder="250" data-testid="proposal-price" />
                      </div>
                      <div>
                        <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1">Teslim (gün)</label>
                        <input type="number" value={proposal.delivery_days} onChange={e => setProposal(p => ({ ...p, delivery_days: parseInt(e.target.value) }))}
                          className="rs-input text-sm h-9" />
                      </div>
                    </div>
                    <textarea rows={2} value={proposal.message} onChange={e => setProposal(p => ({ ...p, message: e.target.value }))}
                      placeholder="Neden sen? Deneyimini ve yaklaşımını anlat..." className="rs-input resize-none text-sm" data-testid="proposal-message" />
                    <button onClick={() => submitProposal(job.id)} disabled={submittingProposal || !proposal.price || !proposal.message}
                      className="bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white text-sm px-4 py-2 rounded-md flex items-center gap-2">
                      {submittingProposal ? <Loader size={12} className="animate-spin" /> : 'Teklifi Gönder'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default JobBoard;
