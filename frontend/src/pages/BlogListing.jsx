import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MainNavbar from '../components/MainNavbar';
import MainFooter from '../components/MainFooter';
import api from '../api';
import { Search, ArrowRight, Calendar, BookOpen, X } from 'lucide-react';
import { createBlogUrl } from '../utils/url';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5001';
const imgUrl = (url) => (!url ? '' : url.startsWith('http') ? url : `${BACKEND_URL}${url}`);
const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

export default function BlogListing() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const fetchPosts = useCallback(async (p = 1, q = '') => {
    setLoading(true);
    try {
      const res = await api.get(`/blogs?page=${p}&q=${encodeURIComponent(q)}&status=published&limit=7`);
      setPosts(res.data?.blogs || []);
      setPagination(res.data?.pagination || null);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { fetchPosts(page, search); }, [page]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchPosts(1, search); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col transition-colors duration-300">
      <MainNavbar />

      {/* ── Page Header ── */}
      <section className="pt-32 pb-16 px-6 relative overflow-hidden bg-white dark:bg-gray-950">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-green-100 dark:bg-green-900/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-yellow-50 dark:bg-yellow-900/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto relative z-10">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-green-600 dark:text-green-400 mb-4">Expert Office Blog</p>
          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6 text-gray-900 dark:text-white">
            Ideas &amp; <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 via-yellow-400 to-green-500">Insights</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mb-10">
            Tips, trends, and inspiration for designing the perfect workspace.
          </p>
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl py-3 pl-12 pr-10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="flex-1 px-6 pb-24 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="space-y-8">
            <div className="rounded-3xl bg-gray-200 dark:bg-white/5 animate-pulse overflow-hidden">
              <div className="aspect-[21/9] bg-gray-300 dark:bg-white/5" />
              <div className="p-8 space-y-3">
                <div className="h-4 bg-gray-300 dark:bg-white/5 rounded w-1/4" />
                <div className="h-8 bg-gray-300 dark:bg-white/5 rounded w-3/4" />
                <div className="h-4 bg-gray-300 dark:bg-white/5 rounded w-full" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-3xl bg-gray-200 dark:bg-white/5 animate-pulse overflow-hidden">
                  <div className="aspect-video bg-gray-300 dark:bg-white/5" />
                  <div className="p-5 space-y-2">
                    <div className="h-3 bg-gray-300 dark:bg-white/5 rounded w-1/3" />
                    <div className="h-5 bg-gray-300 dark:bg-white/5 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-32 text-center">
            <BookOpen size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-700" />
            <p className="text-gray-500 font-bold text-lg">No articles found</p>
            {search && <p className="text-gray-400 dark:text-gray-600 text-sm mt-2">Try a different search term</p>}
          </div>
        ) : (
          <>
            {/* Featured post */}
            {featured && (
              <Link
                to={createBlogUrl(featured)}
                className="group block rounded-3xl overflow-hidden border border-gray-200 dark:border-white/10 hover:border-green-500/40 transition-all duration-500 hover:shadow-2xl hover:shadow-green-500/10 mb-10"
              >
                <div className="md:flex">
                  <div className="md:w-3/5 aspect-video md:aspect-auto overflow-hidden relative bg-gray-200 dark:bg-gray-800">
                    {featured.image_url ? (
                      <img
                        src={imgUrl(featured.image_url)}
                        alt={featured.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full min-h-[280px] bg-gradient-to-br from-green-100 dark:from-green-900 to-gray-200 dark:to-gray-800 flex items-center justify-center">
                        <BookOpen size={48} className="text-green-400 dark:text-green-700" />
                      </div>
                    )}
                    <span className="absolute top-4 left-4 px-3 py-1 bg-green-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                      ✨ Featured
                    </span>
                  </div>
                  <div className="md:w-2/5 p-8 flex flex-col justify-center bg-white dark:bg-gray-900/80">
                    <p className="text-gray-400 dark:text-gray-500 text-xs font-medium flex items-center gap-1.5 mb-4">
                      <Calendar size={11} /> {formatDate(featured.created_at)}
                    </p>
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors leading-tight mb-4">
                      {featured.title}
                    </h2>
                    {featured.excerpt && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed line-clamp-3 mb-6">{featured.excerpt}</p>
                    )}
                    <span className="inline-flex items-center gap-2 text-green-600 dark:text-green-400 font-bold text-sm group-hover:gap-3 transition-all">
                      Read Article <ArrowRight size={16} />
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Rest of posts */}
            {rest.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {rest.map(post => (
                  <Link
                    key={post.id}
                    to={createBlogUrl(post)}
                    className="group rounded-3xl overflow-hidden border border-gray-200 dark:border-white/10 hover:border-green-500/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-green-500/10 flex flex-col"
                  >
                    <div className="aspect-video overflow-hidden relative bg-gray-200 dark:bg-gray-800">
                      {post.image_url ? (
                        <img src={imgUrl(post.image_url)} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-green-100 dark:from-green-900/60 to-gray-200 dark:to-gray-800 flex items-center justify-center">
                          <BookOpen size={28} className="text-green-400 dark:text-green-800" />
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-1 bg-white dark:bg-gray-900/80">
                      <p className="text-gray-400 dark:text-gray-600 text-xs flex items-center gap-1.5 mb-2">
                        <Calendar size={10} /> {formatDate(post.created_at)}
                      </p>
                      <h3 className="font-black text-gray-900 dark:text-white text-base leading-tight group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors mb-2 line-clamp-2">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="text-gray-500 dark:text-gray-500 text-sm line-clamp-2 flex-1">{post.excerpt}</p>
                      )}
                      <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-bold mt-4 group-hover:gap-2.5 transition-all">
                        Read more <ArrowRight size={13} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors ${
                      p === page
                        ? 'bg-green-500 text-white'
                        : 'border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-white/30'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <MainFooter />
    </div>
  );
}
