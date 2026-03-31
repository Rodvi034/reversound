import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Eye, ArrowRight, Plus, Loader, Tag } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CATEGORIES = ['All', 'Production Tips', 'Industry News', 'Marketing', 'Tutorial', 'Announcements'];

const BlogPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: 1, limit: 12 });
    if (category !== 'All') params.append('category', category);
    axios.get(`${API}/blog?${params}`)
      .then(res => { setPosts(res.data.posts || []); setTotal(res.data.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category]);

  const canCreate = user?.role === 'admin' || ['pro', 'enterprise'].includes(user?.subscription_tier);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading font-bold text-2xl text-white flex items-center gap-2">
              <BookOpen size={20} className="text-[#8b5cf6]" /> Blog
            </h1>
            <p className="text-[#a1a1aa] text-sm mt-0.5">Prodüksiyon rehberleri ve müzik endüstrisi haberleri</p>
          </div>
          {canCreate && (
            <button onClick={() => navigate('/blog/create')}
              className="flex items-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-medium px-4 py-2 rounded-md transition-all hover:shadow-glow"
              data-testid="create-blog-btn">
              <Plus size={14} /> Yaz
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-all ${category === cat ? 'bg-[#8b5cf6] text-white' : 'bg-[#141416] border border-white/5 text-[#a1a1aa] hover:text-white'}`}>
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen size={40} className="text-[#a1a1aa] mx-auto mb-4 opacity-20" />
            <p className="text-[#a1a1aa]">Bu kategoride henüz içerik yok.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map(post => (
              <div
                key={post.id}
                className="rs-card overflow-hidden cursor-pointer group hover:border-[#8b5cf6]/20 transition-all animate-fade-up"
                onClick={() => navigate(`/blog/${post.id}`)}
                data-testid={`blog-post-${post.id}`}
              >
                {post.cover_image ? (
                  <div className="h-40 overflow-hidden">
                    <img src={post.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ) : (
                  <div className="h-40 bg-gradient-to-br from-[#8b5cf6]/20 to-[#141416] flex items-center justify-center">
                    <BookOpen size={32} className="text-[#8b5cf6] opacity-30" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge-genre text-[#8b5cf6] border-[#8b5cf6]/20 bg-[#8b5cf6]/5">{post.category}</span>
                    <div className="flex items-center gap-1 text-[10px] text-[#a1a1aa] ml-auto">
                      <Eye size={9} /> {post.views || 0}
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2 leading-snug">{post.title}</h3>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <span className="text-xs text-[#a1a1aa]">{post.author_name}</span>
                    <span className="text-xs text-[#a1a1aa]">
                      {new Date(post.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BlogPage;
