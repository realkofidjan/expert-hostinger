import React, { useState, useEffect, useRef, useCallback } from 'react';
import Pagination from '../../components/admin/Pagination';
import api from '../../api';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Search, Filter, Calendar,
  Package, Truck, Store, CreditCard, Banknote, Smartphone,
  Printer, CheckCircle, ShieldCheck, Loader2, ChevronDown, Clock, Mail, Send
} from 'lucide-react';
import { toast } from 'react-toastify';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5001';

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

  const filtered = orders; // filtering is now server-side

  return (
    <AdminLayout>
      <div className="flex flex-col animate-fadeIn">
        {/* Page Header */}
        <div className="mb-4 shrink-0">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Order Management</h1>
          <p className="text-[var(--text-muted)] mt-1">View, process and track all customer orders</p>
        </div>

        {/* Filters */}
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

        {/* Split Panel */}
        <div className="flex gap-4" style={{ height: 'calc(100vh - 280px)', minHeight: '420px' }}>
          {/* Left: Order List */}
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
                    className={`w-full text-left px-4 py-3 border-b border-[var(--border-color)] transition-colors ${isSelected
                      ? 'bg-green-500/10 border-l-2 border-l-green-500'
                      : 'hover:bg-[var(--bg-secondary)]/50'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-mono text-green-500 font-bold text-xs">{order.order_number || `#${order.id}`}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${statusColor(order.status)}`}>
                        {(order.status || 'pending').replace('_', ' ')}
                      </span>
                    </div>
                    <p className="font-semibold text-[var(--text-primary)] text-xs truncate">{order.customer_name || '—'}</p>
                    <p className="text-[var(--text-muted)] text-[10px] truncate">{order.customer_email || ''}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-1">
                        {methodIcon(order.payment_method)}
                        <span className="text-[10px] text-[var(--text-secondary)]">{methodLabel(order.payment_method)}</span>
                      </div>
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        ₵{parseFloat(order.total_amount || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {show72h && timer72 && (
                      <div className={`mt-1 flex items-center gap-1 text-[9px] font-bold ${timer72.expired ? 'text-red-500' : 'text-amber-500'}`}>
                        <Clock size={9} /> {timer72.expired ? 'Deposit window expired' : timer72.label}
                      </div>
                    )}
                    <p className="text-[var(--text-muted)] text-[10px] mt-0.5 flex items-center gap-1">
                      <Calendar size={9} /> {new Date(order.created_at).toLocaleDateString()}
                    </p>
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

          {/* Right: Detail Panel */}
          <div className="flex-1 glass rounded-3xl overflow-hidden flex flex-col h-full" style={{ minWidth: 0 }}>
            {!selectedOrder ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                <Package size={48} className="text-[var(--text-muted)] opacity-30 mb-4" />
                <p className="text-[var(--text-primary)] font-bold text-lg">Select an Order</p>
                <p className="text-[var(--text-muted)] text-sm mt-1">Click any order on the left to view and manage its details.</p>
              </div>
            ) : (
              <>
                {/* Detail Header */}
                <div className="px-6 py-4 border-b border-[var(--border-color)] shrink-0 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-[var(--text-primary)]">
                      Order {selectedOrder.order_number || `#${selectedOrder.id}`}
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColor(selectedOrder.status)}`}>
                      {(selectedOrder.status || 'pending').replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {detailLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Customer + Delivery + Payment */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl">
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-2">Customer</p>
                        <p className="font-bold text-sm text-[var(--text-primary)]">{selectedOrder.customer_name || '—'}</p>
                        <p className="text-xs text-[var(--text-muted)]">{selectedOrder.customer_email || ''}</p>
                        <p className="text-xs text-[var(--text-muted)]">{selectedOrder.customer_phone || ''}</p>
                      </div>
                      <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl">
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-2">Delivery</p>
                        <div className="flex items-center gap-1.5">
                          {selectedOrder.delivery_mode === 'delivery'
                            ? <Truck size={14} className="text-blue-500" />
                            : <Store size={14} className="text-yellow-500" />}
                          <span className="font-bold text-sm text-[var(--text-primary)] capitalize">{selectedOrder.delivery_mode || 'pickup'}</span>
                        </div>
                        {(() => {
                          if (selectedOrder.delivery_mode !== 'delivery') return null;
                          let addr = null;
                          try { addr = JSON.parse(selectedOrder.shipping_address); } catch { addr = null; }
                          return (
                            <div className="mt-2 space-y-0.5 text-xs text-[var(--text-secondary)]">
                              {addr?.address && <p>{addr.address}</p>}
                              {addr?.city && <p>{addr.city}</p>}
                              {selectedOrder.region && <p className="font-semibold">{selectedOrder.region}</p>}
                              {addr?.landmark && <p className="text-[var(--text-muted)] italic">{addr.landmark}</p>}
                              {selectedOrder.delivery_fee > 0 ? (
                                <p className="font-bold text-blue-500 mt-1">Fee: ₵{parseFloat(selectedOrder.delivery_fee).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
                              ) : (
                                <p className="text-amber-500 font-bold mt-1">Fee: TBD</p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl">
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-2">Payment</p>
                        <div className="flex items-center gap-1.5">
                          {methodIcon(selectedOrder.payment_method)}
                          <span className="font-bold text-sm text-[var(--text-primary)]">{methodLabel(selectedOrder.payment_method)}</span>
                        </div>
                        <span className={`mt-1 inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${paymentColor(selectedOrder.payment_status)}`}>
                          {(selectedOrder.payment_status || 'pending').replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Bank Transfer 72h window */}
                    {selectedOrder.payment_method === 'bank_transfer' && !selectedOrder.bank_receipt_path && selectedOrder.status === 'pending' && (() => {
                      const { expired, label } = get72hStatus(selectedOrder.created_at);
                      return (
                        <div className={`p-4 rounded-2xl border flex items-center gap-3 ${expired ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                          <Clock size={16} className={expired ? 'text-red-500' : 'text-amber-500'} />
                          <div>
                            <p className={`text-xs font-black uppercase tracking-wider ${expired ? 'text-red-500' : 'text-amber-500'}`}>
                              {expired ? 'Deposit window expired — no receipt uploaded' : `Awaiting customer deposit receipt`}
                            </p>
                            <p className={`text-xs mt-0.5 ${expired ? 'text-red-400' : 'text-amber-400'}`}>
                              {expired ? 'You may cancel this order.' : `Customer has ${label} to upload their deposit receipt.`}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Bank Transfer Receipt */}
                    {selectedOrder.payment_method === 'bank_transfer' && selectedOrder.bank_receipt_path && (
                      <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-blue-500 uppercase tracking-wider flex items-center gap-2">
                            <CreditCard size={14} /> Bank Transfer Receipt
                          </p>
                          {!selectedOrder.bank_receipt_verified ? (
                            <button
                              onClick={() => verifyTransfer(selectedOrder.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-xl hover:bg-green-600 transition-colors"
                            >
                              <ShieldCheck size={13} /> Verify Transfer
                            </button>
                          ) : (
                            <span className="flex items-center gap-1 text-xs font-bold text-green-500">
                              <CheckCircle size={13} /> Verified
                            </span>
                          )}
                        </div>
                        {selectedOrder.bank_receipt_path.endsWith('.pdf') ? (
                          <a
                            href={`${BACKEND_URL}${selectedOrder.bank_receipt_path}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500 text-sm font-bold hover:underline"
                          >
                            View PDF Receipt
                          </a>
                        ) : (
                          <img
                            src={`${BACKEND_URL}${selectedOrder.bank_receipt_path}`}
                            alt="Bank Receipt"
                            className="max-h-48 rounded-xl object-contain bg-white"
                          />
                        )}
                      </div>
                    )}

                    {/* Order Items */}
                    {orderDetails?.items && (
                      <div>
                        <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider mb-3">Items Ordered</p>
                        <div className="space-y-2">
                          {orderDetails.items.map(item => (
                            <div key={item.id} className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-xl">
                              <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center overflow-hidden shrink-0">
                                {item.image_url
                                  ? <img src={`${BACKEND_URL}${item.image_url}`} alt={item.product_name} className="w-full h-full object-cover" />
                                  : <Package size={16} className="text-[var(--text-muted)]" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[var(--text-primary)] truncate flex items-center gap-2">
                                  {item.product_name}
                                  {item.color && <span className="px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded text-[9px] font-black uppercase tracking-widest border border-green-500/20">Color: {item.color}</span>}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">SKU: {item.sku || '—'}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs text-[var(--text-muted)]">×{item.quantity} @ ₵{parseFloat(item.unit_price).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
                                <p className="text-sm font-bold text-[var(--text-primary)]">₵{parseFloat(item.subtotal).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-[var(--border-color)] space-y-1 text-sm">
                          <div className="flex justify-between text-[var(--text-muted)]">
                            <span>Subtotal</span>
                            <span>₵{parseFloat(selectedOrder.subtotal || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
                          </div>
                          {selectedOrder.delivery_fee > 0 && (
                            <div className="flex justify-between text-[var(--text-muted)]">
                              <span>Delivery Fee</span>
                              <span>₵{parseFloat(selectedOrder.delivery_fee).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-black text-base text-[var(--text-primary)] pt-1 border-t border-[var(--border-color)]">
                            <span>Total</span>
                            <span className="text-green-500">₵{parseFloat(selectedOrder.total_amount || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Status Update */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider mb-2">Update Order Status</p>
                        <StatusSelect
                          value={selectedOrder.status}
                          options={STATUS_OPTIONS}
                          onChange={v => updateStatus(selectedOrder.id, 'status', v)}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider mb-2">Update Payment Status</p>
                        <StatusSelect
                          value={selectedOrder.payment_status}
                          options={['pending', 'pending_verification', 'verified', 'paid', 'failed']}
                          onChange={v => updateStatus(selectedOrder.id, 'payment_status', v)}
                        />
                      </div>
                    </div>

                    {/* Delivery Info Editor */}
                    {selectedOrder.delivery_mode === 'delivery' && (
                      <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl space-y-3">
                        <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider">Delivery Info for Customer</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Estimated Delivery Date</label>
                            <input
                              type="date"
                              value={deliveryEdit.date}
                              onChange={e => setDeliveryEdit(p => ({ ...p, date: e.target.value }))}
                              className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] focus:border-green-500 outline-none"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={saveDeliveryInfo}
                              disabled={savingDelivery}
                              className="w-full py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-black rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                            >
                              {savingDelivery ? <><div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" /> Saving...</> : 'Save'}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                            Delivery Notes <span className="normal-case font-normal">(visible to customer)</span>
                          </label>
                          <textarea
                            value={deliveryEdit.notes}
                            onChange={e => setDeliveryEdit(p => ({ ...p, notes: e.target.value }))}
                            rows={2}
                            placeholder="e.g. Driver will call 30 mins before arrival. Deliver to the reception."
                            className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-green-500 outline-none resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Document Generation */}
                    <div className="pt-2 border-t border-[var(--border-color)] flex gap-3 flex-wrap items-center">
                      <button
                        onClick={() => loadDocument(selectedOrder.id)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                      >
                        <Package size={15} /> {documentData ? 'Refresh' : 'Generate'} {selectedOrder.payment_method === 'cash' ? 'Invoice' : 'Receipt'}
                      </button>

                      {documentData && (
                        <button
                          onClick={handleSendEmail}
                          disabled={sendingReceipt}
                          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-60"
                        >
                          {sendingReceipt
                            ? <><Loader2 size={15} className="animate-spin" /> Sending...</>
                            : <><Send size={15} /> Send via Email</>}
                        </button>
                      )}

                      {documentData && (
                        <button
                          onClick={handlePrint}
                          className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition-colors"
                        >
                          <Printer size={15} /> Print
                        </button>
                      )}
                      
                      {documentData && (
                        <span className="flex items-center gap-1.5 text-xs text-green-500 font-bold">
                          <Mail size={13} /> {selectedOrder.customer_email}
                        </span>
                      )}
                    </div>

                    {/* Document Preview */}
                    {documentData && (
                      <div ref={printRef} className="p-10 border border-[var(--border-color)] rounded-2xl bg-white text-gray-900 text-sm flex flex-col" style={{ minHeight: '800px' }}>
                        <div className="flex-1">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #16a34a', paddingBottom: '16px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <img src="/assets/Company logo.png" alt="Logo" style={{ height: '48px', width: 'auto', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                              <div>
                                <div style={{ fontSize: '18px', fontWeight: 900, color: '#16a34a' }}>Expert Office Furnish</div>
                                {documentData.storeInfo?.pickup_address && <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{documentData.storeInfo.pickup_address}</div>}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '24px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: '#111' }}>{documentData.docType}</div>
                              <div style={{ fontSize: '12px', color: '#666' }}>{documentData.order.order_number}</div>
                              <div style={{ fontSize: '12px', color: '#666' }}>{new Date(documentData.order.created_at).toLocaleDateString()}</div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div>
                              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '1px' }}>Billed To</div>
                              <div style={{ fontWeight: 700, marginTop: '4px' }}>{documentData.order.customer_name}</div>
                              <div style={{ color: '#666' }}>{documentData.order.customer_email}</div>
                              {documentData.order.customer_phone && <div style={{ color: '#666' }}>{documentData.order.customer_phone}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '1px' }}>Order Details</div>
                              <div style={{ marginTop: '4px', color: '#555' }}>Payment: <strong>{methodLabel(documentData.order.payment_method)}</strong></div>
                              <div style={{ color: '#555' }}>Delivery: <strong style={{ textTransform: 'capitalize' }}>{documentData.order.delivery_mode}</strong></div>
                              {documentData.order.delivery_mode === 'delivery' && (() => {
                                let addr = null;
                                try { addr = JSON.parse(documentData.order.shipping_address); } catch { }
                                return (
                                  <div style={{ color: '#555', marginTop: '4px' }}>
                                    {addr?.address && <div>{addr.address}</div>}
                                    {addr?.city && <div>{addr.city}</div>}
                                    {documentData.order.region && <div><strong>{documentData.order.region}</strong></div>}
                                    {addr?.landmark && <div style={{ color: '#888', fontStyle: 'italic' }}>{addr.landmark}</div>}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ textAlign: 'left', padding: '8px 4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#888' }}>Item</th>
                                <th style={{ textAlign: 'center', padding: '8px 4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#888' }}>Qty</th>
                                <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#888' }}>Unit Price</th>
                                <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#888' }}>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {documentData.items.map((item, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                  <td style={{ padding: '10px 4px' }}>
                                    <div style={{ fontWeight: 700 }}>{item.product_name}</div>
                                    {item.color && <div style={{ fontSize: '10px', color: '#666', marginTop: '2px', textTransform: 'uppercase', fontWeight: 700 }}>Color: {item.color}</div>}
                                  </td>
                                  <td style={{ padding: '10px 4px', textAlign: 'center' }}>{item.quantity}</td>
                                  <td style={{ padding: '10px 4px', textAlign: 'right' }}>₵{parseFloat(item.unit_price).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</td>
                                  <td style={{ padding: '10px 4px', textAlign: 'right' }}>₵{parseFloat(item.subtotal).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div style={{ marginTop: 'auto', borderTop: '1px solid #f3f4f6', paddingTop: '20px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', marginLeft: 'auto', maxWidth: '250px' }}>
                            <tbody>
                              <tr style={{ fontSize: '13px' }}>
                                <td style={{ color: '#666', padding: '4px 0' }}>Subtotal</td>
                                <td style={{ textAlign: 'right', fontWeight: 600, padding: '4px 0' }}>₵{parseFloat(documentData.order.subtotal || (documentData.order.total_amount - (documentData.order.delivery_fee || 0))).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</td>
                              </tr>
                              {documentData.order.delivery_fee > 0 && (
                                <tr style={{ fontSize: '13px' }}>
                                  <td style={{ color: '#666', padding: '4px 0' }}>Delivery Fee</td>
                                  <td style={{ textAlign: 'right', fontWeight: 600, padding: '4px 0' }}>₵{parseFloat(documentData.order.delivery_fee).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</td>
                                </tr>
                              )}
                              <tr style={{ borderTop: '2px solid #16a34a', marginTop: '10px' }}>
                                <td style={{ textAlign: 'left', padding: '12px 0 4px', fontWeight: 900, fontSize: '16px', color: '#333' }}>Total</td>
                                <td style={{ textAlign: 'right', padding: '12px 0 4px', fontWeight: 900, fontSize: '16px', color: '#16a34a' }}>₵{parseFloat(documentData.order.total_amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</td>
                              </tr>
                            </tbody>
                          </table>
                          <div style={{ marginTop: '40px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', fontSize: '11px', color: '#888', textAlign: 'center' }}>
                            Thank you for your business! — Expert Office Furnish
                          </div>
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
    </AdminLayout>
  );
};

const StatusSelect = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] hover:border-green-500 transition-colors"
      >
        <span className="capitalize">{(value || '').replace('_', ' ')}</span>
        <ChevronDown size={14} className="text-[var(--text-muted)]" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 w-full rounded-xl overflow-hidden shadow-xl z-50 border border-[var(--border-color)]" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          {options.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-[var(--bg-tertiary)] transition-colors ${opt === value ? 'text-green-500 font-bold' : 'text-[var(--text-primary)]'}`}>
              {opt.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
