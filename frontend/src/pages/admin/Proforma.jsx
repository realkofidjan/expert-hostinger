import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Search,
  Plus,
  Trash2,
  FileText,
  Download,
  X,
  PlusCircle,
  ClipboardCheck,
  Building2,
  Calendar,
  ShieldCheck,
  Loader2,
  Trash,
  Package,
  ArrowLeft,
  Edit3,
  Send,
  Eye
} from 'lucide-react';
import { toast } from 'react-toastify';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '')?.replace(/\/$/, '') || '';
const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_URL}${cleanPath}`;
};

const Proforma = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' or 'create'
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [sendPreview, setSendPreview] = useState(null);
  const [sending, setSending] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    client_name: '',
    client_address: '',
    client_email: '',
    items: [],
    vat_percentage: 20.0,
    warranty: '3 years',
    delivery_terms: 'IMMEDIATE',
    payment_terms: '21 DAYS',
    validity_days: '10 DAYS'
  });

  // Product Selection State
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/proforma');
      setInvoices(res.data || []);
    } catch {
      toast.error('Failed to fetch proforma invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const searchProducts = async (q) => {
    if (q.length < 2) {
      setProductResults([]);
      return;
    }
    setSearchingProducts(true);
    try {
      const res = await api.get(`/products?q=${encodeURIComponent(q)}&limit=5`);
      setProductResults(res.data.products || []);
    } catch {
      setProductResults([]);
    } finally {
      setSearchingProducts(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => searchProducts(productSearch), 300);
    return () => clearTimeout(t);
  }, [productSearch]);

  const addItem = (product) => {
    const exists = formData.items.find(item => item.id === product.id);
    if (exists) {
      toast.info('Item already added');
      return;
    }

    const newItem = {
      id: product.id,
      name: product.name,
      description: product.description?.replace(/<[^>]*>/g, '').slice(0, 100) || '',
      image: product.primary_image || product.image_url || (product.images?.[0]?.url) || (product.cover_photo),
      price: parseFloat(product.price || 0),
      quantity: 1,
      total: parseFloat(product.price || 0)
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    setProductSearch('');
    setProductResults([]);
  };

  const updateItemQty = (id, qty) => {
    const q = Math.max(1, parseInt(qty) || 1);
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id ? { ...item, quantity: q, total: q * item.price } : item
      )
    }));
  };

  const removeItem = (id) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleDownload = async (id, invoiceNumber) => {
    try {
      toast.info('Preparing official PDF...');
      const res = await api.get(`/admin/proforma/${id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Proforma_${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Proforma downloaded');
    } catch (err) {
      toast.error('Failed to download PDF');
    }
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((acc, item) => acc + item.total, 0);
    const vat = subtotal * (formData.vat_percentage / 100);
    const total = subtotal + vat;
    return { subtotal, vat, total };
  };

  const handleEdit = (inv) => {
    const items = typeof inv.items === 'string' ? JSON.parse(inv.items || '[]') : (inv.items || []);
    setFormData({
      client_name: inv.client_name || '',
      client_address: inv.client_address || '',
      client_email: inv.client_email || '',
      items: items,
      vat_percentage: parseFloat(inv.vat_percentage || 20.0),
      warranty: inv.warranty || '3 years',
      delivery_terms: inv.delivery_terms || 'IMMEDIATE',
      payment_terms: inv.payment_terms || '21 DAYS',
      validity_days: inv.validity_days || '10 DAYS'
    });
    setEditingId(inv.id);
    setEditMode(true);
    setView('create');
  };

  const resetForm = () => {
    setFormData({
      client_name: '',
      client_address: '',
      client_email: '',
      items: [],
      vat_percentage: 20.0,
      warranty: '3 years',
      delivery_terms: 'IMMEDIATE',
      payment_terms: '21 DAYS',
      validity_days: '10 DAYS'
    });
    setEditMode(false);
    setEditingId(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      toast.error('Add at least one item');
      return;
    }

    setSubmitting(true);
    const { subtotal, vat, total } = calculateTotals();

    try {
      const payload = {
        ...formData,
        subtotal,
        vat_amount: vat,
        grand_total: total
      };

      let proformaId;
      let invoiceNumber;

      if (editMode) {
        await api.put(`/admin/proforma/${editingId}`, payload);
        proformaId = editingId;
        toast.success(`Proforma updated successfully`);
      } else {
        const res = await api.post('/admin/proforma', payload);
        proformaId = res.data.id;
        invoiceNumber = res.data.invoice_number;
        toast.success(`Proforma ${invoiceNumber} created — use the Send button to deliver it`);
      }

      setView('list');
      resetForm();
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this invoice from archives?')) return;
    try {
      await api.delete(`/admin/proforma/${id}`);
      toast.success('Invoice removed');
      fetchInvoices();
    } catch {
      toast.error('Failed to delete invoice');
    }
  };

  const handleSend = async () => {
    if (!sendPreview) return;
    setSending(true);
    try {
      await api.post(`/admin/proforma/${sendPreview.id}/send`);
      toast.success(`Proforma ${sendPreview.invoice_number} delivered to ${sendPreview.client_email}`);
      setSendPreview(null);
    } catch (err) {
      const detail = err.response?.data?.details || '';
      toast.error(`Delivery failed: ${detail || 'Check SMTP configuration'}`);
    } finally {
      setSending(false);
    }
  };

  const filteredInvoices = invoices.filter(i => 
    i.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.client_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (view === 'create') {
    return (
      <AdminLayout>
        <div className="flex flex-col animate-fadeIn h-full">
          {/* Create Header */}
          <div className="mb-8 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setView('list')}
                className="w-12 h-12 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] hover:text-green-500 hover:border-green-500/30 transition-all shadow-sm"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-3xl font-black text-[var(--text-primary)]">
                  {editMode ? 'Edit Proforma Invoice' : 'Draft New Proforma'}
                </h1>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">
                  {editMode ? 'Modifying an existing quote for industry approval' : 'Architecting a professional quote'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <button
                  onClick={() => { setView('list'); resetForm(); }}
                  className="px-6 py-2.5 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleCreate}
                  disabled={submitting}
                  className="px-10 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-black text-sm transition-all shadow-xl disabled:opacity-50 flex items-center gap-2 hover:scale-[1.02] active:scale-95 shadow-green-500/20"
                >
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : (editMode ? <ClipboardCheck size={18} /> : <ClipboardCheck size={18} />)}
                  {editMode ? 'Update Official Proforma' : 'Issue Official Proforma'}
                </button>
            </div>
          </div>

          <div className="flex-1 glass rounded-[2.5rem] border border-[var(--border-color)] overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar scroll-smooth text-[var(--text-primary)]">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                  {/* Left Column: Client & Terms */}
                  <div className="lg:col-span-4 space-y-10">
                    <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-green-500 border-b border-green-500/20 pb-4 flex items-center gap-3">
                        <Building2 size={16} /> Client Identity
                      </h3>
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest ml-1">Company Name</label>
                          <input
                            required
                            placeholder="e.g. Corporate Entity"
                            value={formData.client_name}
                            onChange={e => setFormData(f => ({ ...f, client_name: e.target.value }))}
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-3.5 px-5 text-sm font-bold text-[var(--text-primary)] focus:border-green-500 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest ml-1">Client Address</label>
                          <textarea
                            rows={4}
                            placeholder="Enter physical address"
                            value={formData.client_address}
                            onChange={e => setFormData(f => ({ ...f, client_address: e.target.value }))}
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-3.5 px-5 text-sm font-bold text-[var(--text-primary)] focus:border-green-500 outline-none transition-all resize-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest ml-1">Client Email</label>
                          <input
                            type="email"
                            placeholder="e.g. client@company.com"
                            value={formData.client_email}
                            onChange={e => setFormData(f => ({ ...f, client_email: e.target.value }))}
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-3.5 px-5 text-sm font-bold text-[var(--text-primary)] focus:border-green-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-yellow-500 border-b border-yellow-500/20 pb-4 flex items-center gap-3">
                        <ShieldCheck size={16} /> Business Terms
                      </h3>
                      <div className="grid grid-cols-1 gap-5">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest ml-1">Warranty</label>
                          <input
                            value={formData.warranty}
                            onChange={e => setFormData(f => ({ ...f, warranty: e.target.value }))}
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-3 px-5 text-sm font-bold text-[var(--text-primary)] focus:border-green-500 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest ml-1">Delivery Terms</label>
                          <input
                            value={formData.delivery_terms}
                            onChange={e => setFormData(f => ({ ...f, delivery_terms: e.target.value }))}
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-3 px-5 text-sm font-bold text-[var(--text-primary)] focus:border-green-500 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest ml-1">Payment Schedule</label>
                          <input
                            value={formData.payment_terms}
                            onChange={e => setFormData(f => ({ ...f, payment_terms: e.target.value }))}
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-3 px-5 text-sm font-bold text-[var(--text-primary)] focus:border-green-500 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest ml-1">Validity</label>
                          <input
                            value={formData.validity_days}
                            onChange={e => setFormData(f => ({ ...f, validity_days: e.target.value }))}
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-3 px-5 text-sm font-bold text-[var(--text-primary)] focus:border-green-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Items */}
                  <div className="lg:col-span-8 space-y-8">
                     <div className="space-y-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500 border-b border-blue-500/20 pb-4 flex items-center gap-3">
                          <Plus size={16} /> Add Products
                        </h3>
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                          <input
                            placeholder="Search catalog..."
                            value={productSearch}
                            onChange={e => setProductSearch(e.target.value)}
                            className="w-full bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] rounded-[2rem] py-3.5 pl-12 pr-6 text-sm font-bold text-[var(--text-primary)] focus:border-green-500 outline-none transition-all"
                          />
                          {productResults.length > 0 && (
                            <div className="absolute top-full mt-2 w-full bg-[var(--bg-primary)] rounded-3xl shadow-2xl z-[110] border border-[var(--border-color)] max-h-60 overflow-y-auto p-2">
                              {productResults.map(p => (
                                <button
                                  key={p.id}
                                  onClick={() => addItem(p)}
                                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-green-500/5 transition-all text-left rounded-xl"
                                >
                                  <img src={getImageUrl(p.primary_image || p.image_url)} className="w-12 h-12 rounded-lg object-cover bg-white" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-[var(--text-primary)] truncate">{p.name}</p>
                                    <p className="text-[10px] text-green-500 font-black">₵{parseFloat(p.price).toLocaleString('en-GH')}</p>
                                  </div>
                                  <PlusCircle size={20} className="text-[var(--text-muted)] hover:text-green-500" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                     </div>

                     <div className="space-y-4">
                        {formData.items.map(item => (
                          <div key={item.id} className="flex items-center gap-5 p-5 bg-[var(--bg-secondary)]/50 rounded-3xl border border-[var(--border-color)] group hover:border-green-500/20 transition-all">
                             <img src={getImageUrl(item.image)} className="w-16 h-16 rounded-xl object-cover shrink-0 bg-white" />
                             <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">{item.name}</h4>
                                <div className="flex items-center gap-4 mt-2">
                                   <div className="flex items-center bg-[var(--bg-primary)] rounded-lg p-0.5 border border-[var(--border-color)]">
                                      <button onClick={() => updateItemQty(item.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-green-500">-</button>
                                      <span className="w-8 text-center text-xs font-black text-green-500">{item.quantity}</span>
                                      <button onClick={() => updateItemQty(item.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-green-500">+</button>
                                   </div>
                                   <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">₵{item.price.toLocaleString('en-GH', { minimumFractionDigits: 2 })} each</p>
                                </div>
                             </div>
                             <div className="text-right flex flex-col items-end gap-2">
                                <p className="font-black text-[var(--text-primary)]">₵{item.total.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
                                <button onClick={() => removeItem(item.id)} className="text-red-500/50 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button>
                             </div>
                          </div>
                        ))}

                        {formData.items.length === 0 && (
                          <div className="py-20 text-center border-2 border-dashed border-[var(--border-color)] rounded-[3rem] opacity-40">
                             <Package size={40} className="mx-auto mb-3 text-[var(--text-muted)]" />
                             <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Awaiting Selection</p>
                          </div>
                        )}
                     </div>

                     {/* Totals Summary */}
                     {formData.items.length > 0 && (
                       <div className="mt-8 pt-8 border-t border-[var(--border-color)] space-y-3 px-6 bg-[var(--bg-secondary)]/30 rounded-[2.5rem] p-8">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Subtotal</span>
                            <span className="font-black text-[var(--text-primary)]">₵{calculateTotals().subtotal.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">VAT ({formData.vat_percentage}%)</span>
                            <span className="font-black text-[var(--text-primary)]">₵{calculateTotals().vat.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between items-center bg-green-500 text-white p-6 rounded-2xl shadow-xl mt-4">
                            <span className="text-xs font-black uppercase tracking-widest">Grand Total</span>
                            <span className="font-black text-2xl">GH₵ {calculateTotals().total.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
                          </div>
                       </div>
                     )}
                  </div>
                </div>
              </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col animate-fadeIn h-full overflow-hidden">
        <div className="mb-8 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-3xl font-black text-[var(--text-primary)]">Proforma Archives</h1>
            <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Mirroring Receipt Standards: Official Quotes for Industry Approval</p>
          </div>
          <button
            onClick={() => { setView('create'); resetForm(); }}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-green-500/20 active:scale-95 hover:scale-105"
          >
            <Plus size={20} /> Draft Proforma
          </button>
        </div>

        <div className="flex-1 glass rounded-[2.5rem] border border-[var(--border-color)] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[var(--border-color)] flex items-center gap-4 bg-[var(--bg-secondary)]/40">
             <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input
                  placeholder="Scan archives by # or entity..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl py-2.5 pl-12 pr-6 text-sm font-bold text-[var(--text-primary)] focus:border-green-500 outline-none transition-all placeholder:font-normal"
                />
             </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="w-10 h-10 text-green-500 animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Consulting Archives...</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 text-center">
                 <FileText size={48} className="text-[var(--text-muted)] opacity-20 mb-4" />
                 <p className="font-bold text-[var(--text-primary)]">No archived proformas</p>
                 <p className="text-sm text-[var(--text-muted)] mt-1">Draft a new one to begin tracking official quotes.</p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-[var(--bg-secondary)] z-20">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] text-left">Document ID</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] text-left">Client Entity</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] text-left">Corporate Total</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] text-left">Account Rep</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filteredInvoices.map(inv => (
                    <tr key={inv.id} className="group hover:bg-green-500/5 transition-all">
                      <td className="px-8 py-6">
                        <span className="font-mono font-black text-green-500 text-sm">{inv.invoice_number}</span>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-bold text-sm text-[var(--text-primary)]">{inv.client_name}</p>
                        <div className="flex items-center gap-2 mt-1 text-[var(--text-muted)]">
                           <Calendar size={12} />
                           <span className="text-[10px] font-bold uppercase tracking-wider">{new Date(inv.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                         <p className="font-black text-sm text-[var(--text-primary)] uppercase tracking-tighter">₵{parseFloat(inv.grand_total).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-[10px] font-black text-green-500">
                             {inv.creator_name?.charAt(0)}
                           </div>
                           <span className="text-xs font-bold text-[var(--text-secondary)]">{inv.creator_name}</span>
                         </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => handleEdit(inv)}
                              className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-lg hover:shadow-blue-500/20"
                              title="Edit Proforma"
                            >
                              <Edit3 size={18} />
                            </button>
                            <button
                              onClick={() => handleDownload(inv.id, inv.invoice_number)}
                              className="p-2.5 bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition-all shadow-lg hover:shadow-green-500/20"
                              title="Download PDF"
                            >
                              <Download size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(inv.id)}
                              className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                              title="Remove Archive"
                            >
                              <Trash size={18} />
                            </button>
                            {inv.client_email && (
                              <button
                                onClick={() => setSendPreview(inv)}
                                className="p-2.5 bg-yellow-500/10 text-yellow-500 rounded-xl hover:bg-yellow-500 hover:text-white transition-all shadow-lg hover:shadow-yellow-500/20"
                                title="Preview & Send Email"
                              >
                                <Send size={18} />
                              </button>
                            )}
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Send Preview Modal */}
      {sendPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => !sending && setSendPreview(null)}>
          <div className="bg-[var(--bg-primary)] rounded-[2rem] border border-[var(--border-color)] w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">Email Preview</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">Review before sending to the client</p>
              </div>
              <button onClick={() => setSendPreview(null)} className="p-2 hover:bg-[var(--bg-secondary)] rounded-xl transition-colors text-[var(--text-muted)]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] w-16 shrink-0">To:</span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">{sendPreview.client_email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] w-16 shrink-0">Subject:</span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">[Expert Office Furnish] Proforma Invoice — {sendPreview.invoice_number}</span>
                </div>
              </div>
              <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 border border-[var(--border-color)]">
                <div className="space-y-2">
                  <p className="text-sm text-[var(--text-primary)]">Hello <strong>{sendPreview.client_name}</strong>,</p>
                  <p className="text-sm text-[var(--text-secondary)]">Thank you for choosing Expert Office Furnish. We are pleased to provide you with the requested quotation.</p>
                  <p className="text-sm text-[var(--text-secondary)]">Please find your official Proforma Invoice attached for reference number <strong className="text-green-500">{sendPreview.invoice_number}</strong>.</p>
                  <div className="bg-[var(--bg-primary)] rounded-xl p-4 mt-3 border border-[var(--border-color)]">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-muted)]">Grand Total:</span>
                      <span className="font-black text-green-500">GHS {parseFloat(sendPreview.grand_total).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-2 italic">📎 PDF attachment: Proforma_{sendPreview.invoice_number}.pdf</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[var(--border-color)] flex items-center justify-end gap-3">
              <button
                onClick={() => setSendPreview(null)}
                disabled={sending}
                className="px-6 py-2.5 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-black text-sm transition-all shadow-xl disabled:opacity-50 flex items-center gap-2 hover:scale-[1.02] active:scale-95 shadow-green-500/20"
              >
                {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                {sending ? 'Delivering...' : 'Send to Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Proforma;
