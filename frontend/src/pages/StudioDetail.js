import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  MapPin, Star, Clock, Users, Check, ChevronLeft, Loader,
  Calendar, Settings, ChevronRight, Play, Shield
} from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';
import StudioAvailabilityCalendar from '@/components/StudioAvailabilityCalendar';
import StudioOwnerCalendar from '@/components/StudioOwnerCalendar';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StudioDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [studio, setStudio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [photoIdx, setPhotoIdx] = useState(0);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    axios.get(`${API}/studios/${id}`)
      .then(res => setStudio(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center py-24"><Loader size={24} className="text-[#8b5cf6] animate-spin" /></div>
    </Layout>
  );

  if (!studio) return (
    <Layout>
      <div className="text-center py-24 text-[#a1a1aa]">Stüdyo bulunamadı.</div>
    </Layout>
  );

  const isOwner = user?.id === studio.owner_id;
  const photos = studio.photos || [];
  const hourlyNet = studio.hourly_rate || 0;
  const hourlyTotal = studio.total_rate || hourlyNet;
  const commissionRate = ((hourlyTotal - hourlyNet) / hourlyTotal * 100).toFixed(0);

  const TABS = [
    { id: 'info', label: 'Bilgiler', icon: MapPin },
    { id: 'calendar', label: isOwner ? 'Takvim Yönetimi' : 'Rezervasyon', icon: Calendar },
    { id: 'reviews', label: 'Yorumlar', icon: Star },
  ];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <button onClick={() => navigate('/studios')} className="flex items-center gap-2 text-[#a1a1aa] hover:text-white text-sm mb-6 transition-colors">
          <ChevronLeft size={16} /> Stüdyo Market
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left */}
          <div className="lg:col-span-2 space-y-5">
            {/* Photo gallery */}
            <div className="relative rounded-xl overflow-hidden h-64 sm:h-80">
              {photos.length > 0 ? (
                <>
                  <img src={photos[photoIdx]} alt={studio.name} className="w-full h-full object-cover" />
                  {photos.length > 1 && (
                    <div className="absolute bottom-3 right-3 flex gap-1">
                      {photos.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setPhotoIdx(i)}
                          className={`w-2 h-2 rounded-full transition-all ${i === photoIdx ? 'bg-white' : 'bg-white/40'}`}
                        />
                      ))}
                    </div>
                  )}
                  {photos.length > 1 && (
                    <>
                      <button onClick={() => setPhotoIdx(i => Math.max(0, i - 1))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white">
                        <ChevronLeft size={16} />
                      </button>
                      <button onClick={() => setPhotoIdx(i => Math.min(photos.length - 1, i + 1))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white">
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-[#141416] flex items-center justify-center">
                  <MapPin size={48} className="text-[#a1a1aa] opacity-20" />
                </div>
              )}
            </div>

            {/* Studio name + location */}
            <div>
              <h1 className="font-heading font-bold text-2xl text-white mb-1">{studio.name}</h1>
              <div className="flex items-center gap-3 text-sm text-[#a1a1aa]">
                <span className="flex items-center gap-1"><MapPin size={13} /> {studio.address}, {studio.city}</span>
                {studio.rating > 0 && (
                  <span className="flex items-center gap-1"><Star size={13} className="text-[#f59e0b] fill-[#f59e0b]" /> {studio.rating} ({studio.total_reviews})</span>
                )}
                <span className="flex items-center gap-1"><Users size={13} /> Maks {studio.max_capacity} kişi</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-[#141416] border border-white/5 rounded-lg p-1 gap-1">
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-mono uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-[#8b5cf6] text-white' : 'text-[#a1a1aa] hover:text-white'}`}
                    data-testid={`studio-tab-${tab.id}`}>
                    <Icon size={12} /> {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Info tab */}
            {activeTab === 'info' && (
              <div className="space-y-5 animate-fade-up">
                <div className="rs-card p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Hakkında</h3>
                  <p className="text-sm text-[#a1a1aa] leading-relaxed">{studio.description}</p>
                  {studio.rules && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className="text-xs font-mono uppercase text-[#a1a1aa] mb-1">Kurallar</p>
                      <p className="text-xs text-[#a1a1aa]">{studio.rules}</p>
                    </div>
                  )}
                </div>
                {studio.amenities?.length > 0 && (
                  <div className="rs-card p-5">
                    <h3 className="text-sm font-semibold text-white mb-3">Olanaklar</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {studio.amenities.map(a => (
                        <div key={a} className="flex items-center gap-2 text-sm text-[#a1a1aa]">
                          <Check size={12} className="text-[#10b981]" /> {a}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {studio.equipment?.length > 0 && (
                  <div className="rs-card p-5">
                    <h3 className="text-sm font-semibold text-white mb-3">Ekipman</h3>
                    <div className="grid grid-cols-1 gap-1.5">
                      {studio.equipment.map(eq => (
                        <div key={eq} className="flex items-center gap-2 text-sm text-[#a1a1aa]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] flex-shrink-0" />{eq}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Calendar tab */}
            {activeTab === 'calendar' && (
              <div className="animate-fade-up">
                {bookingSuccess && (
                  <div className="mb-4 p-3 bg-[#10b981]/10 border border-[#10b981]/20 rounded-md text-sm text-[#10b981] flex items-center gap-2">
                    <Check size={14} /> Rezervasyonunuz başarıyla oluşturuldu! "Rezervasyonlarım" sayfasından takip edebilirsiniz.
                  </div>
                )}
                {isOwner ? (
                  <StudioOwnerCalendar studio={studio} token={token} />
                ) : user ? (
                  <StudioAvailabilityCalendar
                    studio={studio}
                    token={token}
                    onBookingComplete={() => setBookingSuccess(true)}
                  />
                ) : (
                  <div className="rs-card p-8 text-center">
                    <Calendar size={40} className="text-[#a1a1aa] mx-auto mb-4 opacity-20" />
                    <p className="text-[#a1a1aa] mb-4">Rezervasyon yapmak için giriş yapın.</p>
                    <button onClick={() => navigate('/auth')} className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold px-6 py-2.5 rounded-md transition-all hover:shadow-glow">
                      Giriş Yap
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Reviews tab */}
            {activeTab === 'reviews' && (
              <div className="animate-fade-up">
                {(studio.reviews || []).length === 0 ? (
                  <div className="rs-card p-8 text-center text-[#a1a1aa]">Henüz yorum yok.</div>
                ) : (
                  <div className="space-y-3">
                    {studio.reviews.map((r, i) => (
                      <div key={i} className="rs-card p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center text-xs font-bold text-[#8b5cf6]">
                            {r.reviewer_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <p className="text-sm font-medium text-white">{r.reviewer_name}</p>
                          <div className="flex ml-1">
                            {[...Array(5)].map((_, si) => (
                              <Star key={si} size={10} className={si < r.rating ? 'text-[#f59e0b] fill-[#f59e0b]' : 'text-white/20'} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-[#a1a1aa]">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Booking panel */}
          <div className="space-y-4">
            <div className="rs-card p-5 sticky top-20">
              <div className="text-center mb-4 pb-4 border-b border-white/5">
                <p className="text-3xl font-bold text-white">₺{hourlyTotal.toFixed(0)}</p>
                <p className="text-xs text-[#a1a1aa] mt-1">saatlik · %{commissionRate} platform komisyonu dahil</p>
              </div>
              <div className="space-y-2 mb-4">
                {[
                  { icon: Clock, label: 'Min Kiralama', value: '1 saat' },
                  { icon: MapPin, label: 'Konum', value: studio.city },
                  { icon: Users, label: 'Kapasite', value: `${studio.max_capacity} kişi` },
                  { icon: Star, label: 'Puan', value: studio.rating > 0 ? `${studio.rating}/5.0` : 'Henüz puanlanmadı' },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex justify-between text-sm">
                      <span className="text-[#a1a1aa] flex items-center gap-1.5"><Icon size={12} /> {item.label}</span>
                      <span className="text-white">{item.value}</span>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setActiveTab('calendar')}
                className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold py-3 rounded-md transition-all hover:shadow-glow flex items-center justify-center gap-2"
                data-testid="go-to-calendar-btn"
              >
                <Calendar size={16} /> {user && !isOwner ? 'Rezervasyon Yap' : isOwner ? 'Takvimi Yönet' : 'Tarihleri Seç'}
              </button>
              <div className="mt-3 flex items-center gap-2 text-xs text-[#a1a1aa] justify-center">
                <Shield size={11} className="text-[#f59e0b]" />
                Escrow güvencesi ile güvenli ödeme
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StudioDetail;
