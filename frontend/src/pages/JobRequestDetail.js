import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users, Clock, DollarSign, Star, Shield, CheckCircle, Loader,
  ChevronLeft, User, ArrowRight, Briefcase, Play
} from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ProposalCard = ({ proposal, job, token, onAccepted, isBuyer }) => {
  const [accepting, setAccepting] = useState(false);
  const navigate = useNavigate();

  const accept = async () => {
    setAccepting(true);
    try {
      const res = await axios.post(
        `${API}/job-requests/${job.id}/proposals/${proposal.id}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      onAccepted(res.data.order_id);
    } catch (err) {
      alert(err.response?.data?.detail || 'Kabul başarısız. Lütfen cüzdan bakiyenizi kontrol edin.');
    } finally { setAccepting(false); }
  };

  return (
    <div className="rs-card p-5 flex flex-col h-full hover:border-[#8b5cf6]/20 transition-all" data-testid={`proposal-${proposal.id}`}>
      {/* Seller header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center text-lg font-bold text-[#8b5cf6] flex-shrink-0">
          {proposal.seller_name?.charAt(0)?.toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{proposal.seller_name}</p>
          <button onClick={() => navigate(`/u/${proposal.seller_username}`)} className="text-xs text-[#8b5cf6] hover:text-[#7c3aed] transition-colors">
            @{proposal.seller_username} →
          </button>
        </div>
      </div>

      {/* Metrics comparison */}
      <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-[#0d0d0f] rounded-lg">
        <div className="text-center">
          <p className="text-xl font-bold text-[#10b981]">₺{proposal.price}</p>
          <p className="text-[10px] text-[#a1a1aa] font-mono uppercase">Fiyat</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-white">{proposal.delivery_days}</p>
          <p className="text-[10px] text-[#a1a1aa] font-mono uppercase">Gün</p>
        </div>
      </div>

      {/* Message */}
      <p className="text-sm text-[#a1a1aa] leading-relaxed mb-4 flex-1 line-clamp-4">{proposal.message}</p>

      {/* Seller portfolio */}
      {proposal.gig_id && (
        <button
          onClick={() => navigate(`/gigs/${proposal.gig_id}`)}
          className="flex items-center gap-2 text-xs text-[#8b5cf6] hover:text-[#7c3aed] border border-[#8b5cf6]/20 px-3 py-2 rounded-md hover:bg-[#8b5cf6]/10 transition-all mb-3"
        >
          <Briefcase size={12} /> Portföye Bak <ArrowRight size={10} />
        </button>
      )}

      {/* Accept button */}
      {isBuyer && proposal.status === 'pending' && (
        <button
          onClick={accept}
          disabled={accepting}
          className="w-full bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white font-semibold py-3 rounded-md transition-all flex items-center justify-center gap-2"
          data-testid={`accept-proposal-${proposal.id}`}
        >
          {accepting ? <Loader size={14} className="animate-spin" /> : <><Shield size={14} /> Onayla & Escrow Oluştur</>}
        </button>
      )}
      {proposal.status !== 'pending' && (
        <div className={`text-center text-xs py-2 rounded-md font-mono uppercase ${proposal.status === 'accepted' ? 'text-[#10b981] bg-[#10b981]/10' : 'text-[#a1a1aa] bg-white/5'}`}>
          {proposal.status === 'accepted' ? 'Kabul Edildi' : proposal.status}
        </div>
      )}
    </div>
  );
};

const JobRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(null);

  useEffect(() => {
    axios.get(`${API}/job-requests/${id}`)
      .then(res => setJob(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleAccepted = (orderId) => {
    setAccepted(orderId);
    setTimeout(() => navigate(`/orders/${orderId}`), 2000);
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center py-24"><Loader size={24} className="text-[#8b5cf6] animate-spin" /></div>
    </Layout>
  );

  if (!job) return (
    <Layout>
      <div className="text-center py-24 text-[#a1a1aa]">İş talebi bulunamadı.</div>
    </Layout>
  );

  const isBuyer = user?.id === job.buyer_id;
  const proposals = job.proposals || [];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <button onClick={() => navigate('/jobs')} className="flex items-center gap-2 text-[#a1a1aa] hover:text-white text-sm mb-6 transition-colors">
          <ChevronLeft size={16} /> İş Panosuna Dön
        </button>

        {accepted && (
          <div className="mb-6 p-4 bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl text-center">
            <CheckCircle size={24} className="text-[#10b981] mx-auto mb-2" />
            <p className="text-[#10b981] font-semibold">Teklif kabul edildi! Escrow oluşturuldu.</p>
            <p className="text-xs text-[#a1a1aa] mt-1">Sipariş sayfasına yönlendiriliyorsunuz...</p>
          </div>
        )}

        {/* Job Brief */}
        <div className="rs-card p-6 mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="badge-genre">{job.category}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${job.status === 'open' ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-white/5 text-[#a1a1aa]'}`}>
                  {job.status === 'open' ? 'Açık' : 'Kapatıldı'}
                </span>
              </div>
              <h1 className="font-heading font-bold text-xl text-white mb-2">{job.title}</h1>
              <p className="text-sm text-[#a1a1aa] leading-relaxed max-w-xl">{job.description}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-white/5">
            <div>
              <p className="text-[10px] font-mono uppercase text-[#a1a1aa]">Bütçe Aralığı</p>
              <p className="text-sm font-bold text-[#10b981]">₺{job.budget_min} — ₺{job.budget_max}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-[#a1a1aa]">Max Teslim</p>
              <p className="text-sm font-bold text-white">{job.delivery_days} gün</p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-[#a1a1aa]">Alıcı</p>
              <p className="text-sm font-bold text-white">{job.buyer_name}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-[#a1a1aa]">Teklif Sayısı</p>
              <p className="text-sm font-bold text-[#8b5cf6]">{proposals.length}</p>
            </div>
          </div>
        </div>

        {/* Proposals */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading font-bold text-xl text-white">
            Teklifler ({proposals.length})
          </h2>
          {isBuyer && proposals.length > 1 && (
            <p className="text-xs text-[#a1a1aa]">Yan yana karşılaştır, en iyi teklifi kabul et</p>
          )}
        </div>

        {proposals.length === 0 ? (
          <div className="rs-card p-10 text-center">
            <Users size={40} className="text-[#a1a1aa] mx-auto mb-4 opacity-20" />
            <p className="text-[#a1a1aa]">Henüz teklif gelmedi.</p>
            <p className="text-xs text-[#a1a1aa] mt-1">Freelancerlar yakında teklif gönderecek.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proposals.map(proposal => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                job={job}
                token={token}
                onAccepted={handleAccepted}
                isBuyer={isBuyer}
              />
            ))}
          </div>
        )}

        {/* Info for non-buyers */}
        {!isBuyer && user && proposals.length > 0 && !proposals.find(p => p.seller_id === user.id) && (
          <div className="mt-6 rs-card p-4 text-center border-[#8b5cf6]/20">
            <p className="text-sm text-[#a1a1aa]">Bu talep için henüz teklif vermediniz.</p>
            <button onClick={() => navigate('/jobs')} className="mt-2 text-xs text-[#8b5cf6] hover:text-[#7c3aed] transition-colors">
              ← İş Panosuna Dön ve Teklif Ver
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default JobRequestDetail;
