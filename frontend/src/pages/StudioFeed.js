import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Send, Heart, MessageSquare, Trash2, Loader, Radio, AlertTriangle, Music } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';
import { SkeletonPost } from '@/components/SkeletonLoader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROLE_COLORS = {
  producer: '#8b5cf6', artist: '#10b981', engineer: '#f59e0b',
  designer: '#06b6d4', buyer: '#a1a1aa', admin: '#ec4899'
};

const ROLE_LABELS = {
  producer: 'Prodüktör', artist: 'Sanatçı', engineer: 'Engineer',
  designer: 'Tasarımcı', buyer: 'Alıcı', admin: 'Admin'
};

const PostCard = ({ post, currentUserId, token, onDelete, onLike }) => {
  const [commenting, setCommenting] = useState(false);
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const isLiked = post.likes?.includes(currentUserId);
  const roleColor = ROLE_COLORS[post.author_role] || '#a1a1aa';

  const loadComments = async () => {
    if (showComments) { setShowComments(false); return; }
    try {
      const res = await axios.get(`${API}/feed/${post.id}`);
      setComments(res.data.comments || []);
      setShowComments(true);
    } catch {}
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommentLoading(true);
    try {
      const res = await axios.post(`${API}/feed/${post.id}/comments`,
        { content: comment },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      setComments(prev => [...prev, res.data]);
      setComment('');
      setShowComments(true);
    } catch (err) {
      alert(err.response?.data?.detail || 'Yorum gönderilemedi');
    } finally { setCommentLoading(false); }
  };

  return (
    <div className="rs-card p-4 animate-fade-up" data-testid={`post-${post.id}`}>
      {/* Author */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: `${roleColor}20`, border: `1px solid ${roleColor}30`, color: roleColor }}
          >
            {post.author_name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{post.author_name}</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: roleColor }}>
                {ROLE_LABELS[post.author_role] || post.author_role}
              </span>
              <span className="text-[10px] text-[#a1a1aa]">
                {new Date(post.created_at).toLocaleString('tr-TR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
        {post.author_id === currentUserId && (
          <button
            onClick={() => onDelete(post.id)}
            className="text-[#a1a1aa] hover:text-[#ec4899] transition-colors"
            data-testid={`delete-post-${post.id}`}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      <p className="text-sm text-white leading-relaxed mb-3 whitespace-pre-wrap">{post.content}</p>

      {/* Audio snippet */}
      {post.media_url && (
        <div className="mb-3 p-3 bg-[#0d0d0f] rounded-md flex items-center gap-3 border border-white/5">
          <Music size={14} className="text-[#8b5cf6]" />
          <audio controls src={post.media_url} className="flex-1 h-8 accent-[#8b5cf6]" style={{ maxWidth: '100%' }} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2 border-t border-white/5">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 text-xs transition-colors ${isLiked ? 'text-[#ec4899]' : 'text-[#a1a1aa] hover:text-[#ec4899]'}`}
          data-testid={`like-post-${post.id}`}
        >
          <Heart size={14} fill={isLiked ? '#ec4899' : 'none'} />
          {post.likes?.length || 0}
        </button>
        <button
          onClick={loadComments}
          className="flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-white transition-colors"
          data-testid={`comments-post-${post.id}`}
        >
          <MessageSquare size={14} />
          {post.comments_count || 0} Yorum
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-[#a1a1aa] flex-shrink-0">
                {c.author_name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <span className="text-xs font-semibold text-white">{c.author_name}</span>
                <span className="text-xs text-[#a1a1aa] ml-2">{c.content}</span>
              </div>
            </div>
          ))}
          <form onSubmit={submitComment} className="flex gap-2 mt-2">
            <input
              type="text"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Yorum yaz..."
              className="rs-input flex-1 text-xs h-8"
              data-testid={`comment-input-${post.id}`}
            />
            <button
              type="submit"
              disabled={commentLoading}
              className="px-3 bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/20 rounded-md text-xs transition-colors"
            >
              {commentLoading ? <Loader size={10} className="animate-spin" /> : <Send size={10} />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

const StudioFeed = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (p = 1, append = false) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/feed?page=${p}&limit=20`);
      const newPosts = res.data.posts || [];
      setPosts(prev => append ? [...prev, ...newPosts] : newPosts);
      setHasMore(newPosts.length === 20);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const submitPost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    setError('');
    try {
      const res = await axios.post(`${API}/feed`,
        { content: content.trim() },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      setPosts(prev => [res.data, ...prev]);
      setContent('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Post gönderilemedi');
    } finally { setPosting(false); }
  };

  const handleDelete = async (postId) => {
    try {
      await axios.delete(`${API}/feed/${postId}`,
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch {}
  };

  const handleLike = async (postId) => {
    if (!user) { navigate('/auth'); return; }
    try {
      const res = await axios.post(`${API}/feed/${postId}/like`, {},
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        return {
          ...p,
          likes: res.data.liked
            ? [...(p.likes || []), user.id]
            : (p.likes || []).filter(id => id !== user.id)
        };
      }));
    } catch {}
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Radio size={20} className="text-[#8b5cf6]" />
          <div>
            <h1 className="font-heading font-bold text-2xl text-white">Studio Feed</h1>
            <p className="text-xs text-[#a1a1aa]">Müzik profesyonellerinin sesi</p>
          </div>
        </div>

        {/* Compose */}
        {user ? (
          <div className="rs-card p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center text-sm font-bold text-[#8b5cf6] flex-shrink-0">
                {user.name?.charAt(0)?.toUpperCase()}
              </div>
              <form onSubmit={submitPost} className="flex-1">
                <textarea
                  rows={3}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Müzik hakkında ne düşünüyorsun? Demo linki paylaşma. Yapıcı eleştiri iste. Proje güncelleme..."
                  className="rs-input resize-none text-sm w-full mb-3"
                  maxLength={500}
                  data-testid="post-compose-input"
                />
                {error && (
                  <div className="flex items-center gap-2 text-xs text-[#ec4899] mb-2">
                    <AlertTriangle size={12} /> {error}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#a1a1aa]">{content.length}/500</span>
                  <button
                    type="submit"
                    disabled={posting || !content.trim()}
                    className="flex items-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-md transition-all hover:shadow-glow"
                    data-testid="post-submit-btn"
                  >
                    {posting ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
                    Paylaş
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="rs-card p-5 mb-6 text-center">
            <p className="text-[#a1a1aa] text-sm mb-3">Feed'e katılmak için giriş yap.</p>
            <button onClick={() => navigate('/auth')} className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm px-4 py-2 rounded-md transition-all hover:shadow-glow">
              Giriş Yap
            </button>
          </div>
        )}

        {/* Posts */}
        {loading && posts.length === 0 ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <SkeletonPost key={i} />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <Radio size={40} className="text-[#a1a1aa] mx-auto mb-4 opacity-20" />
            <p className="text-[#a1a1aa]">Henüz post yok. İlk paylaşımı sen yap!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                token={token}
                onDelete={handleDelete}
                onLike={handleLike}
              />
            ))}
            {hasMore && (
              <button
                onClick={() => { const next = page + 1; setPage(next); fetchPosts(next, true); }}
                className="w-full py-3 text-sm text-[#a1a1aa] hover:text-white border border-white/10 hover:border-white/20 rounded-md transition-all"
              >
                Daha Fazla Yükle
              </button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StudioFeed;
