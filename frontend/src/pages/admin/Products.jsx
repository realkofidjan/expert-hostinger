import React, { useState, useEffect, useCallback } from 'react';
import Pagination from '../../components/admin/Pagination';
import api from '../../api';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Package, Plus, Search, Filter, MoreVertical,
  Edit, Trash2, ExternalLink, Download, Upload,
  AlertCircle, CheckCircle2, ChevronRight, LayoutGrid,
  List as ListIcon, ShoppingBag, ArrowUpRight, ArrowDownRight,
  Target, Briefcase, X, Palette, AlertTriangle, ArrowRight, Loader2, CheckCircle, FileSpreadsheet, ShieldCheck
} from 'lucide-react';
import { toast } from 'react-toastify';
import ConfirmModal from '../../components/admin/ConfirmModal';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useRole } from '../../utils/permissions';

const Products = () => {
  const { can } = useRole();
  const canManage = can('manageProducts');
  const [activeTab, setActiveTab] = useState('inventory');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    price: '',
    description: '',
    specifications: '',
    category_id: '',
    subcategory_id: '',
    brand: '',
    dimensions: '',
    weight_capacity: '',
    material: '',
    fabric_type: '',
    warranty: '',
    certifications: '',
    is_featured: false,
    status: 'active',
    variants: []
  });

  const [productImages, setProductImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);

  // New Bulk Flow State
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [importStatus, setImportStatus] = useState({ loading: false, result: null });
  const [confirm, setConfirm] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [deletedImageUrls, setDeletedImageUrls] = useState([]);

  const fetchProducts = useCallback(async (p = 1, q = '') => {
    try {
      setLoading(true);
      const response = await api.get(`/products?page=${p}&q=${encodeURIComponent(q)}&limit=12&_t=${Date.now()}`);
      setProducts(response.data?.products || []);
      setPagination(response.data?.pagination || null);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(page, searchTerm); fetchCategories(); }, [page]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchProducts(1, searchTerm); }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchCategories = async () => {
    try {
      const response = await api.get(`/categories?_t=${Date.now()}`);
      setCategories(response.data);
    } catch (err) {
      console.error('Failed to load categories');
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setProductImages(prev => [...prev, ...files]);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, { url: reader.result, isNew: true, file }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveImage = (index) => {
    const preview = imagePreviews[index];
    
    // If it's an existing image (not a new upload), mark it for backend deletion
    if (!preview.isNew) {
      const urlToDelete = preview.url.replace(BACKEND_URL, '');
      setDeletedImageUrls(prev => [...prev, urlToDelete]);
    } else {
      // If it's a newly selected local file, remove it from the productImages state
      setProductImages(prev => prev.filter(f => f !== preview.file));
    }

    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const startEditing = async (product) => {
    try {
      const response = await api.get(`/products/${product.id}`);
      const detailedProduct = response.data;

      setEditingProduct(detailedProduct);
      setNewProduct({
        name: detailedProduct.name,
        sku: detailedProduct.sku,
        price: detailedProduct.price,
        description: detailedProduct.description,
        specifications: detailedProduct.specifications || '',
        category_id: detailedProduct.category_id || '',
        subcategory_id: detailedProduct.subcategory_id || '',
        brand: detailedProduct.brand || '',
        dimensions: detailedProduct.dimensions || '',
        weight_capacity: detailedProduct.weight_capacity || '',
        material: detailedProduct.material || '',
        fabric_type: detailedProduct.fabric_type || '',
        warranty: detailedProduct.warranty || '',
        certifications: detailedProduct.certifications || '',
        is_featured: detailedProduct.is_featured,
        status: detailedProduct.status || 'active',
        variants: detailedProduct.variants || []
      });
      setImagePreviews(detailedProduct.images ? detailedProduct.images.map(img => ({
        url: img.image_url.startsWith('http') ? img.image_url : `${BACKEND_URL}${img.image_url}`,
        isNew: false
      })) : []);
      setActiveTab('add');
    } catch (err) {
      toast.error('Failed to load product details');
    }
  };

  const closePanel = () => {
    setEditingProduct(null);
    setNewProduct({
      name: '', sku: '', price: '',
      description: '', specifications: '', category_id: '', subcategory_id: '',
      brand: '', dimensions: '',
      weight_capacity: '', material: '', fabric_type: '', warranty: '', certifications: '',
      is_featured: false, status: 'active',
      variants: []
    });
    setProductImages([]);
    setImagePreviews([]);
    setDeletedImageUrls([]);
  };

  const handleAddVariant = () => {
    setNewProduct({
      ...newProduct,
      variants: [...newProduct.variants, { color_name: '', stock_quantity: 0 }]
    });
  };

  const handleRemoveVariant = (index) => {
    const newVariants = [...newProduct.variants];
    newVariants.splice(index, 1);
    setNewProduct({ ...newProduct, variants: newVariants });
  };

  const handleVariantChange = (index, field, value) => {
    const newVariants = [...newProduct.variants];
    newVariants[index][field] = value;
    setNewProduct({ ...newProduct, variants: newVariants });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const formData = new FormData();
      Object.keys(newProduct).forEach(key => {
        if (key === 'variants') {
          formData.append(key, JSON.stringify(newProduct[key]));
        } else {
          formData.append(key, newProduct[key]);
        }
      });

      productImages.forEach(file => {
        formData.append('images', file);
      });

      if (deletedImageUrls.length > 0) {
        formData.append('deleted_image_urls', JSON.stringify(deletedImageUrls));
      }

      if (editingProduct) {
        await api.put(`/admin/products/${editingProduct.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Product updated successfully');
      } else {
        await api.post('/admin/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Product created successfully');
      }

      closePanel();
      setActiveTab('inventory');
      fetchProducts(page, searchTerm);
    } catch (error) {
      console.error('SUBMIT_ERROR:', error);
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/admin/products/template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'product_upload_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Template downloaded successfully');
    } catch (err) {
      console.error('Download Error:', err);
      toast.error('Failed to download template. Please check authorization.');
    }
  };

  const handleValidate = async () => {
    if (!bulkFile) return toast.warn('Please select a file first');

    const formData = new FormData();
    formData.append('file', bulkFile);

    setValidating(true);
    try {
      const response = await api.post('/admin/bulk-upload/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setValidationResult(response.data);
      toast.info('Validation complete. Please review the table.');
    } catch (err) {
      console.error('Validation Error:', err);
      toast.error(err.response?.data?.error || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!validationResult || validationResult.summary.errors > 0) {
      return toast.error('Check all rows for errors before importing');
    }

    setImportStatus({ loading: true, result: null });
    try {
      const response = await api.post('/admin/bulk-upload/confirm', {
        products: validationResult.rows
      });
      setImportStatus({ loading: false, result: response.data });
      toast.success('Import Successful!');
      setValidationResult(null);
      setBulkFile(null);
      fetchProducts(page, searchTerm);
    } catch (err) {
      console.error('Import Error:', err);
      toast.error('Final import failed');
      setImportStatus({ loading: false, result: null });
    }
  };

  const resetBulkUpload = () => {
    setBulkFile(null);
    setValidationResult(null);
    setImportStatus({ loading: false, result: null });
  };

  const handleDeleteProduct = (id) => {
    setConfirm({
      show: true,
      title: 'Delete Product',
      message: 'This will permanently delete the product and all its images. This action cannot be undone.',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/products/${id}`);
          toast.success('Product deleted');
          fetchProducts(page, searchTerm);
        } catch (err) {
          toast.error('Delete failed');
        }
      }
    });
  };

  const filteredProducts = products;

  return (
    <AdminLayout>
      <div className="h-full flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Product Inventory</h1>
            <p className="text-[var(--text-muted)] mt-1 uppercase tracking-widest text-[10px] font-bold text-yellow-500">EXPERT OFFICE COMMAND CENTER</p>
          </div>

          <div className="flex bg-[var(--bg-secondary)] p-1.5 rounded-2xl border border-[var(--border-color)] shrink-0">
            {[
              { id: 'inventory', label: 'Inventory', icon: <ListIcon size={16} /> },
              ...(canManage ? [
                { id: 'add', label: 'Add Product', icon: <Plus size={16} /> },
                { id: 'bulk', label: 'Bulk Import', icon: <Upload size={16} /> }
              ] : [])
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'add' && !editingProduct) closePanel();
                  setActiveTab(tab.id);
                }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300
                  ${activeTab === tab.id
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'inventory' && (
            <div className="h-full flex flex-col space-y-4">
              <div className="glass p-4 rounded-3xl flex items-center justify-between shrink-0">
                <div className="relative w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                  <input
                    type="text"
                    placeholder="Filter products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-2.5 pl-12 pr-4 text-[var(--text-primary)] focus:outline-none focus:border-green-500 transition-all text-sm font-medium"
                  />
                </div>
                <div className="flex items-center gap-6 pr-4">
                  <div className="text-right">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-black">Stock Status</p>
                    <p className="text-xl font-bold text-green-500">{pagination?.total ?? products.length} Products Active</p>
                  </div>
                </div>
              </div>

              <div className="glass rounded-[2rem] overflow-hidden flex flex-col">
                {loading ? (
                  <div className="grid gap-4 p-6" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="rounded-2xl bg-[var(--bg-secondary)] animate-pulse overflow-hidden">
                        <div className="aspect-[4/3] bg-[var(--bg-tertiary)]" />
                        <div className="p-3 space-y-2">
                          <div className="h-3 bg-[var(--bg-tertiary)] rounded w-3/4" />
                          <div className="h-2.5 bg-[var(--bg-tertiary)] rounded w-1/2" />
                          <div className="h-3 bg-[var(--bg-tertiary)] rounded w-1/3 mt-3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="py-24 text-center text-[var(--text-muted)]">
                    <ShoppingBag size={40} className="mx-auto mb-3 opacity-20" />
                    <p className="font-bold text-sm">No products found</p>
                  </div>
                ) : (
                  <div className="grid gap-4 p-6" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="group rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/5 transition-all duration-300 flex flex-col"
                      >
                        {/* Image */}
                        <div className="aspect-[4/3] bg-[var(--bg-tertiary)] overflow-hidden relative">
                          {product.primary_image ? (
                            <img
                              src={`${BACKEND_URL}${product.primary_image}`}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                              <ShoppingBag size={28} />
                            </div>
                          )}
                          {/* Stock badge */}
                          <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black border ${
                            parseInt(product.stock) > 0
                              ? 'bg-green-500/80 text-white border-green-400/50'
                              : 'bg-red-500/80 text-white border-red-400/50'
                          }`}>
                            {parseInt(product.stock) > 0 ? `${product.stock} in stock` : 'Out of stock'}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="p-3 flex flex-col flex-1">
                          <p className="font-bold text-[var(--text-primary)] text-sm leading-tight line-clamp-2 mb-1">{product.name}</p>
                          <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-2">SKU: {product.sku || '—'}</p>

                          <div className="flex items-center gap-1.5 flex-wrap mb-2">
                            {product.category_name && (
                              <span className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded text-[9px] font-bold uppercase tracking-wide border border-[var(--border-color)]">
                                {product.category_name}
                              </span>
                            )}
                            {product.brand && (
                              <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded text-[9px] font-bold uppercase tracking-wide border border-blue-500/20">
                                {product.brand}
                              </span>
                            )}
                          </div>

                          <p className="text-green-500 font-black text-base mt-auto">
                            ₵{parseFloat(product.price).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        {/* Actions */}
                        {canManage && (
                          <div className="flex border-t border-[var(--border-color)]">
                            <button
                              onClick={() => startEditing(product)}
                              className="flex-1 py-2.5 text-xs font-bold text-blue-500 hover:bg-blue-500/10 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Edit size={13} /> Edit
                            </button>
                            <div className="w-px bg-[var(--border-color)]" />
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="flex-1 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {pagination && (
                  <div className="px-6 py-2 border-t border-[var(--border-color)]">
                    <Pagination pagination={pagination} onPageChange={p => setPage(p)} />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'add' && (
            <div className="h-full overflow-y-auto custom-scrollbar pr-4 animate-fadeIn max-h-[calc(100vh-180px)]">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-12">
                {/* Left Panel: Basic Info */}
                <div className="lg:col-span-2 flex flex-col h-full space-y-4">
                  <div className="glass rounded-[2rem] border border-[var(--border-color)] p-6 flex flex-col flex-1 shadow-2xl overflow-hidden">
                    <div className="flex items-center gap-4 mb-8 shrink-0">
                      <div className={`w-14 h-14 rounded-2xl ${editingProduct ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'} flex items-center justify-center shadow-inner`}>
                        {editingProduct ? <Edit size={24} /> : <Plus size={24} />}
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight uppercase">{editingProduct ? 'Edit Product' : 'New Product'}</h2>
                        <p className="text-[10px] text-[var(--text-muted)] font-bold tracking-[0.2em] mt-1 uppercase">
                          {editingProduct ? `REVISING UNIT ID: ${editingProduct.id}` : 'CREATE UNIT PRODUCT'}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 max-h-[calc(100vh-320px)]">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Product Name *</label>
                          <input
                            type="text" required
                            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm"
                            value={newProduct.name}
                            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">SKU *</label>
                          <input
                            type="text" required
                            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm uppercase"
                            value={newProduct.sku}
                            onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value.toUpperCase() })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Category *</label>
                          <select
                            required
                            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm appearance-none"
                            value={newProduct.category_id}
                            onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })}
                          >
                            <option value="">Select Category</option>
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Subcategory</label>
                          <select
                            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm appearance-none"
                            value={newProduct.subcategory_id}
                            onChange={(e) => setNewProduct({ ...newProduct, subcategory_id: e.target.value })}
                          >
                            <option value="">Select Subcategory</option>
                            {categories.find(c => c.id == newProduct.category_id)?.subcategories?.map(sub => (
                              <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Brand</label>
                          <input
                            type="text"
                            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm"
                            value={newProduct.brand}
                            onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">₵ Price (GHS) </label>
                            <input
                              required type="number"
                              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 font-bold text-sm"
                              value={newProduct.price}
                              onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                            />
                          </div>
                          {newProduct.variants?.length === 0 && (
                            <div className="animate-scaleIn">
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Initial Stock</label>
                              <input
                                required type="number" min="0"
                                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-yellow-500 font-bold text-sm"
                                value={newProduct.stock || 0}
                                onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Rich Text Description */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">Product Narrative (Description) *</label>
                        <div className="quill-wrapper rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                          <ReactQuill 
                            theme="snow"
                            value={newProduct.description}
                            onChange={(content) => setNewProduct({ ...newProduct, description: content })}
                            className="min-h-[200px]"
                            modules={{
                              toolbar: [
                                [{ 'header': [1, 2, 3, false] }],
                                ['bold', 'italic', 'underline', 'strike'],
                                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                ['link', 'clean']
                              ],
                            }}
                          />
                        </div>
                      </div>

                      {/* Technical Specifications Section */}
                      <div className="space-y-4 pt-6 mt-6 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/30 p-6 rounded-[2rem] border border-dashed">
                        <div className="flex items-center gap-2 mb-4">
                          <Target size={18} className="text-blue-500" />
                          <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider">Technical Specifications</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Standard Dimensions (W x H x D)</label>
                            <input
                              type="text"
                              placeholder="e.g. 120cm x 75cm x 60cm"
                              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-blue-500 text-sm"
                              value={newProduct.dimensions}
                              onChange={(e) => setNewProduct({ ...newProduct, dimensions: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Weight Capacity</label>
                            <input
                              type="text"
                              placeholder="e.g. 150kg / 330lbs"
                              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-blue-500 text-sm"
                              value={newProduct.weight_capacity}
                              onChange={(e) => setNewProduct({ ...newProduct, weight_capacity: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Base Material</label>
                            <input
                              type="text"
                              placeholder="e.g. Reinforced Aluminum"
                              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-blue-500 text-sm"
                              value={newProduct.material}
                              onChange={(e) => setNewProduct({ ...newProduct, material: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Fabric / Finish Type</label>
                            <input
                              type="text"
                              placeholder="e.g. High-Density Mesh"
                              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-blue-500 text-sm"
                              value={newProduct.fabric_type}
                              onChange={(e) => setNewProduct({ ...newProduct, fabric_type: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Warranty Period</label>
                            <input
                              type="text"
                              placeholder="e.g. 24 Months International"
                              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-blue-500 text-sm"
                              value={newProduct.warranty}
                              onChange={(e) => setNewProduct({ ...newProduct, warranty: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Certifications</label>
                            <input
                              type="text"
                              placeholder="e.g. ISO-9001, BIFMA"
                              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-blue-500 text-sm"
                              value={newProduct.certifications}
                              onChange={(e) => setNewProduct({ ...newProduct, certifications: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-[var(--border-color)] border-dotted">
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Additional Technical Notes (Optional)</label>
                          <div className="quill-wrapper rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                            <ReactQuill 
                              theme="snow"
                              value={newProduct.specifications}
                              onChange={(content) => setNewProduct({ ...newProduct, specifications: content })}
                              className="min-h-[100px]"
                              placeholder="Any other technical details..."
                              modules={{
                                toolbar: [['bold', 'italic', 'underline'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['clean']]
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Variants Section */}
                      <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Palette size={16} className="text-yellow-500" />
                            <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest">Color Variants & Stock</h3>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddVariant}
                            className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500 hover:text-white transition-all shadow-lg shadow-yellow-500/10"
                          >
                            <Plus size={14} />
                            Add Variant
                          </button>
                        </div>

                        {newProduct.variants.length === 0 ? (
                          <div className="p-10 border-2 border-dashed border-[var(--border-color)] rounded-3xl flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 bg-[var(--bg-secondary)] rounded-2xl flex items-center justify-center text-[var(--text-muted)] mb-4">
                              <Palette size={24} />
                            </div>
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">No variants defined yet</p>
                            <p className="text-[9px] text-[var(--text-muted)]/60 mt-1">Add colors to manage stock individually</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {newProduct.variants.map((variant, index) => (
                              <div key={index} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center gap-4 relative group animate-slideUp">
                                <div className="flex-1 space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-[8px] font-black text-[var(--text-muted)] uppercase mb-1 tracking-widest">Color Name</label>
                                      <input
                                        type="text" required
                                        placeholder="e.g. Midnight Black"
                                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-primary)] text-[11px] focus:outline-none focus:border-yellow-500"
                                        value={variant.color_name}
                                        onChange={(e) => handleVariantChange(index, 'color_name', e.target.value)}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-black text-[var(--text-muted)] uppercase mb-1 tracking-widest">Color Code</label>
                                      <div className="flex gap-1">
                                        <input
                                          type="color"
                                          className="w-8 h-8 rounded p-0 border-0 bg-transparent cursor-pointer"
                                          value={variant.color_code || '#6b7280'}
                                          onChange={(e) => handleVariantChange(index, 'color_code', e.target.value)}
                                        />
                                        <input
                                          type="text"
                                          placeholder="#Hex"
                                          className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-primary)] text-[11px] uppercase"
                                          value={variant.color_code || ''}
                                          onChange={(e) => handleVariantChange(index, 'color_code', e.target.value)}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-[8px] font-black text-[var(--text-muted)] uppercase mb-1 tracking-widest">Stock Units</label>
                                    <input
                                      type="number" required
                                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-primary)] text-[11px] font-bold focus:outline-none focus:border-yellow-500"
                                      value={variant.stock_quantity}
                                      onChange={(e) => handleVariantChange(index, 'stock_quantity', e.target.value)}
                                    />
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariant(index)}
                                  className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Assets & Status */}
                <div className="flex flex-col h-full space-y-4">
                  {/* Product Images */}
                  <div className="glass rounded-[2rem] border border-[var(--border-color)] p-5 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Upload size={16} className="text-orange-500" />
                        <h3 className="font-bold text-[var(--text-primary)] text-xs tracking-tight">Product Images</h3>
                      </div>
                      <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase">{imagePreviews.length}/10 images</span>
                    </div>

                    <div
                      onClick={() => document.getElementById('img-up').click()}
                      className="aspect-square bg-[var(--bg-tertiary)] border-2 border-dashed border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center text-center p-3 cursor-pointer hover:border-green-500/50 transition-all group overflow-hidden"
                    >
                      <input id="img-up" type="file" className="hidden" accept="image/*" multiple onChange={handleImageChange} />
                      {imagePreviews.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 w-full h-full overflow-y-auto p-1 custom-scrollbar">
                          {imagePreviews.map((preview, i) => (
                            <div key={i} className="relative group/img aspect-square rounded-lg border border-[var(--border-color)] overflow-hidden bg-[var(--bg-secondary)]">
                              <img 
                                src={preview.url} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" 
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveImage(i);
                                }}
                                className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition-all shadow-lg hover:bg-red-600 active:scale-95"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                          <div className="aspect-square bg-[var(--bg-secondary)] rounded-lg border-2 border-dashed border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)]">
                            <Plus size={20} />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 bg-[var(--bg-secondary)] rounded-xl flex items-center justify-center text-[var(--text-muted)] mb-2 group-hover:text-green-500 group-hover:scale-110 transition-all">
                            <Upload size={20} />
                          </div>
                          <p className="text-[9px] font-black text-[var(--text-primary)] uppercase tracking-tighter">Click to upload or drag</p>
                          <p className="text-[8px] text-[var(--text-muted)] mt-1 uppercase tracking-widest font-bold leading-tight">PNG, JPG up to 5MB</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status & Action */}
                  <div className="glass rounded-[2rem] border border-[var(--border-color)] p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 size={16} className="text-green-500" />
                        <h3 className="font-bold text-[var(--text-primary)] text-xs tracking-tight leading-none">Set status</h3>
                      </div>

                      <div className="space-y-3">
                        <div
                          onClick={() => setNewProduct({ ...newProduct, status: 'active' })}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${newProduct.status === 'active' ? 'border-green-500' : 'border-[var(--border-color)]'}`}>
                            {newProduct.status === 'active' && <div className="w-2 h-2 rounded-full bg-green-500 animate-scaleIn"></div>}
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-[var(--text-primary)] tracking-tight">Active</p>
                            <p className="text-[9px] text-[var(--text-muted)] font-medium">Visible to global consumers</p>
                          </div>
                        </div>
                        <div
                          onClick={() => setNewProduct({ ...newProduct, status: 'inactive' })}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${newProduct.status === 'inactive' ? 'border-red-500' : 'border-[var(--border-color)]'}`}>
                            {newProduct.status === 'inactive' && <div className="w-2 h-2 rounded-full bg-red-500 animate-scaleIn"></div>}
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-[var(--text-primary)] tracking-tight">Inactive</p>
                            <p className="text-[9px] text-[var(--text-muted)] font-medium">Hidden from public storefront</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] checked:bg-yellow-500 transition-all cursor-pointer"
                            checked={newProduct.is_featured}
                            onChange={(e) => setNewProduct({ ...newProduct, is_featured: e.target.checked })}
                          />
                          <div>
                            <p className="text-[11px] font-bold text-[var(--text-primary)] tracking-tight leading-none">Featured Unit</p>
                            <p className="text-[9px] text-[var(--text-muted)] font-medium mt-1">Prioritize in home highlights</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="pt-6 space-y-3">
                      {editingProduct && (
                        <button
                          type="button"
                          onClick={closePanel}
                          className="w-full py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                        >
                          Cancel Revisions
                        </button>
                      )}
                      <button type="submit" disabled={isSaving} className="w-full py-4 bg-gradient-to-br from-green-600 to-green-500 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all border border-[var(--border-color)] uppercase tracking-[0.2em] disabled:opacity-50">
                        {isSaving ? 'Synchronizing...' : (editingProduct ? 'Submit Changes' : 'Add Product')}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'bulk' && (
            <div className="h-full overflow-y-auto custom-scrollbar animate-fadeIn space-y-8 pr-2">
              {!validationResult && !importStatus.result && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
                  <div className="glass-blue rounded-[2rem] border border-blue-500/20 p-8 flex flex-col justify-between shadow-xl">
                    <div>
                      <h3 className="text-blue-400 font-bold text-sm uppercase tracking-widest mb-4">ACCEPTED FORMATS</h3>
                      <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-xs font-bold text-[var(--text-secondary)]">
                          <CheckCircle size={14} className="text-blue-500" /> Excel Spreadsheet (.xlsx, .xls)
                        </li>
                        <li className="flex items-center gap-3 text-xs font-bold text-[var(--text-secondary)]">
                          <CheckCircle size={14} className="text-blue-500" /> Google Photos Share Links (Automation)
                        </li>
                        <li className="flex items-center gap-3 text-xs font-bold text-[var(--text-secondary)]">
                          <CheckCircle size={14} className="text-blue-500" /> Pre-import validation included
                        </li>
                      </ul>
                    </div>
                    <div className="mt-10 flex items-center justify-between">
                      <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-blue-600 shadow-lg shadow-blue-500/20 active:scale-95">
                        <Download size={16} />
                        Download Template
                      </button>
                    </div>
                  </div>

                  <div className="glass-green rounded-[2rem] border border-green-500/20 p-8 shadow-xl">
                    <h3 className="text-green-500 font-bold text-sm uppercase tracking-widest mb-4">SPECIFICATIONS</h3>
                    <p className="text-2xl font-black text-[var(--text-primary)] leading-tight mb-4">Bulk Product Import</p>
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em]">Required Columns</span>
                        <div className="flex flex-wrap gap-2">
                          {['Name', 'SKU', 'Price', 'Category', 'Subcategory', 'Brand', 'Stock', 'Variants'].map(col => (
                            <span key={col} className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[9px] font-bold text-[var(--text-primary)]">{col}</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest leading-relaxed">
                        Automatic image downloading supported for Google Photos links.
                      </p>
                    </div>
                  </div>

                  <div className="lg:col-span-2 glass rounded-[2.5rem] border border-[var(--border-color)] p-10 shadow-2xl space-y-10 bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-secondary)] mb-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[var(--border-color)] pb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                          <ShieldCheck size={28} />
                        </div>
                        <div>
                          <h3 className="text-[var(--text-primary)] font-black text-lg uppercase tracking-wider leading-none">How to Use Bulk Import</h3>
                          <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Follow these steps to import your products correctly</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-4 py-2 bg-[var(--bg-tertiary)] rounded-xl text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest border border-[var(--border-color)]">Excel / .xlsx</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div> Steps to Follow
                        </h4>
                        <div className="grid grid-cols-1 gap-4">
                          {[
                            { title: 'CATEGORIES & BRANDS', text: 'Use the exact category and brand names as set up in your admin.' },
                            { title: 'PRODUCT IMAGES', text: 'For multiple images, add comma-separated Google Photos share links.' },
                            { title: 'GOOGLE PHOTOS ALBUMS', text: 'Google Photos album links will import all photos from that album.' }
                          ].map((item, i) => (
                            <div key={i} className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl">
                              <p className="text-[9px] font-black text-[var(--text-primary)] uppercase tracking-widest mb-1">{item.title}</p>
                              <p className="text-[10px] text-[var(--text-muted)] font-medium leading-relaxed">{item.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-500"></div> Important Notes
                        </h4>
                        <div className="grid grid-cols-1 gap-4">
                          {[
                            { title: 'STOCK & VARIANTS', text: 'If you add variants (e.g. Black:10, White:5), leave the Stock column empty.' },
                            { title: 'CATEGORY & BRAND NAMES', text: 'Use category and brand names, not ID numbers.' },
                            { title: 'FILE REQUIREMENTS', text: 'Do not upload password-protected or corrupted spreadsheet files.' }
                          ].map((item, i) => (
                            <div key={i} className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
                              <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">{item.title}</p>
                              <p className="text-[10px] text-[var(--text-muted)] font-medium leading-relaxed">{item.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-[var(--border-color)] flex items-center justify-between">
                      <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest italic opacity-60">Ready to import</p>
                      <div className="flex gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse delay-75"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse delay-150"></div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 glass rounded-[3rem] p-12 border border-[var(--border-color)] flex flex-col items-center justify-center text-center shadow-2xl bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-secondary)]">
                    <div className={`w-24 h-24 rounded-[2rem] mb-8 flex items-center justify-center transition-all duration-700
                      ${bulkFile ? 'bg-green-500 text-[#0f172a] shadow-2xl rotate-6' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>
                      <FileSpreadsheet size={48} />
                    </div>

                    <h2 className="text-3xl font-black text-[var(--text-primary)] mb-3">
                      {bulkFile ? bulkFile.name : 'Upload your spreadsheet'}
                    </h2>
                    <p className="text-[var(--text-muted)] mb-10 max-w-lg text-sm font-bold uppercase tracking-wider">
                      Validate your file first, then import products in one click.
                    </p>

                    <div className="flex flex-wrap justify-center items-center gap-6">
                      <label className="cursor-pointer group">
                        <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => setBulkFile(e.target.files[0])} disabled={validating} />
                        <div className="px-10 py-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl group-hover:bg-[var(--bg-tertiary)] transition-all font-black flex items-center gap-3 text-[var(--text-primary)] shadow-sm uppercase tracking-widest text-[10px]">
                          <Upload size={16} className="text-blue-500" />
                          {bulkFile ? 'Change File' : 'Choose File'}
                        </div>
                      </label>

                      {bulkFile && (
                        <button
                          onClick={handleValidate}
                          disabled={validating}
                          className="px-12 py-4 bg-green-500 rounded-2xl font-black text-[#0f172a] hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 transition-all shadow-xl flex items-center gap-3 disabled:opacity-50 uppercase tracking-widest text-[10px]"
                        >
                          {validating ? (
                            <>
                              <Loader2 size={18} className="animate-spin" />
                              Validating...
                            </>
                          ) : (
                            <>
                              <ArrowRight size={18} />
                              Validate File
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {validationResult && (
                <div className="space-y-6 animate-slideInUp pb-12">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass p-6 rounded-3xl border border-[var(--border-color)]">
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Total Rows</p>
                      <p className="text-3xl font-black text-[var(--text-primary)]">{validationResult.summary.total}</p>
                    </div>
                    <div className="glass p-6 rounded-3xl border border-green-500/20 bg-green-500/5">
                      <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Ready to Import</p>
                      <p className="text-3xl font-black text-green-500">{validationResult.summary.valid} Products</p>
                    </div>
                    <div className={`glass p-6 rounded-3xl border ${validationResult.summary.errors > 0 ? 'border-red-500/40 bg-red-500/10' : 'border-[var(--border-color)]'}`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${validationResult.summary.errors > 0 ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>Errors</p>
                      <p className={`text-3xl font-black ${validationResult.summary.errors > 0 ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>{validationResult.summary.errors} Issues</p>
                    </div>
                  </div>

                  {/* Preflight Table */}
                  <div className="glass rounded-[2rem] overflow-hidden border border-[var(--border-color)] shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[var(--bg-secondary)]/80 border-b border-[var(--border-color)]">
                            <th className="px-6 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">STATUS</th>
                            <th className="px-6 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">SKU</th>
                            <th className="px-6 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Product Name</th>
                            <th className="px-6 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">CATEGORY</th>
                            <th className="px-6 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">BRAND</th>
                            <th className="px-6 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">PRICE</th>
                            <th className="px-6 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">STOCK</th>
                            <th className="px-6 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-center">VARIANTS</th>
                            <th className="px-6 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-center">Images</th>
                            <th className="px-6 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Issues</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                          {validationResult.rows.map((row, idx) => (
                            <tr key={idx} className={`group hover:bg-[var(--bg-secondary)]/40 transition-colors ${!row.isValid ? 'bg-red-500/5' : ''}`}>
                              <td className="px-6 py-5">
                                {row.isValid ? (
                                  <div className="w-6 h-6 rounded-lg bg-green-500 flex items-center justify-center text-[#0f172a] shadow-lg shadow-green-500/20">
                                    <CheckCircle size={14} />
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 rounded-lg bg-red-500 flex items-center justify-center text-[#0f172a] shadow-lg shadow-red-500/20">
                                    <AlertTriangle size={14} />
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-5 font-mono text-[10px] font-black text-[var(--text-primary)]">{row.sku}</td>
                              <td className="px-6 py-5 text-xs font-bold text-[var(--text-secondary)]">{row.name}</td>
                              <td className="px-6 py-5 text-[10px] text-[var(--text-muted)]">{row.Category || row.category || '—'}</td>
                              <td className="px-6 py-5 text-[10px] text-[var(--text-muted)]">{row.brand || '—'}</td>
                              <td className="px-6 py-5 text-[10px] font-bold text-[var(--text-primary)] text-right">{row.price != null ? `₵${Number(row.price).toFixed(2)}` : '—'}</td>
                              <td className="px-6 py-5 text-[10px] text-[var(--text-muted)] text-right">{row.Stock ?? row.stock ?? '—'}</td>
                              <td className="px-6 py-5 text-center">
                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter ${row.variants.length > 0 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>
                                  {row.variants.length} COLORS
                                </span>
                              </td>
                              <td className="px-6 py-5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Upload size={12} className={row.imageUrls.length > 0 ? 'text-blue-500' : 'text-[var(--text-muted)]'} />
                                  <span className="text-[10px] font-bold text-[var(--text-primary)]">{row.imageUrls.length}</span>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                {row.errors.length > 0 ? (
                                  <div className="flex flex-row gap-2 overflow-x-auto max-w-[300px] whitespace-nowrap custom-scrollbar pb-1">
                                    {row.errors.map((err, i) => (
                                      <span key={i} className="flex-shrink-0 text-[8px] bg-red-500/10 text-red-400 px-2.5 py-1.5 rounded-lg font-black flex items-center gap-1.5 border border-red-500/20 uppercase tracking-tighter">
                                        <AlertTriangle size={10} /> {err}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-green-500 font-black uppercase tracking-widest opacity-40">Ready</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Preflight Controls */}
                  <div className="flex items-center justify-between p-8 glass rounded-[2.5rem] bg-yellow-500/5 border border-yellow-500/10 shadow-xl">
                    <div className="flex items-center gap-4 text-yellow-500/80">
                      <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center">
                        <AlertCircle size={24} />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Next Step</p>
                        <p className="text-sm font-bold text-[var(--text-secondary)]">
                          {validationResult.summary.errors > 0
                            ? "Errors found. Fix your spreadsheet and validate again."
                            : "All products are valid. Click Import to add them to your store."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <button
                        onClick={resetBulkUpload}
                        className="text-[10px] font-black text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-[0.2em] underline underline-offset-8 decoration-2"
                      >
                        Start Over
                      </button>
                      <button
                        onClick={handleConfirmImport}
                        disabled={validationResult.summary.errors > 0 || importStatus.loading}
                        className="px-12 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-black text-[xs] uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.05] active:scale-[0.95] transition-all disabled:opacity-20 disabled:scale-100 flex items-center gap-3 border border-indigo-400/30"
                      >
                        {importStatus.loading ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            Import Products <ArrowRight size={18} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {importStatus.result && (
                <div className="glass p-12 rounded-[4rem] text-center space-y-8 animate-slideInUp shadow-2xl border border-green-500/20 max-w-4xl mx-auto overflow-hidden">
                  <div className="w-20 h-20 bg-green-500 rounded-[2rem] mx-auto flex items-center justify-center text-[#0f172a] shadow-2xl rotate-6">
                    <CheckCircle size={40} />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black text-[var(--text-primary)] uppercase tracking-tight">Import Complete</h2>
                    <p className="text-lg text-[var(--text-muted)] font-bold mt-4 uppercase tracking-[0.1em]">
                      {importStatus.result.summary.success} of {importStatus.result.summary.total} Products Added
                    </p>
                  </div>

                  {importStatus.result.errors.length > 0 && (
                    <div className="text-left w-full space-y-4 max-h-64 overflow-y-auto pr-4 custom-scrollbar">
                      <p className="text-[10px] font-black text-red-400 uppercase tracking-widest pl-2">Failed to Import ({importStatus.result.errors.length})</p>
                      <div className="space-y-2">
                        {importStatus.result.errors.map((err, i) => (
                          <div key={i} className="glass p-4 rounded-2xl border border-red-500/20 bg-red-500/5 flex items-center justify-between gap-4">
                            <div className="overflow-hidden">
                              <p className="text-xs font-black text-[var(--text-primary)] uppercase tracking-tight truncate">{err.name || 'Unknown Item'}</p>
                              <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">SKU: {err.sku || 'N/A'}</p>
                            </div>
                            <p className="text-[10px] text-red-500 font-bold bg-red-500/10 px-3 py-1 rounded-lg border border-red-500/20 uppercase tracking-tighter">
                              {err.error}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={resetBulkUpload}
                    className="px-12 py-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] hover:border-green-500/50 transition-all shadow-xl"
                  >
                    Import More Products
                  </button>
                </div>
              )}
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

export default Products;
