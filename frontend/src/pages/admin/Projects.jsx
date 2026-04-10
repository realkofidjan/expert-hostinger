import React, { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Pagination from '../../components/admin/Pagination';
import ConfirmModal from '../../components/admin/ConfirmModal';
import api from '../../api';
import { toast } from 'react-toastify';
import {
  FolderOpen, Plus, Search, Edit, Trash2, EyeOff,
  Upload, X, Star, MapPin, User, Calendar, Loader2, Globe, Images
} from 'lucide-react';

import { getImageUrl } from '../../utils/url';

const emptyForm = { title: '', description: '', client: '', location: '', year: '', status: 'draft' };

export default function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [panel, setPanel] = useState(null); // null | 'add' | 'edit'
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [deletedImageIds, setDeletedImageIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState({ show: false, title: '', message: '', onConfirm: null });

  const fileRef = useRef();

  const fetchProjects = useCallback(async (p = 1, q = '', st = '') => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/projects?page=${p}&q=${encodeURIComponent(q)}&status=${st}&limit=12&_t=${Date.now()}`);
      setProjects(res.data.projects || []);
      setPagination(res.data.pagination || null);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(page, search, filterStatus); }, [page]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchProjects(1, search, filterStatus); }, 350);
    return () => clearTimeout(t);
  }, [search, filterStatus]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setExistingImages([]);
    setNewFiles([]);
    setNewPreviews([]);
    setCoverIndex(0);
    setDeletedImageIds([]);
    setPanel('add');
  };

  const openEdit = (project) => {
    setEditing(project);
    setForm({
      title: project.title,
      description: project.description || '',
      client: project.client || '',
      location: project.location || '',
      year: project.year || '',
      status: project.status,
    });
    setExistingImages(project.images || []);
    setNewFiles([]);
    setNewPreviews([]);
    setDeletedImageIds([]);
    const ci = (project.images || []).findIndex(img => img.image_url === project.cover_image);
    setCoverIndex(ci >= 0 ? ci : 0);
    setPanel('edit');
  };

  const closePanel = () => { setPanel(null); setEditing(null); };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setNewFiles(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onloadend = () => setNewPreviews(prev => [...prev, reader.result]);
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  };

  const removeExistingImage = (img) => {
    setDeletedImageIds(prev => [...prev, img.id]);
    const remaining = existingImages.filter(i => i.id !== img.id);
    setExistingImages(remaining);
    if (coverIndex >= remaining.length) setCoverIndex(Math.max(0, remaining.length - 1));
  };

  const removeNewFile = (idx) => {
    setNewFiles(prev => prev.filter((_, i) => i !== idx));
    setNewPreviews(prev => prev.filter((_, i) => i !== idx));
    const totalExisting = existingImages.length;
    if (coverIndex === totalExisting + idx) setCoverIndex(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    try {
      setSaving(true);
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('cover_index', coverIndex);
      fd.append('deleted_image_ids', JSON.stringify(deletedImageIds));
      newFiles.forEach(f => fd.append('images', f));

      if (panel === 'add') {
        await api.post('/admin/projects', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Project created');
      } else {
        await api.put(`/admin/projects/${editing.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Project updated');
      }
      closePanel();
      fetchProjects(page, search, filterStatus);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (project) => {
    setConfirm({
      show: true,
      title: 'Delete Project',
      message: `Delete "${project.title}"? All images will be permanently removed.`,
      onConfirm: async () => {
        try {
          await api.delete(`/admin/projects/${project.id}`);
          toast.success('Project deleted');
          fetchProjects(page, search, filterStatus);
        } catch {
          toast.error('Failed to delete project');
        }
        setConfirm(c => ({ ...c, show: false }));
      }
    });
  };

  const toggleStatus = async (project) => {
    const newStatus = project.status === 'published' ? 'draft' : 'published';
    try {
      const fd = new FormData();
      fd.append('title', project.title);
      fd.append('status', newStatus);
      fd.append('deleted_image_ids', '[]');
      await api.put(`/admin/projects/${project.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Project ${newStatus === 'published' ? 'published' : 'set to draft'}`);
      fetchProjects(page, search, filterStatus);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const allPreviewImages = [
    ...existingImages.map(img => ({
      src: getImageUrl(img.image_url),
      label: 'saved'
    })),
    ...newPreviews.map(src => ({ src, label: 'new' })),
  ];

  const imgUrl = (url) => getImageUrl(url);

  return (
    <AdminLayout>
      <ConfirmModal
        show={confirm.show}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(c => ({ ...c, show: false }))}
      />

      <div className="flex flex-col gap-6 h-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Projects</h1>
            <p className="text-[var(--text-muted)] mt-1 uppercase tracking-widest text-[10px] font-bold text-yellow-500">EXPERT OFFICE — OUR WORK</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-green-500/20"
          >
            <Plus size={18} /> New Project
          </button>
        </div>

        <div className="flex gap-6 flex-1 overflow-hidden">
          {/* ── Project list ── */}
          <div className={`flex flex-col gap-4 transition-all duration-300 ${panel ? 'w-[55%]' : 'w-full'}`}>
            {/* Filters */}
            <div className="glass p-4 rounded-3xl flex items-center gap-3 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-2.5 pl-10 pr-4 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm"
                />
              </div>
              <select
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-green-500"
              >
                <option value="">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <p className="text-[var(--text-muted)] text-xs font-bold whitespace-nowrap pr-2">
                {pagination?.total ?? projects.length} projects
              </p>
            </div>

            {/* Grid */}
            <div className="glass rounded-[2rem] overflow-hidden flex-1">
              {loading ? (
                <div className="grid gap-4 p-6" style={{ gridTemplateColumns: `repeat(${panel ? 2 : 3}, minmax(0, 1fr))` }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl bg-[var(--bg-secondary)] animate-pulse overflow-hidden">
                      <div className="aspect-video bg-[var(--bg-tertiary)]" />
                      <div className="p-3 space-y-2">
                        <div className="h-3 bg-[var(--bg-tertiary)] rounded w-3/4" />
                        <div className="h-2.5 bg-[var(--bg-tertiary)] rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <div className="py-24 text-center text-[var(--text-muted)]">
                  <FolderOpen size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="font-bold text-sm">No projects yet</p>
                  <p className="text-xs mt-1 opacity-60">Click "New Project" to get started</p>
                </div>
              ) : (
                <div className="grid gap-4 p-6" style={{ gridTemplateColumns: `repeat(${panel ? 2 : 3}, minmax(0, 1fr))` }}>
                  {projects.map(project => (
                    <div
                      key={project.id}
                      className="group rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden hover:border-green-500/40 transition-all duration-300 flex flex-col"
                    >
                      <div className="aspect-video bg-[var(--bg-tertiary)] overflow-hidden relative">
                        {project.cover_image ? (
                          <img
                            src={imgUrl(project.cover_image)}
                            alt={project.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] opacity-30">
                            <Images size={32} />
                          </div>
                        )}
                        {project.images?.length > 0 && (
                          <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-[9px] font-bold rounded-full backdrop-blur-sm">
                            {project.images.length} photo{project.images.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide ${
                          project.status === 'published' ? 'bg-green-500/90 text-white' : 'bg-amber-500/90 text-white'
                        }`}>
                          {project.status}
                        </span>
                      </div>

                      <div className="p-3 flex flex-col flex-1">
                        <p className="font-bold text-[var(--text-primary)] text-sm leading-tight line-clamp-1 mb-1">{project.title}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1.5">
                          {project.client && (
                            <span className="flex items-center gap-1 text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-wide">
                              <User size={8} />{project.client}
                            </span>
                          )}
                          {project.location && (
                            <span className="flex items-center gap-1 text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-wide">
                              <MapPin size={8} />{project.location}
                            </span>
                          )}
                          {project.year && (
                            <span className="flex items-center gap-1 text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-wide">
                              <Calendar size={8} />{project.year}
                            </span>
                          )}
                        </div>
                        {project.description && (
                          <p className="text-[var(--text-muted)] text-xs line-clamp-2">{project.description}</p>
                        )}
                      </div>

                      <div className="flex border-t border-[var(--border-color)]">
                        <button onClick={() => openEdit(project)} className="flex-1 py-2.5 text-xs font-bold text-blue-500 hover:bg-blue-500/10 transition-colors flex items-center justify-center gap-1.5">
                          <Edit size={12} /> Edit
                        </button>
                        <div className="w-px bg-[var(--border-color)]" />
                        <button
                          onClick={() => toggleStatus(project)}
                          className={`flex-1 py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                            project.status === 'published' ? 'text-amber-500 hover:bg-amber-500/10' : 'text-green-500 hover:bg-green-500/10'
                          }`}
                        >
                          {project.status === 'published' ? <><EyeOff size={12} /> Unpublish</> : <><Globe size={12} /> Publish</>}
                        </button>
                        <div className="w-px bg-[var(--border-color)]" />
                        <button onClick={() => handleDelete(project)} className="flex-1 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5">
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {pagination && (
                <div className="px-6 py-2 border-t border-[var(--border-color)]">
                  <Pagination pagination={pagination} onPageChange={setPage} />
                </div>
              )}
            </div>
          </div>

          {/* ── Add / Edit panel ── */}
          {panel && (
            <div className="flex-1 flex flex-col glass rounded-[2rem] overflow-hidden">
              <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--border-color)] shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${panel === 'add' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    {panel === 'add' ? <Plus size={20} /> : <Edit size={20} />}
                  </div>
                  <div>
                    <h2 className="font-black text-[var(--text-primary)] text-base uppercase tracking-tight">
                      {panel === 'add' ? 'New Project' : 'Edit Project'}
                    </h2>
                    <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                      {panel === 'edit' ? `ID: ${editing?.id}` : 'Add to portfolio'}
                    </p>
                  </div>
                </div>
                <button onClick={closePanel} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Project Title *</label>
                  <input
                    type="text" required
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Accra Corporate Office Fit-Out"
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe the project scope, challenges, and outcome..."
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Client / Company</label>
                    <input
                      type="text"
                      value={form.client}
                      onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                      placeholder="e.g. Ghana Revenue Authority"
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Location</label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                      placeholder="e.g. Accra, Ghana"
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Year</label>
                    <input
                      type="number"
                      value={form.year}
                      onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                      placeholder={new Date().getFullYear()}
                      min="2000" max="2099"
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Status</label>
                    <select
                      value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>

                {/* Images */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                    Project Photos <span className="normal-case font-normal opacity-70">(★ = hero cover)</span>
                  </label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-[var(--border-color)] hover:border-green-500/50 rounded-2xl p-4 text-center cursor-pointer transition-colors mb-3"
                  >
                    <Upload size={20} className="mx-auto mb-1 text-[var(--text-muted)]" />
                    <p className="text-xs text-[var(--text-muted)] font-bold">Click to upload photos</p>
                    <p className="text-[10px] text-[var(--text-muted)] opacity-60 mt-0.5">JPG, PNG, WebP — up to 20 images</p>
                    <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                  </div>

                  {allPreviewImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {allPreviewImages.map((img, idx) => {
                        const isExisting = idx < existingImages.length;
                        const isCover = idx === coverIndex;
                        return (
                          <div key={idx} className={`relative rounded-xl overflow-hidden aspect-video border-2 transition-all ${isCover ? 'border-green-500 shadow-lg shadow-green-500/20' : 'border-[var(--border-color)]'}`}>
                            <img src={img.src} alt="" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setCoverIndex(idx)}
                              className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all ${isCover ? 'bg-green-500 text-white' : 'bg-black/50 text-white/70 hover:bg-green-500/80'}`}
                            >
                              <Star size={11} fill={isCover ? 'currentColor' : 'none'} />
                            </button>
                            <button type="button"
                              onClick={() => isExisting ? removeExistingImage(existingImages[idx]) : removeNewFile(idx - existingImages.length)}
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
                            >
                              <X size={11} />
                            </button>
                            {isCover && (
                              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-green-500 text-white text-[9px] font-black rounded-full whitespace-nowrap">COVER</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2 pb-4">
                  <button type="button" onClick={closePanel}
                    className="flex-1 py-3 rounded-2xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-bold text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-3 rounded-2xl bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                  >
                    {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : panel === 'add' ? 'Create Project' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
