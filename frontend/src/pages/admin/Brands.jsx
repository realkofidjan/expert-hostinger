import React, { useState, useEffect, useCallback } from 'react';
import Pagination from '../../components/admin/Pagination';
import api from '../../api';
import { useRole } from '../../utils/permissions';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Layers,
  Search,
  CheckCircle,
  AlertCircle,
  Briefcase,
  Edit,
  Upload
} from 'lucide-react';
import { toast } from 'react-toastify';
import ConfirmModal from '../../components/admin/ConfirmModal';

const Brands = () => {
  const { can } = useRole();
  const canManage = can('manageBrands');
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const [newBrand, setNewBrand] = useState({
    name: '',
    logo: ''
  });
  const [editingBrand, setEditingBrand] = useState(null);
  const [confirm, setConfirm] = useState({ show: false, title: '', message: '', onConfirm: null });

  const fetchBrands = useCallback(async (p = 1, q = '') => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/brands?page=${p}&q=${encodeURIComponent(q)}`);
      setBrands(response.data.brands || []);
      setPagination(response.data.pagination || null);
    } catch (err) {
      toast.error('Failed to load brands');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBrands(page, searchTerm); }, [page]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchBrands(1, searchTerm); }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const [brandLogo, setBrandLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBrandLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddBrand = async (e) => {
    e.preventDefault();
    if (!newBrand.name) return;

    try {
      setIsSaving(true);
      const formData = new FormData();
      formData.append('name', newBrand.name);
      if (brandLogo) {
        formData.append('logo', brandLogo);
      } else if (editingBrand && editingBrand.logo) {
        formData.append('logo', editingBrand.logo);
      }

      if (editingBrand) {
        await api.put(`/admin/brands/${editingBrand.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Brand updated successfully');
      } else {
        await api.post('/admin/brands', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Brand created successfully');
      }
      setNewBrand({ name: '', logo: '' });
      setBrandLogo(null);
      setLogoPreview('');
      setEditingBrand(null);
      fetchBrands(page, searchTerm);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save brand');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (brand) => {
    setEditingBrand(brand);
    setNewBrand({
      name: brand.name,
      logo: brand.logo || ''
    });
  };

  const cancelRevision = () => {
    setEditingBrand(null);
    setNewBrand({ name: '', logo: '' });
  };

  const handleDeleteBrand = (id) => {
    setConfirm({
      show: true,
      title: 'Delete Brand',
      message: 'Deleting this brand may affect products associated with it. This action cannot be undone.',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/brands/${id}`);
          toast.success('Brand deleted');
          fetchBrands(page, searchTerm);
        } catch (err) {
          toast.error('Failed to delete brand');
        }
      }
    });
  };

  const filteredBrands = brands;

  return (
    <AdminLayout>
      <div className="h-full flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Brand Directory</h1>
            <p className="text-[var(--text-muted)] mt-1 uppercase tracking-widest text-[10px] font-bold text-blue-500">MANAGE MANUFACTURER PARTNERS</p>
          </div>
        </div>

        <div className={`flex-1 grid grid-cols-1 ${canManage ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6 overflow-hidden pb-4`}>
          {/* Create Brand Panel — hidden for view-only roles */}
          {canManage && <div className="flex flex-col h-full overflow-hidden animate-slideInLeft">
            <div className="glass rounded-[2rem] p-6 flex flex-col h-full shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <Briefcase size={120} className="text-[var(--text-primary)]" />
              </div>

              <div className="flex items-center gap-3 mb-8 shrink-0">
                <div className={`w-10 h-10 rounded-xl ${editingBrand ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'} flex items-center justify-center`}>
                  {editingBrand ? <Edit size={20} /> : <Plus size={20} />}
                </div>
                <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight uppercase">
                  {editingBrand ? 'Edit Partner' : 'New Brand'}
                </h2>
              </div>

              <form onSubmit={handleAddBrand} className="flex-1 flex flex-col space-y-6 overflow-y-auto custom-scrollbar pr-2 pt-2">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Brand Name *</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-4 text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-bold transition-all text-sm placeholder:text-[var(--text-muted)]/50"
                      placeholder="e.g. Herman Miller"
                      value={newBrand.name}
                      onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Brand Logo</label>
                    <div
                      onClick={() => document.getElementById('logo-up').click()}
                      className="aspect-video bg-[var(--bg-tertiary)] border-2 border-dashed border-[var(--border-color)] rounded-xl flex flex-col items-center justify-center text-center p-3 cursor-pointer hover:border-blue-500/50 transition-all group overflow-hidden"
                    >
                      <input id="logo-up" type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                      {logoPreview ? (
                        <img src={logoPreview} className="h-full object-contain" alt="Preview" />
                      ) : (editingBrand && editingBrand.logo) ? (
                        <img src={`${BACKEND_URL}${editingBrand.logo}`} className="h-full object-contain" alt="Current Logo" />
                      ) : (
                        <>
                          <Upload size={20} className="text-[var(--text-muted)] group-hover:text-blue-500 mb-2" />
                          <p className="text-[9px] font-black text-[var(--text-primary)] uppercase tracking-tighter">Click to upload brand logo</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-auto shrink-0 flex flex-col gap-3">
                  <button
                    disabled={isSaving}
                    className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 border border-[var(--border-color)]
                      ${editingBrand ? 'bg-orange-500 shadow-orange-500/20' : 'bg-blue-600 shadow-blue-500/20'} text-white`}
                  >
                    {isSaving ? 'Synchronizing...' : (
                      <>
                        {editingBrand ? <Edit size={16} /> : <CheckCircle size={16} />}
                        {editingBrand ? 'Update Brand' : 'Add Brand'}
                      </>
                    )}
                  </button>
                  {editingBrand && (
                    <button
                      type="button"
                      onClick={cancelRevision}
                      className="w-full py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                    >
                      Cancel Revisions
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>}

          {/* Brands List Panel */}
          <div className="lg:col-span-2 flex flex-col h-full overflow-hidden animate-fadeIn">
            <div className="glass rounded-[2rem] flex flex-col h-full overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight leading-none">Registered Brands</h2>
                    <p className="text-[10px] text-[var(--text-muted)] font-bold tracking-widest mt-1">TOTAL: {brands.length} UNITS</p>
                  </div>
                </div>

                <div className="relative w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                  <input
                    type="text"
                    placeholder="Search entities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-2.5 pl-11 pr-4 text-[var(--text-primary)] text-[11px] font-bold focus:outline-none focus:border-orange-500 transition-all placeholder:text-[var(--text-muted)]/50"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                  </div>
                ) : filteredBrands.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] space-y-4">
                    <AlertCircle size={48} className="opacity-20 translate-y-2" />
                    <p className="text-xs font-black uppercase tracking-widest opacity-40">No brand entities located</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredBrands.map((brand) => (
                      <div key={brand.id} className="glass-card hover:bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] rounded-2xl p-4 flex items-center justify-between group transition-all duration-500">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-center overflow-hidden shrink-0">
                            {brand.logo ? (
                              <img src={brand.logo} alt="" className="w-full h-full object-contain p-1" />
                            ) : (
                              <Briefcase size={16} className="text-[var(--text-muted)]" />
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <h3 className="text-sm font-black text-[var(--text-primary)] truncate uppercase tracking-tight leading-none">{brand.name}</h3>
                            <p className="text-[9px] text-[var(--text-muted)] font-mono mt-1 opacity-60">ID: {brand.slug}</p>
                          </div>
                        </div>

                        {canManage && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEditing(brand)}
                              className="w-9 h-9 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteBrand(brand.id)}
                              className="w-9 h-9 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all hover:bg-red-500 hover:text-white"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {pagination && (
                <div className="px-4 border-t border-[var(--border-color)]">
                  <Pagination pagination={pagination} onPageChange={p => setPage(p)} />
                </div>
              )}
            </div>
          </div>
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

export default Brands;
