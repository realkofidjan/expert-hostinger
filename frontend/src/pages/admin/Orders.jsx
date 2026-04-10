import React, { useState, useEffect, useRef, useCallback } from 'react';
import Pagination from '../../components/admin/Pagination';
import api from '../../api';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Search, Filter, Calendar,
  Package, Truck, Store, CreditCard, Banknote, Smartphone,
  Printer, CheckCircle, ShieldCheck, Loader2, ChevronDown, Clock, Mail, Send, Download, Edit3, Trash2, Plus, PlusCircle, X
} from 'lucide-react';
import { toast } from 'react-toastify';

import { getImageUrl } from '../../utils/url';

const STATUS_OPTIONS = ['pending', 'confirmed', 'processing', 'on_route', 'delivered', 'cancelled'];

const statusColor = (s) => {
  switch (s) {
    case 'delivered': return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'confirmed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'processing': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'on_route': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
    case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
    default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
};

const paymentColor = (s) => {
  switch (s) {
    case 'paid': case 'verified': return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'pending_verification': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
};

const methodIcon = (m) => {
  if (m === 'cash') return <Banknote size={14} className="text-yellow-500" />;
  if (m === 'momo') return <Smartphone size={14} className="text-green-500" />;
  if (m === 'bank_transfer') return <CreditCard size={14} className="text-blue-500" />;
  return null;
};

const methodLabel = (m) => {
  if (m === 'cash') return 'Cash';
  if (m === 'momo') return 'MoMo';
  if (m === 'bank_transfer') return 'Bank Transfer';
  return m || '—';
};

const get72hStatus = (createdAt) => {
  const deadline = new Date(new Date(createdAt).getTime() + 72 * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = deadline - now;
  if (diffMs <= 0) return { expired: true, label: 'Expired', hours: 0, minutes: 0 };
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return { expired: false, label: `${hours}h ${minutes}m left`, hours, minutes };
};

const getImageUrlUtil = (path) => getImageUrl(path);

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [documentData, setDocumentData] = useState(null);
  const [deliveryEdit, setDeliveryEdit] = useState({ date: '', notes: '' });
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [sendingReceipt, setSendingReceipt] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const printRef = useRef(null);

  const fetchOrders = useCallback(async (p = 1, status = 'all', payment = 'all', q = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: p, status, payment_method: payment, q });
      const res = await api.get(`/admin/orders?${params}`);
      setOrders(res.data.orders || []);
      setPagination(res.data.pagination || null);
    } catch {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(page, filterStatus, filterPayment, searchQuery); }, [page]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchOrders(1, filterStatus, filterPayment, searchQuery); }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, filterStatus, filterPayment]);

  const openOrder = async (order) => {
    setSelectedOrder(order);
    setOrderDetails(null);
    setDocumentData(null);
    setDeliveryEdit({
      date: order.estimated_delivery_date ? order.estimated_delivery_date.split('T')[0] : '',
      notes: order.delivery_notes || ''
    });
    setDetailLoading(true);
    try {
      const res = await api.get(`/admin/orders/${order.id}`);
      setOrderDetails(res.data);
    } catch {
      toast.error('Failed to load order details');
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async (orderId, field, value) => {
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { [field]: value });
      toast.success('Order updated');
      fetchOrders(page, filterStatus, filterPayment, searchQuery);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, [field]: value }));
        setOrderDetails(prev => prev ? { ...prev, [field]: value } : prev);
      }
    } catch {
      toast.error('Failed to update order');
    }
  };

  const saveDeliveryInfo = async () => {
    setSavingDelivery(true);
    try {
      await api.patch(`/admin/orders/${selectedOrder.id}/status`, {
        estimated_delivery_date: deliveryEdit.date || null,
        delivery_notes: deliveryEdit.notes || null,
      });
      toast.success('Delivery info saved');
      setSelectedOrder(prev => ({
        ...prev,
        estimated_delivery_date: deliveryEdit.date || null,
        delivery_notes: deliveryEdit.notes || null,
      }));
      fetchOrders(page, filterStatus, filterPayment, searchQuery);
    } catch {
      toast.error('Failed to save delivery info');
    } finally {
      setSavingDelivery(false);
    }
  };

  const verifyTransfer = async (orderId) => {
    try {
      await api.patch(`/admin/orders/${orderId}/verify-transfer`);
      toast.success('Bank transfer verified');
      fetchOrders(page, filterStatus, filterPayment, searchQuery);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, bank_receipt_verified: 1, payment_status: 'verified' }));
        setOrderDetails(prev => prev ? { ...prev, bank_receipt_verified: 1, payment_status: 'verified' } : prev);
      }
    } catch {
      toast.error('Failed to verify transfer');
    }
  };

  const loadDocument = async (orderId) => {
    try {
      const res = await api.get(`/admin/orders/${orderId}/document`);
      setDocumentData(res.data);
    } catch {
      toast.error('Failed to load document');
    }
  };

  const handleSendEmail = async () => {
    setSendingReceipt(true);
    try {
      await api.post(`/admin/orders/${selectedOrder.id}/send-receipt`);
      toast.success(`Receipt emailed to ${selectedOrder.customer_email}`);
    } catch {
      toast.error('Failed to send email');
    } finally {
      setSendingReceipt(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/admin/orders/${selectedOrder.id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      const docType = selectedOrder.payment_method === 'cash' ? 'Invoice' : 'Receipt';
      a.href = url;
      a.download = `${docType}_${selectedOrder.order_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Document downloaded');
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const startEditing = () => {
    setEditFormData({
      customer_name: selectedOrder.customer_name || '',
      customer_email: selectedOrder.customer_email || '',
      customer_phone: selectedOrder.customer_phone || '',
      delivery_mode: selectedOrder.delivery_mode || 'pickup',
      region: selectedOrder.region || '',
      delivery_fee: parseFloat(selectedOrder.delivery_fee || 0),
      shipping_address: typeof selectedOrder.shipping_address === 'string' ? JSON.parse(selectedOrder.shipping_address || '{}') : (selectedOrder.shipping_address || {}),
      status: selectedOrder.status,
      payment_status: selectedOrder.payment_status,
      items: orderDetails?.items.map(item => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        product_name: item.product_name,
        color: item.color,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        subtotal: parseFloat(item.subtotal),
        image_url: item.image_url
      })) || []
    });
    setIsEditing(true);
  };

  const saveOrderEdits = async () => {
    setSubmitting(true);
    try {
      await api.put(`/admin/orders/${selectedOrder.id}`, editFormData);
      toast.success('Order updated successfully');
      setIsEditing(false);
      await fetchOrders(page, filterStatus, filterPayment, searchQuery);
      await openOrder(selectedOrder);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update order');
    } finally {
      setSubmitting(false);
    }
  };

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
    if (!isEditing) return;
    const t = setTimeout(() => searchProducts(productSearch), 300);
    return () => clearTimeout(t);
  }, [productSearch, isEditing]);

  const addEditItem = (p) => {
    const exists = editFormData.items.find(it => it.product_id === p.id);
    if (exists) { toast.info('Item already present'); return; }
    const newItem = {
        product_id: p.id,
        variant_id: null,
        product_name: p.name,
        color: null,
        quantity: 1,
        unit_price: parseFloat(p.price),
        subtotal: parseFloat(p.price),
        image_url: p.primary_image || p.image_url || p.images?.[0]?.url
    };
    setEditFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setProductSearch('');
    setProductResults([]);
  };

  const updateEditItemQty = (idx, q) => {
    const qty = Math.max(1, parseInt(q) || 1);
    setEditFormData(prev => {
        const newItems = [...prev.items];
        const it = newItems[idx];
        newItems[idx] = { ...it, quantity: qty, subtotal: qty * it.unit_price };
        return { ...prev, items: newItems };
    });
  };

  const removeEditItem = (idx) => {
    setEditFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html><head><title>Document</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 32px; color: #111; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #16a34a; padding-bottom:16px; margin-bottom:24px; }
        .brand-block { display:flex; align-items:center; gap:12px; }
        .brand-logo { height:48px; width:auto; object-fit:contain; }
        .brand { font-size:18px; font-weight:900; color:#16a34a; }
        .doc-type { font-size:28px; font-weight:900; color:#111; text-transform:uppercase; letter-spacing:2px; }
        .meta { font-size:12px; color:#555; margin-top:4px; }
        .section { margin-bottom:20px; }
        .label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#888; }
        .value { font-size:14px; font-weight:600; color:#111; }
        table { width:100%; border-collapse:collapse; margin-top:8px; }
        th { text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#888; padding:8px 4px; border-bottom:1px solid #e5e7eb; }
        td { padding:10px 4px; border-bottom:1px solid #f3f4f6; font-size:13px; color:#111; }
        .total-row td { font-weight:800; font-size:15px; border-bottom:none; padding-top:16px; }
        .footer { margin-top:40px; padding-top:16px; border-top:1px solid #e5e7eb; font-size:11px; color:#888; text-align:center; }
        @media print { body { padding:16px; } }
      </style>
      </head><body>${printRef.current?.innerHTML || ''}</body></html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); printWin.close(); }, 400);
  };

  const filtered = orders;

  return (
    <AdminLayout>
      <div className="flex flex-col animate-fadeIn">
        <div className="mb-4 shrink-0">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Order Management</h1>
          <p className="text-[var(--text-muted)] mt-1">View, process and track all customer orders</p>
        </div>

        <div className="glass p-4 rounded-2xl flex flex-col md:flex-row gap-4 shrink-0 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input
              placeholder="Search by order #, name or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] focus:border-green-500 focus:ring-0"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={16} className="text-[var(--text-muted)]" />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-2 px-3 text-sm focus:border-green-500 text-[var(--text-primary)]">
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>)}
            </select>
            <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-2 px-3 text-sm focus:border-green-500 text-[var(--text-primary)]">
              <option value="all">All Payments</option>
              <option value="cash">Cash</option>
              <option value="momo">MoMo</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4" style={{ height: 'calc(100vh - 280px)', minHeight: '420px' }}>
          <div className="w-80 shrink-0 glass rounded-3xl overflow-hidden flex flex-col h-full">
            <div className="px-4 py-3 border-b border-[var(--border-color)] shrink-0">
              <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider">
                {pagination?.total ?? filtered.length} Order{(pagination?.total ?? filtered.length) !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="flex flex-col items-center gap-3 py-16">
                  <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-[var(--text-muted)] text-xs">Loading orders...</p>
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-[var(--text-muted)] text-sm py-16">No orders found</p>
              ) : filtered.map(order => {
                const isSelected = selectedOrder?.id === order.id;
                const show72h = order.payment_method === 'bank_transfer' && !order.bank_receipt_path && order.status === 'pending';
                const timer72 = show72h ? get72hStatus(order.created_at) : null;
                return (
                  <button
                    key={order.id}
                    onClick={() => openOrder(order)}
                    className={`w-full text-left px-4 py-3 border-b border-[var(--border-color)] transition-colors ${isSelected ? 'bg-green-500/10 border-l-2 border-l-green-500' : 'hover:bg-[var(--bg-secondary)]/50'}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-mono text-green-500 font-bold text-xs">{order.order_number || `#${order.id}`}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${statusColor(order.status)}`}>{(order.status || 'pending').replace('_', ' ')}</span>
                    </div>
                    <p className="font-semibold text-[var(--text-primary)] text-xs truncate">{order.customer_name || '—'}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-1">
                        {methodIcon(order.payment_method)}
                        <span className="text-[10px] text-[var(--text-secondary)]">{methodLabel(order.payment_method)}</span>
                      </div>
                      <span className="text-xs font-bold text-[var(--text-primary)]">₵{parseFloat(order.total_amount || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {show72h && timer72 && (
                      <div className={`mt-1 flex items-center gap-1 text-[9px] font-bold ${timer72.expired ? 'text-red-500' : 'text-amber-500'}`}><Clock size={9} /> {timer72.expired ? 'Expired' : timer72.label}</div>
                    )}
                    <p className="text-[var(--text-muted)] text-[10px] mt-0.5 flex items-center gap-1"><Calendar size={9} /> {new Date(order.created_at).toLocaleDateString()}</p>
                  </button>
                );
              })}
            </div>
            {pagination && (
              <div className="px-3 border-t border-[var(--border-color)] shrink-0">
                <Pagination pagination={pagination} onPageChange={p => setPage(p)} />
              </div>
            )}
          </div>

          <div className="flex-1 glass rounded-3xl overflow-hidden flex flex-col h-full" style={{ minWidth: 0 }}>
            {!selectedOrder ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                <Package size={48} className="text-[var(--text-muted)] opacity-30 mb-4" />
                <p className="text-[var(--text-primary)] font-bold text-lg">Select an Order</p>
                <p className="text-[var(--text-muted)] text-sm mt-1">Click any order on the left to view and manage its details.</p>
              </div>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-[var(--border-color)] shrink-0 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-[var(--text-primary)]">Order {selectedOrder.order_number || `#${selectedOrder.id}`}</h2>
                    <p className="text-xs text-[var(--text-muted)]">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColor(selectedOrder.status)}`}>{(selectedOrder.status || 'pending').replace('_', ' ')}</span>
                    <button onClick={startEditing} className="p-2 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all"><Edit3 size={16} /></button>
                    <button onClick={handleDownloadPdf} disabled={downloading} className="p-2 bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition-all disabled:opacity-50">
                        {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    </button>
                  </div>
                </div>

                {detailLoading ? (
                  <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 text-green-500 animate-spin" /></div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl">
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-2">Customer</p>
                        <p className="font-bold text-sm text-[var(--text-primary)]">{selectedOrder.customer_name || '—'}</p>
                        <p className="text-xs text-[var(--text-muted)]">{selectedOrder.customer_email || ''}</p>
                        <p className="text-xs text-[var(--text-muted)]">{selectedOrder.customer_phone || ''}</p>
                      </div>
                      <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl">
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-2">Delivery</p>
                        <div className="flex items-center gap-1.5"><span className="font-bold text-sm text-[var(--text-primary)] capitalize">{selectedOrder.delivery_mode || 'pickup'}</span></div>
                        {selectedOrder.delivery_mode === 'delivery' && (() => {
                          let addr = null;
                          try { addr = JSON.parse(selectedOrder.shipping_address); } catch { addr = null; }
                          return (
                            <div className="mt-2 space-y-0.5 text-xs text-[var(--text-secondary)]">
                              {addr?.address && <p>{addr.address}</p>}
                              {addr?.city && <p>{addr.city}</p>}
                              {selectedOrder.region && <p className="font-semibold">{selectedOrder.region}</p>}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl">
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-2">Payment</p>
                        <p className="font-bold text-sm text-[var(--text-primary)]">{methodLabel(selectedOrder.payment_method)}</p>
                        <span className={`mt-1 inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${paymentColor(selectedOrder.payment_status)}`}>{(selectedOrder.payment_status || 'pending').replace('_', ' ')}</span>
                      </div>
                    </div>

                    {orderDetails?.items && (
                      <div>
                        <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider mb-3">Items Ordered</p>
                        <div className="space-y-2">
                          {orderDetails.items.map(item => (
                            <div key={item.id} className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-xl">
                              <img src={getImageUrl(item.image_url)} alt={item.product_name} className="w-10 h-10 rounded-lg object-cover bg-white" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.product_name}</p>
                                {item.color && <p className="text-[9px] text-green-500 font-bold uppercase">Color: {item.color}</p>}
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-[var(--text-muted)]">×{item.quantity}</p>
                                <p className="text-sm font-bold text-[var(--text-primary)]">₵{parseFloat(item.subtotal).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-[var(--border-color)] space-y-1 text-sm">
                           <div className="flex justify-between text-[var(--text-muted)]"><span>Subtotal</span><span>₵{parseFloat(selectedOrder.subtotal || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span></div>
                           {selectedOrder.delivery_fee > 0 && <div className="flex justify-between text-[var(--text-muted)]"><span>Delivery Fee</span><span>₵{parseFloat(selectedOrder.delivery_fee).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span></div>}
                           <div className="flex justify-between font-black text-base text-[var(--text-primary)] pt-1 border-t border-[var(--border-color)]"><span>Total</span><span className="text-green-500">₵{parseFloat(selectedOrder.total_amount || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span></div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-color)]">
                        <div>
                          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-2">Order Status</p>
                          <StatusSelect value={selectedOrder.status} options={STATUS_OPTIONS} onChange={v => updateStatus(selectedOrder.id, 'status', v)} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-2">Payment Status</p>
                          <StatusSelect value={selectedOrder.payment_status} options={['pending', 'paid', 'verified', 'failed']} onChange={v => updateStatus(selectedOrder.id, 'payment_status', v)} />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-color)] flex gap-3 flex-wrap items-center">
                      <button onClick={() => loadDocument(selectedOrder.id)} className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                        {documentData ? 'Refresh' : 'Generate'} Document
                      </button>
                      {documentData && <button onClick={handleSendEmail} disabled={sendingReceipt} className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-60">{sendingReceipt ? 'Sending...' : 'Send via Email'}</button>}
                      {documentData && <button onClick={handlePrint} className="px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600">Print</button>}
                    </div>

                    {documentData && (
                      <div ref={printRef} className="p-10 border border-[var(--border-color)] rounded-2xl bg-white text-gray-900 text-sm flex flex-col" style={{ minHeight: '800px' }}>
                        <div className="flex-1">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #16a34a', paddingBottom: '16px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <img src="/assets/Company logo.png" alt="Logo" style={{ height: '48px', width: 'auto', objectFit: 'contain' }} />
                              <div><div style={{ fontSize: '18px', fontWeight: 900, color: '#16a34a' }}>Expert Office Furnish</div></div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '24px', fontWeight: 900, textTransform: 'uppercase', color: '#111' }}>{documentData.docType}</div>
                              <div style={{ fontSize: '12px', color: '#666' }}>{documentData.order.order_number}</div>
                            </div>
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ borderBottom: '1px solid #e5e7eb' }}><th style={{ textAlign: 'left', padding: '8px' }}>Item</th><th style={{ textAlign: 'center', padding: '8px' }}>Qty</th><th style={{ textAlign: 'right', padding: '8px' }}>Total</th></tr></thead>
                            <tbody>
                              {documentData.items.map((item, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                  <td style={{ padding: '8px' }}><strong>{item.product_name}</strong>{item.color && <div>{item.color}</div>}</td>
                                  <td style={{ padding: '8px', textAlign: 'center' }}>{item.quantity}</td>
                                  <td style={{ padding: '8px', textAlign: 'right' }}>₵{parseFloat(item.subtotal).toLocaleString('en-GH')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div style={{ marginTop: '20px', borderTop: '2px solid #16a34a', paddingTop: '10px', textAlign: 'right' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#16a34a' }}>Total: ₵{parseFloat(documentData.order.total_amount).toLocaleString('en-GH')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {isEditing && editFormData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-primary)] w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] border border-[var(--border-color)] overflow-hidden flex flex-col shadow-2xl animate-scaleIn">
            <div className="px-8 py-6 border-b border-[var(--border-color)] flex items-center justify-between shrink-0">
               <div><h3 className="text-xl font-black text-[var(--text-primary)]">Edit Order #{selectedOrder.order_number}</h3></div>
               <button onClick={() => setIsEditing(false)} className="p-2.5 rounded-2xl hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
               <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Customer Name</label>
                    <input value={editFormData.customer_name} onChange={e => setEditFormData(f => ({ ...f, customer_name: e.target.value }))} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-3 px-5 text-sm font-bold text-[var(--text-primary)]" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Email</label>
                    <input value={editFormData.customer_email} onChange={e => setEditFormData(f => ({ ...f, customer_email: e.target.value }))} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-3 px-5 text-sm font-bold text-[var(--text-primary)]" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Phone</label>
                    <input value={editFormData.customer_phone} onChange={e => setEditFormData(f => ({ ...f, customer_phone: e.target.value }))} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-3 px-5 text-sm font-bold text-[var(--text-primary)]" />
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                    <h4 className="text-xs font-black uppercase text-blue-500 tracking-widest">Line Items</h4>
                    <input placeholder="Add product..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-1.5 px-4 text-xs text-[var(--text-primary)]" />
                  </div>
                  {productResults.length > 0 && (
                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-2 space-y-2 border border-[var(--border-color)] max-h-40 overflow-y-auto">
                        {productResults.map(p => (
                            <button key={p.id} onClick={() => addEditItem(p)} className="flex items-center gap-3 w-full p-2 hover:bg-green-500/10 rounded-xl transition-all"><img src={getImageUrl(p.primary_image)} className="w-8 h-8 rounded-lg" /><span className="flex-1 text-xs font-bold text-left">{p.name} - ₵{p.price}</span></button>
                        ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    {editFormData.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)]/50 rounded-2xl border border-[var(--border-color)]">
                            <img src={getImageUrl(item.image_url)} className="w-10 h-10 rounded-xl object-cover" />
                            <div className="flex-1 min-w-0"><p className="font-bold text-xs truncate">{item.product_name}</p></div>
                            <div className="flex items-center bg-[var(--bg-primary)] rounded-lg p-0.5"><button onClick={() => updateEditItemQty(idx, item.quantity - 1)} className="w-6 h-6">-</button><span className="w-8 text-center text-xs font-black text-green-500">{item.quantity}</span><button onClick={() => updateEditItemQty(idx, item.quantity + 1)} className="w-6 h-6">+</button></div>
                            <div className="text-right w-24"><p className="font-black text-sm">₵{item.subtotal.toLocaleString('en-GH')}</p></div>
                            <button onClick={() => removeEditItem(idx)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl"><Trash2 size={16} /></button>
                        </div>
                    ))}
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-8">
                  <div className="p-6 bg-blue-500/5 rounded-[2rem] space-y-4">
                     <h4 className="text-xs font-black uppercase text-blue-500 tracking-widest">Logistics</h4>
                     <div className="flex gap-4">
                        <select value={editFormData.delivery_mode} onChange={e => setEditFormData(f => ({ ...f, delivery_mode: e.target.value }))} className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl py-2 px-3 text-xs font-bold"><option value="pickup">Pick-up</option><option value="delivery">Delivery</option></select>
                        <input type="number" value={editFormData.delivery_fee} onChange={e => setEditFormData(f => ({ ...f, delivery_fee: parseFloat(e.target.value) || 0 }))} className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl py-2 px-3 text-xs font-bold" />
                     </div>
                  </div>
                  <div className="flex flex-col justify-end p-8 bg-[var(--bg-secondary)] rounded-[2rem] border border-[var(--border-color)]">
                        <div className="flex justify-between items-center text-lg font-black text-green-500"><span>GRAND TOTAL</span><span>₵{(editFormData.items.reduce((acc, it) => acc + it.subtotal, 0) + editFormData.delivery_fee).toLocaleString('en-GH')}</span></div>
                  </div>
               </div>
            </div>
            <div className="px-8 py-6 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/30 flex justify-end gap-4 shrink-0">
                <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 text-xs font-black text-[var(--text-muted)]">Discard</button>
                <button onClick={saveOrderEdits} disabled={submitting} className="px-10 py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-xs font-black flex items-center gap-2">{submitting ? 'Updating...' : 'Save Order'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

const StatusSelect = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] transition-colors">
        <span className="capitalize">{(value || '').replace('_', ' ')}</span>
        <ChevronDown size={14} className="text-[var(--text-muted)]" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 w-full rounded-xl overflow-hidden shadow-xl z-50 border border-[var(--border-color)]" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          {options.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} className={`w-full text-left px-3 py-2.5 text-sm hover:bg-[var(--bg-tertiary)] ${opt === value ? 'text-green-500 font-bold' : 'text-[var(--text-primary)]'}`}>{opt.replace('_', ' ')}</button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
