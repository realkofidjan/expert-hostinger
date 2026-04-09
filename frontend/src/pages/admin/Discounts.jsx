import React, { useState, useEffect, useCallback } from 'react';
import Pagination from '../../components/admin/Pagination';
import api from '../../api';
import AdminLayout from '../../components/admin/AdminLayout';
import ConfirmModal from '../../components/admin/ConfirmModal';
import {
  Tag, Plus, Trash2, Search, Edit, ToggleLeft, ToggleRight,
  Percent, DollarSign, Calendar, Users, CheckCircle, X, AlertCircle,
  Zap, Clock, Layers, Package, Globe
} from 'lucide-react';
import { toast } from 'react-toastify';

// ─── helpers ───────────────────────────────────────────────────────────────
const fmt = (n) => Number(n).toFixed(2);

const couponStatusInfo = (d) => {
  const expired   = d.expires_at && new Date(d.expires_at) < new Date();
  const exhausted = d.max_uses && d.uses_count >= d.max_uses;
  if (!d.is_active) return { label: 'Inactive', cls: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]' };
  if (expired)      return { label: 'Expired',  cls: 'bg-red-500/10 text-red-400' };
  if (exhausted)    return { label: 'Used Up',  cls: 'bg-orange-500/10 text-orange-400' };
  return              { label: 'Active',   cls: 'bg-green-500/10 text-green-500' };
};

const saleStatusInfo = (s) => {
  const now = new Date();
  if (!s.is_active)                     return { label: 'Paused',   cls: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]', dot: 'bg-slate-400' };
  if (now < new Date(s.starts_at))      return { label: 'Upcoming', cls: 'bg-blue-500/10 text-blue-400',  dot: 'bg-blue-400' };
  if (now > new Date(s.ends_at))        return { label: 'Ended',    cls: 'bg-red-500/10 text-red-400',    dot: 'bg-red-400' };
  return                                       { label: 'Live',     cls: 'bg-green-500/10 text-green-500', dot: 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]' };
};

const SCOPE_ICONS = { all: Globe, categories: Layers, products: Package };

const EMPTY_COUPON = { code: '', type: 'percentage', value: '', min_order_amount: '', max_uses: '', expires_at: '', is_active: true };
const EMPTY_SALE   = { name: '', description: '', type: 'percentage', value: '', starts_at: '', ends_at: '', scope: 'all', target_ids: [], is_active: true };

// ─── component ─────────────────────────────────────────────────────────────
const Discounts = () => {
  const [activeTab, setActiveTab] = useState('coupons');

  // ── coupons state
  const [coupons, setCoupons]           = useState([]);
  const [couponSearch, setCouponSearch] = useState('');
  const [couponPage, setCouponPage]     = useState(1);
  const [couponPagination, setCouponPagination] = useState(null);
  const [couponForm, setCouponForm]     = useState(EMPTY_COUPON);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [couponSaving, setCouponSaving] = useState(false);

  // ── sales state
  const [sales, setSales]             = useState([]);
  const [saleSearch, setSaleSearch]   = useState('');
  const [salePage, setSalePage]       = useState(1);
  const [salePagination, setSalePagination] = useState(null);
  const [saleForm, setSaleForm]       = useState(EMPTY_SALE);
  const [editingSale, setEditingSale] = useState(null);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [saleSaving, setSaleSaving]   = useState(false);
  const [categories, setCategories]   = useState([]);
  const [products, setProducts]       = useState([]);

  const [loading, setLoading]         = useState(true);
  const [confirm, setConfirm]         = useState({ show: false, title: '', message: '', onConfirm: null });

  const fetchCoupons = useCallback(async (p = 1, q = '') => {
    const res = await api.get(`/admin/discounts?page=${p}&q=${encodeURIComponent(q)}`);
    setCoupons(res.data.discounts || []);
    setCouponPagination(res.data.pagination || null);
  }, []);

  const fetchSales = useCallback(async (p = 1, q = '') => {
    const res = await api.get(`/admin/sales?page=${p}&q=${encodeURIComponent(q)}`);
    setSales(res.data.sales || []);
    setSalePagination(res.data.pagination || null);
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cats, prods] = await Promise.all([
        api.get('/categories'),
        api.get('/products?limit=200'),
      ]);
      setCategories(cats.data);
      setProducts(prods.data?.products || []);
      await Promise.all([fetchCoupons(1), fetchSales(1)]);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchCoupons(couponPage, couponSearch); }, [couponPage]);
  useEffect(() => {
    const t = setTimeout(() => { setCouponPage(1); fetchCoupons(1, couponSearch); }, 350);
    return () => clearTimeout(t);
  }, [couponSearch]);
  useEffect(() => { fetchSales(salePage, saleSearch); }, [salePage]);
  useEffect(() => {
    const t = setTimeout(() => { setSalePage(1); fetchSales(1, saleSearch); }, 350);
    return () => clearTimeout(t);
  }, [saleSearch]);

  // ── coupon handlers ──────────────────────────────────────────────────────
  const openCreateCoupon = () => { setEditingCoupon(null); setCouponForm(EMPTY_COUPON); setShowCouponForm(true); };
  const openEditCoupon   = (d) => {
    setEditingCoupon(d);
    setCouponForm({ code: d.code, type: d.type, value: d.value, min_order_amount: d.min_order_amount||'', max_uses: d.max_uses||'', expires_at: d.expires_at ? d.expires_at.slice(0,10) : '', is_active: d.is_active });
    setShowCouponForm(true);
  };
  const closeCouponForm = () => { setShowCouponForm(false); setEditingCoupon(null); setCouponForm(EMPTY_COUPON); };

  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    if (!couponForm.code.trim() || !couponForm.value) return toast.error('Code and value are required');
    setCouponSaving(true);
    try {
      editingCoupon
        ? await api.put(`/admin/discounts/${editingCoupon.id}`, couponForm)
        : await api.post('/admin/discounts', couponForm);
      toast.success(editingCoupon ? 'Coupon updated' : 'Coupon created');
      fetchCoupons(couponPage, couponSearch); closeCouponForm();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
    finally { setCouponSaving(false); }
  };

  const handleToggleCoupon = async (d) => {
    try {
      await api.patch(`/admin/discounts/${d.id}/toggle`);
      setCoupons(prev => prev.map(x => x.id === d.id ? { ...x, is_active: !x.is_active } : x));
    } catch { toast.error('Failed'); }
  };

  const handleDeleteCoupon = (d) => setConfirm({
    show: true, title: 'Delete Coupon',
    message: `"${d.code}" will be permanently removed.`,
    onConfirm: async () => {
      try { await api.delete(`/admin/discounts/${d.id}`); toast.success('Deleted'); fetchCoupons(couponPage, couponSearch); }
      catch { toast.error('Failed'); }
    }
  });

  // ── sale handlers ────────────────────────────────────────────────────────
  const openCreateSale = () => { setEditingSale(null); setSaleForm(EMPTY_SALE); setShowSaleForm(true); };
  const openEditSale   = (s) => {
    setEditingSale(s);
    setSaleForm({
      name: s.name, description: s.description||'', type: s.type, value: s.value,
      starts_at: s.starts_at ? s.starts_at.slice(0,16) : '',
      ends_at:   s.ends_at   ? s.ends_at.slice(0,16)   : '',
      scope: s.scope||'all',
      target_ids: s.target_ids ? (typeof s.target_ids === 'string' ? JSON.parse(s.target_ids) : s.target_ids) : [],
      is_active: s.is_active,
    });
    setShowSaleForm(true);
  };
  const closeSaleForm = () => { setShowSaleForm(false); setEditingSale(null); setSaleForm(EMPTY_SALE); };

  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    if (!saleForm.name || !saleForm.value || !saleForm.starts_at || !saleForm.ends_at)
      return toast.error('Name, discount value and dates are required');
    if (new Date(saleForm.ends_at) <= new Date(saleForm.starts_at))
      return toast.error('End date must be after start date');
    setSaleSaving(true);
    try {
      editingSale
        ? await api.put(`/admin/sales/${editingSale.id}`, saleForm)
        : await api.post('/admin/sales', saleForm);
      toast.success(editingSale ? 'Sale updated' : 'Sale created');
      fetchSales(salePage, saleSearch); closeSaleForm();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
    finally { setSaleSaving(false); }
  };

  const handleToggleSale = async (s) => {
    try {
      await api.patch(`/admin/sales/${s.id}/toggle`);
      setSales(prev => prev.map(x => x.id === s.id ? { ...x, is_active: !x.is_active } : x));
    } catch { toast.error('Failed'); }
  };

  const handleDeleteSale = (s) => setConfirm({
    show: true, title: 'Delete Sale',
    message: `"${s.name}" will be permanently removed.`,
    onConfirm: async () => {
      try { await api.delete(`/admin/sales/${s.id}`); toast.success('Deleted'); fetchSales(salePage, saleSearch); }
      catch { toast.error('Failed'); }
    }
  });

  const toggleSaleTarget = (id) => {
    const ids = saleForm.target_ids || [];
    setSaleForm({ ...saleForm, target_ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] });
  };

  // ── derived (filtering is now server-side) ──────────────────────────────
  const filteredCoupons = coupons;
  const filteredSales   = sales;

  const liveSales   = sales.filter(s => s.is_active && new Date() >= new Date(s.starts_at) && new Date() <= new Date(s.ends_at)).length;
  const upcomingSales = sales.filter(s => s.is_active && new Date() < new Date(s.starts_at)).length;

  const activeCoupons = coupons.filter(d => {
    const exp = d.expires_at && new Date(d.expires_at) < new Date();
    const exh = d.max_uses && d.uses_count >= d.max_uses;
    return d.is_active && !exp && !exh;
  }).length;

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fadeIn">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Discounts & Coupons</h1>
            <p className="text-[var(--text-muted)] mt-1 uppercase tracking-widest text-[10px] font-bold text-pink-500">
              PROMOTIONS & SALES MANAGEMENT
            </p>
          </div>
          <button
            onClick={activeTab === 'coupons' ? openCreateCoupon : openCreateSale}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            <Plus size={18} /> {activeTab === 'coupons' ? 'New Coupon' : 'New Sale'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Coupons', value: activeCoupons,  icon: Tag,          color: 'text-pink-500',  bg: 'bg-pink-500/10' },
            { label: 'Live Sales',     value: liveSales,      icon: Zap,          color: 'text-green-500', bg: 'bg-green-500/10' },
            { label: 'Upcoming Sales', value: upcomingSales,  icon: Clock,        color: 'text-blue-400',  bg: 'bg-blue-500/10' },
            { label: 'Total Coupons',  value: coupons.length, icon: CheckCircle,  color: 'text-[var(--text-muted)]', bg: 'bg-[var(--bg-tertiary)]' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="glass rounded-3xl p-6 border border-[var(--border-color)]">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-2xl font-black text-[var(--text-primary)]">{value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 glass rounded-2xl w-fit border border-[var(--border-color)]">
          {[['coupons', Tag, 'Coupon Codes'], ['sales', Zap, 'Sales Events']].map(([tab, Icon, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
                activeTab === tab
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* ── Coupons Tab ── */}
        {activeTab === 'coupons' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="glass p-4 rounded-3xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input type="text" placeholder="Search coupon codes..." value={couponSearch}
                  onChange={e => setCouponSearch(e.target.value)}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-3 pl-11 pr-4 text-[var(--text-primary)] focus:outline-none focus:border-green-500 transition-all font-medium text-sm" />
              </div>
            </div>

            <div className="glass rounded-[2rem] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
                      {['Code', 'Discount', 'Min Order', 'Uses', 'Expires', 'Status', ''].map(h => (
                        <th key={h} className="px-6 py-5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {loading ? (
                      <tr><td colSpan="7" className="py-16 text-center"><div className="inline-block w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" /></td></tr>
                    ) : filteredCoupons.length === 0 ? (
                      <tr><td colSpan="7" className="py-16 text-center text-[var(--text-muted)] text-sm">{coupons.length === 0 ? 'No coupons yet.' : 'No results.'}</td></tr>
                    ) : filteredCoupons.map(d => {
                      const st = couponStatusInfo(d);
                      return (
                        <tr key={d.id} className="group hover:bg-[var(--bg-secondary)]/30 transition-colors">
                          <td className="px-6 py-4"><span className="font-black text-sm font-mono tracking-widest text-[var(--text-primary)]">{d.code}</span></td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-md flex items-center justify-center ${d.type === 'percentage' ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                                {d.type === 'percentage' ? <Percent size={12} className="text-green-500" /> : <DollarSign size={12} className="text-yellow-500" />}
                              </span>
                              <span className="font-black text-sm text-[var(--text-primary)]">
                                {d.type === 'percentage' ? `${d.value}%` : `₵${fmt(d.value)}`}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{d.min_order_amount > 0 ? `₵${fmt(d.min_order_amount)}` : '—'}</td>
                          <td className="px-6 py-4 text-sm font-bold text-[var(--text-primary)]">
                            {d.uses_count}{d.max_uses ? <span className="text-[var(--text-muted)] font-normal"> / {d.max_uses}</span> : ''}
                          </td>
                          <td className="px-6 py-4 text-xs text-[var(--text-muted)]">
                            {d.expires_at ? new Date(d.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No expiry'}
                          </td>
                          <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${st.cls}`}>{st.label}</span></td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => handleToggleCoupon(d)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors" title={d.is_active ? 'Deactivate' : 'Activate'}>
                                {d.is_active ? <ToggleRight size={17} className="text-green-500" /> : <ToggleLeft size={17} className="text-[var(--text-muted)]" />}
                              </button>
                              <button onClick={() => openEditCoupon(d)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"><Edit size={14} /></button>
                              <button onClick={() => handleDeleteCoupon(d)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-[var(--text-muted)] hover:text-red-500"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {couponPagination && (
                <div className="px-4 py-2 border-t border-[var(--border-color)]">
                  <Pagination pagination={couponPagination} onPageChange={p => setCouponPage(p)} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Sales Tab ── */}
        {activeTab === 'sales' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="glass p-4 rounded-3xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input type="text" placeholder="Search sales..." value={saleSearch}
                  onChange={e => setSaleSearch(e.target.value)}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-3 pl-11 pr-4 text-[var(--text-primary)] focus:outline-none focus:border-green-500 transition-all font-medium text-sm" />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" /></div>
            ) : filteredSales.length === 0 ? (
              <div className="glass rounded-[2rem] p-20 text-center">
                <Zap size={40} className="text-[var(--text-muted)] mx-auto mb-4 opacity-30" />
                <p className="text-[var(--text-muted)] font-medium">{sales.length === 0 ? 'No sales yet. Create your first sale event!' : 'No results.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredSales.map(s => {
                  const st = saleStatusInfo(s);
                  const ScopeIcon = SCOPE_ICONS[s.scope] || Globe;
                  const targetIds = s.target_ids ? (typeof s.target_ids === 'string' ? JSON.parse(s.target_ids) : s.target_ids) : [];
                  const now = new Date();
                  const started = now >= new Date(s.starts_at);
                  const ended   = now > new Date(s.ends_at);
                  const totalMs = new Date(s.ends_at) - new Date(s.starts_at);
                  const doneMs  = now - new Date(s.starts_at);
                  const progress = started && !ended ? Math.min(100, Math.round((doneMs / totalMs) * 100)) : (ended ? 100 : 0);

                  return (
                    <div key={s.id} className={`glass rounded-3xl border overflow-hidden transition-all ${st.label === 'Live' ? 'border-green-500/30 shadow-lg shadow-green-500/10' : 'border-[var(--border-color)]'}`}>
                      {/* Top bar */}
                      <div className="px-6 pt-6 pb-4">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                              <span className={`text-[9px] font-black uppercase tracking-widest ${st.cls.split(' ')[1]}`}>{st.label}</span>
                            </div>
                            <h3 className="font-black text-[var(--text-primary)] text-base leading-tight truncate">{s.name}</h3>
                            {s.description && <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{s.description}</p>}
                          </div>
                          <div className={`shrink-0 px-3 py-1.5 rounded-xl font-black text-lg ${s.type === 'percentage' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                            {s.type === 'percentage' ? `${s.value}%` : `₵${fmt(s.value)}`}
                            <span className="text-[9px] ml-1 opacity-60">{s.type === 'percentage' ? 'OFF' : 'OFF'}</span>
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] font-bold">
                          <Calendar size={11} />
                          <span>{new Date(s.starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          <span className="opacity-40">→</span>
                          <span>{new Date(s.ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>

                        {/* Progress bar (only when started and not ended) */}
                        {started && !ended && s.is_active && (
                          <div className="mt-3">
                            <div className="flex justify-between text-[9px] text-[var(--text-muted)] mb-1">
                              <span>Progress</span><span>{progress}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-yellow-500 transition-all" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        )}

                        {/* Scope */}
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border-color)]">
                          <ScopeIcon size={12} className="text-[var(--text-muted)]" />
                          <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                            {s.scope === 'all'
                              ? 'All products'
                              : `${targetIds.length} ${s.scope === 'categories' ? 'categor' + (targetIds.length === 1 ? 'y' : 'ies') : 'product' + (targetIds.length !== 1 ? 's' : '')}`
                            }
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/40">
                        <button onClick={() => handleToggleSale(s)} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                          {s.is_active ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} />}
                          {s.is_active ? 'Pause' : 'Activate'}
                        </button>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditSale(s)} className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"><Edit size={14} /></button>
                          <button onClick={() => handleDeleteSale(s)} className="p-2 rounded-xl hover:bg-red-500/10 transition-colors text-[var(--text-muted)] hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {salePagination && (
              <div className="mt-4">
                <Pagination pagination={salePagination} onPageChange={p => setSalePage(p)} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Coupon Form Modal ── */}
      {showCouponForm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 animate-fadeIn"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={closeCouponForm}>
          <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-scaleIn"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border-color)]">
              <h2 className="text-lg font-black uppercase tracking-tight text-[var(--text-primary)]">{editingCoupon ? 'Edit Coupon' : 'New Coupon'}</h2>
              <button onClick={closeCouponForm} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={18} /></button>
            </div>
            <form onSubmit={handleCouponSubmit} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Coupon Code</label>
                <input required placeholder="e.g. SUMMER20" value={couponForm.code}
                  onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 font-black tracking-widest uppercase text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Type</label>
                  <select value={couponForm.type} onChange={e => setCouponForm({ ...couponForm, type: e.target.value })}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm appearance-none">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₵)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">{couponForm.type === 'percentage' ? 'Percentage Off' : 'Amount Off (₵)'}</label>
                  <input required type="number" min="0" max={couponForm.type === 'percentage' ? 100 : undefined} step="0.01"
                    placeholder={couponForm.type === 'percentage' ? '20' : '10.00'} value={couponForm.value}
                    onChange={e => setCouponForm({ ...couponForm, value: e.target.value })}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Min Order (₵)</label>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={couponForm.min_order_amount}
                    onChange={e => setCouponForm({ ...couponForm, min_order_amount: e.target.value })}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Max Uses</label>
                  <input type="number" min="1" placeholder="Unlimited" value={couponForm.max_uses}
                    onChange={e => setCouponForm({ ...couponForm, max_uses: e.target.value })}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Expiry Date (optional)</label>
                <input type="date" value={couponForm.expires_at} min={new Date().toISOString().slice(0,10)}
                  onChange={e => setCouponForm({ ...couponForm, expires_at: e.target.value })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm" />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                <span className="text-sm font-bold text-[var(--text-primary)]">Active</span>
                <button type="button" onClick={() => setCouponForm({ ...couponForm, is_active: !couponForm.is_active })}>
                  {couponForm.is_active ? <ToggleRight size={26} className="text-green-500" /> : <ToggleLeft size={26} className="text-[var(--text-muted)]" />}
                </button>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeCouponForm}
                  className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>Cancel</button>
                <button type="submit" disabled={couponSaving}
                  className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-green-500 hover:bg-green-600 text-white transition-all shadow-lg shadow-green-500/20 disabled:opacity-50">
                  {couponSaving ? 'Saving...' : (editingCoupon ? 'Update' : 'Create Coupon')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Sale Form Modal ── */}
      {showSaleForm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 animate-fadeIn"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={closeSaleForm}>
          <div className="w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl animate-scaleIn max-h-[90vh] flex flex-col"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border-color)] shrink-0">
              <h2 className="text-lg font-black uppercase tracking-tight text-[var(--text-primary)]">{editingSale ? 'Edit Sale' : 'New Sale Event'}</h2>
              <button onClick={closeSaleForm} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaleSubmit} className="p-8 space-y-5 overflow-y-auto custom-scrollbar flex-1">
              {/* Name */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Sale Name</label>
                <input required placeholder="e.g. Black Friday Sale, Summer Clearance" value={saleForm.name}
                  onChange={e => setSaleForm({ ...saleForm, name: e.target.value })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm font-bold" />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Description (optional)</label>
                <textarea rows={2} placeholder="Brief description of this sale..." value={saleForm.description}
                  onChange={e => setSaleForm({ ...saleForm, description: e.target.value })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm resize-none" />
              </div>

              {/* Type + Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Discount Type</label>
                  <select value={saleForm.type} onChange={e => setSaleForm({ ...saleForm, type: e.target.value })}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm appearance-none">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₵)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">{saleForm.type === 'percentage' ? 'Discount %' : 'Discount (₵)'}</label>
                  <input required type="number" min="0" max={saleForm.type === 'percentage' ? 100 : undefined} step="0.01"
                    placeholder={saleForm.type === 'percentage' ? '25' : '50.00'} value={saleForm.value}
                    onChange={e => setSaleForm({ ...saleForm, value: e.target.value })}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm" />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Start Date & Time</label>
                  <input required type="datetime-local" value={saleForm.starts_at}
                    onChange={e => setSaleForm({ ...saleForm, starts_at: e.target.value })}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">End Date & Time</label>
                  <input required type="datetime-local" value={saleForm.ends_at} min={saleForm.starts_at}
                    onChange={e => setSaleForm({ ...saleForm, ends_at: e.target.value })}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm" />
                </div>
              </div>

              {/* Scope */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Applies To</label>
                <div className="grid grid-cols-3 gap-2">
                  {[['all', Globe, 'All Products'], ['categories', Layers, 'Categories'], ['products', Package, 'Specific Products']].map(([val, Icon, lbl]) => (
                    <button key={val} type="button" onClick={() => setSaleForm({ ...saleForm, scope: val, target_ids: [] })}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-black transition-all ${
                        saleForm.scope === val
                          ? 'border-green-500 bg-green-500/10 text-green-500'
                          : 'border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}>
                      <Icon size={16} /> {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target categories */}
              {saleForm.scope === 'categories' && (
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Select Categories</label>
                  <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto custom-scrollbar p-1">
                    {categories.map(c => (
                      <label key={c.id} className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer border transition-all text-sm ${
                        (saleForm.target_ids||[]).includes(c.id)
                          ? 'border-green-500/50 bg-green-500/10'
                          : 'border-[var(--border-color)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)]'
                      }`}>
                        <input type="checkbox" className="hidden" checked={(saleForm.target_ids||[]).includes(c.id)} onChange={() => toggleSaleTarget(c.id)} />
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${(saleForm.target_ids||[]).includes(c.id) ? 'bg-green-500 border-green-500' : 'border-[var(--border-color)]'}`}>
                          {(saleForm.target_ids||[]).includes(c.id) && <CheckCircle size={10} className="text-white" />}
                        </div>
                        <span className="font-medium text-[var(--text-primary)] truncate">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Target products */}
              {saleForm.scope === 'products' && (
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Select Products</label>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar p-1">
                    {products.map(p => (
                      <label key={p.id} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-all ${
                        (saleForm.target_ids||[]).includes(p.id)
                          ? 'border-green-500/50 bg-green-500/10'
                          : 'border-[var(--border-color)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)]'
                      }`}>
                        <input type="checkbox" className="hidden" checked={(saleForm.target_ids||[]).includes(p.id)} onChange={() => toggleSaleTarget(p.id)} />
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${(saleForm.target_ids||[]).includes(p.id) ? 'bg-green-500 border-green-500' : 'border-[var(--border-color)]'}`}>
                          {(saleForm.target_ids||[]).includes(p.id) && <CheckCircle size={10} className="text-white" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[var(--text-primary)] truncate">{p.name}</p>
                          <p className="text-[9px] text-[var(--text-muted)]">{p.sku}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Active toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                <span className="text-sm font-bold text-[var(--text-primary)]">Active</span>
                <button type="button" onClick={() => setSaleForm({ ...saleForm, is_active: !saleForm.is_active })}>
                  {saleForm.is_active ? <ToggleRight size={26} className="text-green-500" /> : <ToggleLeft size={26} className="text-[var(--text-muted)]" />}
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeSaleForm}
                  className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>Cancel</button>
                <button type="submit" disabled={saleSaving}
                  className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-green-500 hover:bg-green-600 text-white transition-all shadow-lg shadow-green-500/20 disabled:opacity-50">
                  {saleSaving ? 'Saving...' : (editingSale ? 'Update Sale' : 'Create Sale')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default Discounts;
