import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import MainNavbar from '../components/MainNavbar';
import MainFooter from '../components/MainFooter';
import api from '../api';
import { ArrowLeft, Calendar, ArrowRight, BookOpen, X, ChevronLeft, ChevronRight, Images } from 'lucide-react';
import { decodeId, createBlogUrl } from '../utils/url';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';
const imgUrl = (url) => (!url ? '' : url.startsWith('http') ? url : `${BACKEND_URL}${url}`);
const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

export default function BlogPost() {
  const { id: rawId } = useParams();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Lightbox
  const [lightbox, setLightbox] = useState(null); // index into gallery

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    setNotFound(false);

    // Decoding layer
    const hash = rawId.includes('-') ? rawId.split('-').pop() : rawId;
    const realId = decodeId(hash);

    if (!realId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    api.get(`/blogs/${realId}`)
      .then(res => {
        if (!res.data || res.data.status === 'draft') { setNotFound(true); return null; }
        setPost(res.data);
        return api.get(`/blogs?status=published&limit=4&page=1`);
      })
      .then(res => {
        if (!res) return;
        setRelated((res.data?.blogs || []).filter(b => b.id !== parseInt(realId)).slice(0, 3));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [rawId]);

  // Keyboard nav for lightbox
  useEffect(() => {
    if (lightbox === null || !post?.gallery?.length) return;
    const handler = (e) => {
      if (e.key === 'ArrowRight') setLightbox(i => (i + 1) % post.gallery.length);
      if (e.key === 'ArrowLeft')  setLightbox(i => (i - 1 + post.gallery.length) % post.gallery.length);
      if (e.key === 'Escape')     setLightbox(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, post]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        <MainNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col">
        <MainNavbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6 pt-24">
          <BookOpen size={56} className="text-gray-300 dark:text-gray-700" />
          <h2 className="text-3xl font-black">Article Not Found</h2>
          <p className="text-gray-500">This article doesn't exist or hasn't been published yet.</p>
          <Link to="/blog" className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl transition-colors">
            <ArrowLeft size={16} /> Back to Blog
          </Link>
        </div>
        <MainFooter />
      </div>
    );
  }

  const gallery = post.gallery || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col transition-colors duration-300">
      <MainNavbar />

      {/* ── Full-bleed hero — navbar overlays this ── */}
      <div className="relative w-full overflow-hidden" style={{ height: post.image_url ? '65vh' : '0' }}>
        {post.image_url && (
          <>
            <img
              src={imgUrl(post.image_url)}
              alt={post.title}
              className="w-full h-full object-cover"
            />
            {/* Gradient fades into page bg */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-50 dark:from-gray-950 via-transparent to-black/40" />
          </>
        )}
      </div>

      {/* ── Article ── */}
      <article className={`max-w-3xl mx-auto w-full px-6 pb-24 ${post.image_url ? '-mt-24 relative z-10' : 'pt-32'}`}>
        {/* Back link */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-green-600 dark:hover:text-green-400 text-sm font-medium transition-colors mb-8"
        >
          <ArrowLeft size={15} /> All Articles
        </Link>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <span className="px-3 py-1 bg-green-100 dark:bg-green-500/20 border border-green-300 dark:border-green-500/30 rounded-full text-green-700 dark:text-green-400 text-[10px] font-black uppercase tracking-widest">
            📝 Article
          </span>
          <span className="flex items-center gap-1.5 text-gray-400 text-sm">
            <Calendar size={13} /> {formatDate(post.created_at)}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white leading-tight mb-6">
          {post.title}
        </h1>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-10 border-l-4 border-green-500 pl-5 py-1">
            {post.excerpt}
          </p>
        )}

        <div className="w-16 h-0.5 bg-gradient-to-r from-green-500 to-yellow-400 rounded-full mb-10" />

        {/* Content */}
        <div className="blog-content" dangerouslySetInnerHTML={{ __html: post.content }} />

        {/* ── Gallery ── */}
        {gallery.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center gap-3 mb-6">
              <Images size={20} className="text-green-500" />
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Photo Gallery</h2>
              <span className="text-xs text-gray-400 font-medium">({gallery.length} photo{gallery.length !== 1 ? 's' : ''})</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {gallery.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setLightbox(i)}
                  className="group aspect-video rounded-2xl overflow-hidden relative bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-green-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10"
                >
                  <img
                    src={imgUrl(img.image_url)}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
                      View
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* ── Related articles ── */}
      {related.length > 0 && (
        <section className="max-w-6xl mx-auto w-full px-6 pb-24">
          <div className="border-t border-gray-200 dark:border-white/10 pt-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">More Articles</h2>
              <Link to="/blog" className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm font-bold transition-colors">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {related.map(p => (
                <Link
                  key={p.id}
                  to={`/blog/${p.id}`}
                  className="group rounded-3xl overflow-hidden border border-gray-200 dark:border-white/10 hover:border-green-500/30 transition-all duration-400 hover:-translate-y-1 hover:shadow-xl hover:shadow-green-500/10 flex flex-col"
                >
                  <div className="aspect-video overflow-hidden bg-gray-200 dark:bg-gray-800 relative">
                    {p.image_url ? (
                      <img src={imgUrl(p.image_url)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-100 dark:from-green-900/40 to-gray-200 dark:to-gray-800 flex items-center justify-center">
                        <BookOpen size={24} className="text-green-400 dark:text-green-800" />
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex flex-col flex-1 bg-white dark:bg-gray-900/80">
                    <p className="text-gray-400 dark:text-gray-600 text-xs flex items-center gap-1.5 mb-2">
                      <Calendar size={10} /> {formatDate(p.created_at)}
                    </p>
                    <h3 className="font-black text-gray-900 dark:text-white text-sm leading-tight group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors line-clamp-2 flex-1">
                      {p.title}
                    </h3>
                    <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-bold mt-3 group-hover:gap-2.5 transition-all">
                      Read <ArrowRight size={12} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <MainFooter />

      {/* ── Lightbox ── */}
      {lightbox !== null && gallery.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center"
          onClick={e => { if (e.target === e.currentTarget) setLightbox(null); }}
        >
          {/* Close */}
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X size={20} className="text-white" />
          </button>

          {/* Main image */}
          <img
            key={lightbox}
            src={imgUrl(gallery[lightbox]?.image_url)}
            alt=""
            className="max-h-[80vh] max-w-[90vw] object-contain rounded-2xl"
          />

          {/* Prev / Next */}
          {gallery.length > 1 && (
            <>
              <button
                onClick={() => setLightbox(i => (i - 1 + gallery.length) % gallery.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <ChevronLeft size={22} className="text-white" />
              </button>
              <button
                onClick={() => setLightbox(i => (i + 1) % gallery.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <ChevronRight size={22} className="text-white" />
              </button>
            </>
          )}

          {/* Thumbnail strip */}
          {gallery.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto max-w-lg px-4">
              {gallery.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setLightbox(i)}
                  className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    i === lightbox ? 'border-green-400 opacity-100' : 'border-transparent opacity-40 hover:opacity-70'
                  }`}
                >
                  <img src={imgUrl(img.image_url)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Counter */}
          <p className="text-slate-500 text-xs font-bold mt-3">{lightbox + 1} / {gallery.length}</p>
        </div>
      )}
    </div>
  );
}
