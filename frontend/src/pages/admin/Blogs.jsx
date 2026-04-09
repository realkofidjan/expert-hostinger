import React, { useState, useEffect, useCallback } from 'react';
import Pagination from '../../components/admin/Pagination';
import api from '../../api';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  FileText, Plus, Trash2, Search, Edit,
  CheckCircle2, AlertCircle, Image as ImageIcon,
  Upload, X, Eye, Images
} from 'lucide-react';
import { toast } from 'react-toastify';
import ConfirmModal from '../../components/admin/ConfirmModal';

const Blogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  
  const [newBlog, setNewBlog] = useState({
    title: '',
    content: '',
    excerpt: '',
    status: 'draft'
  });
  const [blogImage, setBlogImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [editingBlog, setEditingBlog] = useState(null);
  const [confirm, setConfirm] = useState({ show: false, title: '', message: '', onConfirm: null });

  // Gallery state
  const [existingGallery, setExistingGallery] = useState([]);
  const [newGalleryFiles, setNewGalleryFiles] = useState([]);
  const [newGalleryPreviews, setNewGalleryPreviews] = useState([]);
  const [deletedGalleryIds, setDeletedGalleryIds] = useState([]);

  const fetchBlogs = useCallback(async (p = 1, q = '') => {
    try {
      setLoading(true);
      const response = await api.get(`/blogs?page=${p}&q=${encodeURIComponent(q)}&_t=${Date.now()}`);
      setBlogs(response.data.blogs || []);
      setPagination(response.data.pagination || null);
    } catch (err) {
      toast.error('Failed to load blogs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBlogs(page, searchTerm); }, [page]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchBlogs(1, searchTerm); }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBlogImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const formData = new FormData();
      formData.append('title', newBlog.title);
      formData.append('content', newBlog.content);
      formData.append('excerpt', newBlog.excerpt);
      formData.append('status', newBlog.status);
      if (blogImage) formData.append('image', blogImage);
      newGalleryFiles.forEach(f => formData.append('gallery', f));
      formData.append('deleted_gallery_ids', JSON.stringify(deletedGalleryIds));

      if (editingBlog) {
        await api.put(`/admin/blogs/${editingBlog.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Blog updated successfully');
      } else {
        await api.post('/admin/blogs', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Blog created successfully');
      }
      
      resetForm();
      setActiveTab('list');
      fetchBlogs(page, searchTerm);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save blog');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = async (blog) => {
    setEditingBlog(blog);
    setNewBlog({
      title: blog.title,
      content: blog.content,
      excerpt: blog.excerpt || '',
      status: blog.status
    });
    setImagePreview(blog.image_url ? (blog.image_url.startsWith('http') ? blog.image_url : `${BACKEND_URL}${blog.image_url}`) : '');
    setNewGalleryFiles([]);
    setNewGalleryPreviews([]);
    setDeletedGalleryIds([]);
    // Fetch gallery
    try {
      const res = await api.get(`/blogs/${blog.id}?_t=${Date.now()}`);
      setExistingGallery(res.data?.gallery || []);
    } catch { setExistingGallery([]); }
    setActiveTab('add');
  };

  const handleGalleryChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setNewGalleryFiles(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onloadend = () => setNewGalleryPreviews(prev => [...prev, reader.result]);
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  };

  const removeExistingGalleryImg = (img) => {
    setDeletedGalleryIds(prev => [...prev, img.id]);
    setExistingGallery(prev => prev.filter(i => i.id !== img.id));
  };

  const removeNewGalleryImg = (idx) => {
    setNewGalleryFiles(prev => prev.filter((_, i) => i !== idx));
    setNewGalleryPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setEditingBlog(null);
    setNewBlog({ title: '', content: '', excerpt: '', status: 'draft' });
    setBlogImage(null);
    setImagePreview('');
    setExistingGallery([]);
    setNewGalleryFiles([]);
    setNewGalleryPreviews([]);
    setDeletedGalleryIds([]);
  };

  const handleDeleteBlog = (id) => {
    setConfirm({
      show: true,
      title: 'Delete Blog Post',
      message: 'This will permanently delete the blog post and its image. This action cannot be undone.',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/blogs/${id}`);
          toast.success('Blog deleted');
          fetchBlogs(page, searchTerm);
        } catch (err) {
          toast.error('Failed to delete blog');
        }
      }
    });
  };

  const filteredBlogs = blogs;

  return (
    <AdminLayout>
      <div className="h-full flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Content Management</h1>
            <p className="text-[var(--text-muted)] mt-1 uppercase tracking-widest text-[10px] font-bold text-purple-500">EDITORIAL & BLOG HUB</p>
          </div>
          
          <div className="flex bg-[var(--bg-secondary)] p-1.5 rounded-2xl border border-[var(--border-color)] shrink-0">
            {[
              { id: 'list', label: 'All Posts', icon: <FileText size={16} /> },
              { id: 'add', label: editingBlog ? 'Edit Post' : 'New Post', icon: <Plus size={16} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'add' && !editingBlog) resetForm();
                  setActiveTab(tab.id);
                }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300
                  ${activeTab === tab.id 
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'list' && (
            <div className="h-full flex flex-col space-y-4">
              <div className="glass p-4 rounded-3xl flex items-center justify-between shrink-0">
                <div className="relative w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                  <input 
                    type="text"
                    placeholder="Search posts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-2.5 pl-12 pr-4 text-[var(--text-primary)] focus:outline-none focus:border-purple-500 transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="flex-1 glass rounded-[2rem] overflow-hidden flex flex-col">
                <div className="overflow-y-auto custom-scrollbar p-6">
                  {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                      {[1,2,3].map(i => (
                        <div key={i} className="glass rounded-[2rem] overflow-hidden border border-[var(--border-color)]">
                          <div className="aspect-video bg-[var(--bg-tertiary)] opacity-50"></div>
                          <div className="p-6 space-y-4">
                            <div className="h-6 w-3/4 bg-[var(--bg-tertiary)] rounded-lg"></div>
                            <div className="space-y-2">
                              <div className="h-3 w-full bg-[var(--bg-tertiary)] rounded-md opacity-40"></div>
                              <div className="h-3 w-5/6 bg-[var(--bg-tertiary)] rounded-md opacity-40"></div>
                            </div>
                            <div className="pt-4 border-t border-[var(--border-color)] flex justify-between">
                              <div className="h-4 w-20 bg-[var(--bg-tertiary)] rounded-md"></div>
                              <div className="flex gap-2">
                                <div className="w-8 h-8 bg-[var(--bg-tertiary)] rounded-lg"></div>
                                <div className="w-8 h-8 bg-[var(--bg-tertiary)] rounded-lg"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredBlogs.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-[var(--text-muted)] opacity-50">
                      <FileText size={48} className="mb-4" />
                      <p className="text-sm font-bold uppercase tracking-widest">No blog posts found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredBlogs.map((blog) => (
                        <div key={blog.id} className="glass-card group border border-[var(--border-color)] rounded-[2rem] overflow-hidden hover:border-purple-500/30 transition-all duration-500">
                          <div className="aspect-video relative overflow-hidden">
                            {blog.image_url ? (
                              <img src={`${BACKEND_URL}${blog.image_url}`} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            ) : (
                              <div className="w-full h-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]">
                                <ImageIcon size={48} />
                              </div>
                            )}
                            <div className="absolute top-4 right-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-[var(--border-color)] backdrop-blur-md ${
                                blog.status === 'published' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'
                              }`}>
                                {blog.status}
                              </span>
                            </div>
                          </div>
                          
                          <div className="p-6">
                            <h3 className="text-lg font-black text-[var(--text-primary)] line-clamp-1 mb-2 group-hover:text-purple-400 transition-colors uppercase tracking-tight">{blog.title}</h3>
                            <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-4 leading-relaxed font-medium">{blog.excerpt || 'No excerpt provided...'}</p>
                            
                            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
                              <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">{new Date(blog.created_at).toLocaleDateString()}</span>
                              <div className="flex items-center gap-2">
                                <button onClick={() => startEditing(blog)} className="p-2 hover:bg-purple-500/10 rounded-lg text-purple-400 transition-colors">
                                  <Edit size={16} />
                                </button>
                                <button onClick={() => handleDeleteBlog(blog.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {pagination && activeTab === 'list' && (
                    <div className="mt-4">
                      <Pagination pagination={pagination} onPageChange={p => setPage(p)} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'add' && (
            <div className="h-full overflow-y-auto custom-scrollbar pr-4 max-h-[calc(100vh-200px)] animate-fadeIn">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
                <div className="lg:col-span-2 space-y-6">
                  <div className="glass rounded-[2rem] p-8 space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Post Title *</label>
                      <input 
                        required
                        type="text" 
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 text-[var(--text-primary)] focus:outline-none focus:border-purple-500 font-bold transition-all text-lg" 
                        placeholder="Enter a compelling title..."
                        value={newBlog.title}
                        onChange={(e) => setNewBlog({...newBlog, title: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Excerpt / Summary</label>
                      <textarea 
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-4 text-[var(--text-primary)] h-24 resize-none focus:outline-none focus:border-purple-500 text-sm leading-relaxed" 
                        placeholder="Short summary for the listing page..."
                        value={newBlog.excerpt}
                        onChange={(e) => setNewBlog({...newBlog, excerpt: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Article Content *</label>
                      <textarea 
                        required
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 text-[var(--text-primary)] h-96 resize-none focus:outline-none focus:border-purple-500 text-sm leading-relaxed" 
                        placeholder="Write your article here (Supports markdown)..."
                        value={newBlog.content}
                        onChange={(e) => setNewBlog({...newBlog, content: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="glass rounded-[2rem] p-6">
                    <div className="flex items-center gap-2 mb-4 text-purple-400">
                      <ImageIcon size={18} />
                      <h3 className="font-bold text-xs uppercase tracking-widest">Featured Image</h3>
                    </div>
                    
                    <div 
                      onClick={() => document.getElementById('blog-img').click()}
                      className="aspect-video bg-[var(--bg-tertiary)] border-2 border-dashed border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center text-center p-3 cursor-pointer hover:border-purple-500/50 transition-all group overflow-hidden"
                    >
                      <input id="blog-img" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                      {imagePreview ? (
                        <img src={imagePreview} className="w-full h-full object-cover rounded-lg" alt="Preview" />
                      ) : (
                        <>
                          <Upload size={24} className="text-[var(--text-muted)] group-hover:text-purple-500 mb-2" />
                          <p className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-tighter">Click to upload header</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Gallery Images */}
                  <div className="glass rounded-[2rem] p-6">
                    <div className="flex items-center gap-2 mb-4 text-purple-400">
                      <Images size={18} />
                      <h3 className="font-bold text-xs uppercase tracking-widest">Gallery Images</h3>
                    </div>
                    <div
                      onClick={() => document.getElementById('blog-gallery').click()}
                      className="border-2 border-dashed border-[var(--border-color)] hover:border-purple-500/50 rounded-2xl p-4 text-center cursor-pointer transition-colors mb-3"
                    >
                      <input id="blog-gallery" type="file" multiple accept="image/*" className="hidden" onChange={handleGalleryChange} />
                      <Upload size={18} className="mx-auto mb-1 text-[var(--text-muted)]" />
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Add gallery photos</p>
                    </div>
                    {(existingGallery.length > 0 || newGalleryPreviews.length > 0) && (
                      <div className="grid grid-cols-3 gap-2">
                        {existingGallery.map(img => (
                          <div key={img.id} className="relative aspect-video rounded-xl overflow-hidden border border-[var(--border-color)] group">
                            <img src={img.image_url.startsWith('http') ? img.image_url : `${BACKEND_URL}${img.image_url}`} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeExistingGalleryImg(img)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        {newGalleryPreviews.map((src, i) => (
                          <div key={`new-${i}`} className="relative aspect-video rounded-xl overflow-hidden border border-purple-500/40 group">
                            <img src={src} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeNewGalleryImg(i)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={10} />
                            </button>
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-purple-500/80 text-white text-[8px] font-bold rounded">NEW</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="glass rounded-[2rem] p-6 flex flex-col justify-between space-y-8">
                    <div>
                      <div className="flex items-center gap-2 mb-6 text-purple-400">
                        <CheckCircle2 size={18} />
                        <h3 className="font-bold text-xs uppercase tracking-widest">Publication Status</h3>
                      </div>

                      <div className="space-y-4">
                        {['draft', 'published', 'archived'].map((s) => (
                          <div 
                            key={s}
                            onClick={() => setNewBlog({...newBlog, status: s})}
                            className="flex items-center gap-3 cursor-pointer group"
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${newBlog.status === s ? 'border-purple-500' : 'border-[var(--border-color)]'}`}>
                              {newBlog.status === s && <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-scaleIn"></div>}
                            </div>
                            <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {editingBlog && (
                        <button 
                          type="button" 
                          onClick={resetForm}
                          className="w-full py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                        >
                          Cancel
                        </button>
                      )}
                      <button 
                        type="submit" 
                        disabled={isSaving}
                        className="w-full py-4 bg-gradient-to-br from-purple-600 to-purple-500 text-white rounded-xl font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all border border-[var(--border-color)] uppercase tracking-[0.2em]"
                      >
                        {isSaving ? 'Saving...' : (
                          <>
                            <CheckCircle2 size={20} />
                            {editingBlog ? 'Update Post' : 'Publish Post'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={confirm.show}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onClose={() => setConfirm({ show: false, title: '', message: '', onConfirm: null })}
      />
    </AdminLayout>
  );
};

export default Blogs;
