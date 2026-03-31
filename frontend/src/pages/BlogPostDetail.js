import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BookOpen, Eye, Calendar, Tag, ArrowLeft, Clock, ChevronRight } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';
import { SkeletonCard } from '@/components/SkeletonLoader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BlogPostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/blog/${id}`)
      .then(res => {
        setPost(res.data);
        document.title = `${res.data.title} | ReverSound Blog`;
        // Fetch related
        return axios.get(`${API}/blog?limit=3`);
      })
      .then(res => setRelated((res.data.posts || []).filter(p => p.id !== id).slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/5 rounded w-1/3" />
          <div className="h-64 bg-white/5 rounded-xl" />
          <div className="h-4 bg-white/5 rounded" />
          <div className="h-4 bg-white/5 rounded w-4/5" />
        </div>
      </div>
    </Layout>
  );

  if (!post) return (
    <Layout>
      <div className="text-center py-24">
        <BookOpen size={40} className="text-[#a1a1aa] mx-auto mb-4 opacity-20" />
        <p className="text-[#a1a1aa]">Yazı bulunamadı.</p>
        <button onClick={() => navigate('/blog')} className="mt-3 text-[#8b5cf6] hover:text-[#7c3aed] text-sm transition-colors">← Blog'a Dön</button>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back */}
        <button onClick={() => navigate('/blog')} className="flex items-center gap-2 text-[#a1a1aa] hover:text-white text-sm mb-8 transition-colors" data-testid="back-to-blog">
          <ArrowLeft size={16} /> Blog'a Dön
        </button>

        {/* Cover */}
        {post.cover_image && (
          <div className="h-64 rounded-xl overflow-hidden mb-8 border border-white/10">
            <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="badge-genre text-[#8b5cf6] border-[#8b5cf6]/20 bg-[#8b5cf6]/5">{post.category}</span>
          <div className="flex items-center gap-1 text-xs text-[#a1a1aa]">
            <Calendar size={11} />
            {new Date(post.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div className="flex items-center gap-1 text-xs text-[#a1a1aa]">
            <Eye size={11} /> {post.views || 0} görüntülenme
          </div>
        </div>

        {/* Title */}
        <h1 className="font-heading font-bold text-3xl sm:text-4xl text-white mb-4 leading-tight">{post.title}</h1>

        {/* Author */}
        <div className="flex items-center gap-3 pb-6 mb-8 border-b border-white/5">
          <div className="w-10 h-10 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center text-sm font-bold text-[#8b5cf6]">
            {post.author_name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{post.author_name}</p>
            <Link to={`/u/${post.author_username}`} className="text-xs text-[#8b5cf6] hover:text-[#7c3aed] transition-colors">@{post.author_username}</Link>
          </div>
        </div>

        {/* Content */}
        <div
          className="prose prose-invert max-w-none text-[#a1a1aa] leading-relaxed"
          style={{ fontSize: '15px', lineHeight: '1.8' }}
        >
          {post.content?.split('\n').map((para, i) => (
            para.trim() ? <p key={i} className="mb-4">{para}</p> : <br key={i} />
          ))}
        </div>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-white/5">
            {post.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 badge-genre">
                <Tag size={9} />#{tag}
              </span>
            ))}
          </div>
        )}

        {/* Related posts */}
        {related.length > 0 && (
          <div className="mt-12">
            <h3 className="font-heading font-bold text-lg text-white mb-5">Diğer Yazılar</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map(rel => (
                <div
                  key={rel.id}
                  className="rs-card overflow-hidden cursor-pointer group hover:border-[#8b5cf6]/20 transition-all"
                  onClick={() => navigate(`/blog/${rel.id}`)}
                >
                  {rel.cover_image && (
                    <div className="h-28 overflow-hidden">
                      <img src={rel.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                  )}
                  <div className="p-3">
                    <span className="badge-genre text-[10px] mb-2 inline-block">{rel.category}</span>
                    <p className="text-xs font-semibold text-white line-clamp-2">{rel.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BlogPostDetail;
