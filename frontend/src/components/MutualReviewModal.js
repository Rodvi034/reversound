import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Star, X, Loader, Check, User } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StarRating = ({ value, onChange }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map(n => (
      <button
        key={n}
        type="button"
        onClick={() => onChange(n)}
        className="transition-transform hover:scale-110"
        data-testid={`star-${n}`}
      >
        <Star
          size={28}
          fill={n <= value ? '#f59e0b' : 'none'}
          className={n <= value ? 'text-[#f59e0b]' : 'text-[#a1a1aa]'}
        />
      </button>
    ))}
  </div>
);

const ROLE_LABELS = {
  buyer: 'Alıcı olarak',
  seller: 'Satıcı olarak',
  renter: 'Kiracı olarak',
  owner: 'Stüdyo sahibi olarak',
};

const MutualReviewModal = ({ review, onClose, onDone }) => {
  const { token } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) { setError('Lütfen bir yorum yazın'); return; }
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API}/reviews/submit`, {
        [review.type === 'order' ? 'order_id' : 'reservation_id']: review.id,
        reviewee_id: review.other_party_id,
        rating,
        comment: comment.trim(),
        reviewer_role: review.reviewer_role,
      }, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      onDone?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Değerlendirme gönderilemedi');
    } finally { setLoading(false); }
  };

  const roleText = ROLE_LABELS[review.reviewer_role] || review.reviewer_role;
  const TARGET_LABELS = { buyer: 'Satıcı', seller: 'Alıcı', renter: 'Stüdyo Sahibi', owner: 'Kiracı' };
  const targetLabel = TARGET_LABELS[review.reviewer_role] || 'Kullanıcı';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      data-testid="mutual-review-modal"
    >
      <div
        className="bg-[#141416] border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4 animate-fade-up shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-heading font-bold text-lg text-white">Değerlendirme</h3>
            <p className="text-xs text-[#a1a1aa]">{review.title}</p>
          </div>
          <button onClick={onClose} className="text-[#a1a1aa] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Who are we rating? */}
        <div className="flex items-center gap-3 p-4 bg-[#0d0d0f] rounded-xl mb-5">
          <div className="w-10 h-10 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center text-sm font-bold text-[#8b5cf6]">
            {review.other_party_name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{review.other_party_name}</p>
            <p className="text-xs text-[#a1a1aa]">{targetLabel} — {roleText} değerlendiriyorsunuz</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Stars */}
          <div className="mb-5 text-center">
            <p className="text-xs font-mono uppercase text-[#a1a1aa] mb-3">Puan</p>
            <div className="flex justify-center">
              <StarRating value={rating} onChange={setRating} />
            </div>
            <p className="text-xs text-[#f59e0b] mt-2 font-semibold">
              {rating === 5 ? 'Mükemmel' : rating === 4 ? 'Çok İyi' : rating === 3 ? 'İyi' : rating === 2 ? 'Orta' : 'Kötü'}
            </p>
          </div>

          {/* Comment */}
          <div className="mb-5">
            <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Yorum *</label>
            <textarea
              rows={3}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={`${review.other_party_name} ile olan deneyiminizi paylaşın...`}
              className="rs-input resize-none text-sm"
              maxLength={500}
              data-testid="review-comment"
            />
            <p className="text-xs text-[#a1a1aa] text-right mt-1">{comment.length}/500</p>
          </div>

          {error && <p className="text-[#ec4899] text-sm mb-3">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 border border-white/10 text-[#a1a1aa] hover:text-white py-3 rounded-xl text-sm transition-colors">
              Daha Sonra
            </button>
            <button type="submit" disabled={loading || !comment.trim()}
              className="flex-2 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              data-testid="submit-review-btn">
              {loading ? <Loader size={16} className="animate-spin" /> : <><Star size={14} fill="white" /> Değerlendir</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MutualReviewModal;
