import React, { useState, useEffect } from 'react';
import api from '../../api';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Search, Filter, Eye, Download, Calendar,
  CheckCircle, Clock, Truck, X,
  User, Mail, Phone, ArrowLeft,
  Info, BadgePercent, Package, Percent,
  Banknote, Store
} from 'lucide-react';
import { useAlert } from '../../context/AlertContext';
import ConfirmModal from '../../components/admin/ConfirmModal';

const Quotes = () => {
  const { showAlert } = useAlert();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Detail State
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    discount: '', // This will be treated as a percentage
    estimated_delivery_date: '',
    status: 'reviewed'
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('in_store');
  const [confirm, setConfirm] = useState({ show: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/quotes');
      setQuotes(response.data || []);
    } catch (err) {
      showAlert('error', 'Fetch Failed', 'Failed to fetch quote requests');
    } finally {
      setLoading(false);
    }
  };

  const selectQuote = (quote) => {
    setSelectedQuote(quote);
    setReviewForm({
      discount: quote.discount || '0',
      estimated_delivery_date: quote.estimated_delivery_date ? quote.estimated_delivery_date.split('T')[0] : '',
      status: quote.status === 'pending' ? 'reviewed' : quote.status
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await api.patch(`/admin/quotes/${selectedQuote.id}/details`, reviewForm);
      showAlert('success', 'Update Complete', `Quote #${selectedQuote.id} updated successfully`);
      setQuotes(prev => prev.map(q => q.id === selectedQuote.id ? { 
        ...q, 
        discount: reviewForm.discount, 
        estimated_delivery_date: reviewForm.estimated_delivery_date,
        status: reviewForm.status
      } : q));
      setSelectedQuote(null);
    } catch (err) {
      showAlert('error', 'Update Failed', 'Failed to update quote details');
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    const name = (quote.customer_name || '').toLowerCase();
    const email = (quote.customer_email || '').toLowerCase();
    const matchesStatus = filterStatus === 'all' || quote.status === filterStatus;
    const matchesSearch = 
      quote.id.toString().includes(searchQuery) ||
      name.includes(searchQuery.toLowerCase()) ||
      email.includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusInfo = (status) => {
    switch (status) {
      case 'approved': return { color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: <CheckCircle size={12} /> };
      case 'reviewed': 
      case 'contacted': return { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: <Eye size={12} /> };
      case 'pending': return { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: <Clock size={12} /> };
      case 'delivered': return { color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: <Truck size={12} /> };
      case 'cancelled': return { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: <X size={12} /> };
      default: return { color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', icon: <Clock size={12} /> };
    }
  };

  const parseItems = (items) => {
    try {
      return typeof items === 'string' ? JSON.parse(items) : (items || []);
    } catch {
      return [];
    }
  };

  const calculateSubtotal = (items) => {
    const itemList = parseItems(items);
    return itemList.reduce((total, item) => total + (parseFloat(item.price || 0) * item.quantity), 0);
  };

  const handleConfirmPayment = () => {
    setConfirm({
      show: true,
      title: 'Confirm Payment?',
      message: `Verify the ${paymentMethod === 'in_store' ? 'in-store' : 'check'} payment receipt for project quote #${selectedQuote.id}?`,
      confirmLabel: 'Confirm Payment',
      confirmColor: 'blue',
      onConfirm: async () => {
        setConfirmingPayment(true);
        try {
          await api.post(`/admin/quotes/${selectedQuote.id}/confirm-payment`, { payment_method: paymentMethod });
          showAlert('success', 'Payment Confirmed', 'Order is now processing.');
          setQuotes(prev => prev.map(q => q.id === selectedQuote.id ? { ...q, status: 'paid', payment_method: paymentMethod } : q));
          setSelectedQuote(prev => ({ ...prev, status: 'paid', payment_method: paymentMethod }));
        } catch (err) {
          showAlert('error', 'Confirmation Failed', err.response?.data?.error || 'Failed to confirm payment');
        } finally {
          setConfirmingPayment(false);
        }
      }
    });
  };

  const subtotal = selectedQuote ? calculateSubtotal(selectedQuote.items) : 0;
  const discountAmount = selectedQuote ? (subtotal * (parseFloat(reviewForm.discount || 0) / 100)) : 0;
  const finalPrice = subtotal - discountAmount;

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn transition-colors duration-300 min-h-screen pb-24">
        {!selectedQuote ? (
          <>
            {/* List Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-[var(--text-primary)]">Quote Requests</h1>
                <p className="text-[var(--text-muted)] mt-1 font-medium">Manage project proposals and client workspace inquiries</p>
              </div>
              <div className="flex items-center gap-3">
                 <button className="px-5 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl hover:bg-[var(--bg-tertiary)] transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[var(--text-primary)] shadow-sm">
                  <Download size={16} />
                  Export History
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="glass p-6 rounded-[2.5rem] flex flex-col md:flex-row gap-6 shadow-xl border border-[var(--border-color)] bg-white/40 dark:bg-gray-950/40">
              <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input 
                  type="text"
                  placeholder="Search by ID, Customer Name or Email Address..."
                  className="w-full bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] rounded-[1.5rem] py-4 pl-14 pr-6 text-sm font-medium text-[var(--text-primary)] focus:border-green-500/50 focus:ring-0 transition-all outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-[var(--text-muted)] group-focus-within:text-green-500" />
                <select 
                  className="bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] rounded-[1.5rem] py-4 px-8 text-xs font-black uppercase tracking-widest focus:border-green-500/50 focus:ring-0 text-[var(--text-primary)] outline-none appearance-none cursor-pointer"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Request Status</option>
                  <option value="pending">Pending Review</option>
                  <option value="reviewed">Reviewed Proposals</option>
                  <option value="approved">Approved Projects</option>
                  <option value="delivered">Completed Deliveries</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="glass rounded-[2.5rem] overflow-hidden shadow-2xl border border-[var(--border-color)] bg-white/40 dark:bg-gray-950/40">
              <div className="overflow-x-auto overflow-y-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-secondary)]/80 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-black border-b border-[var(--border-color)]">
                      <th className="px-10 py-6">Project ID</th>
                      <th className="px-10 py-6">Date</th>
                      <th className="px-10 py-6">Customer Profile</th>
                      <th className="px-10 py-6">Base Quote (GHS)</th>
                      <th className="px-10 py-6">Status</th>
                      <th className="px-10 py-6 text-right">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="px-10 py-32 text-center text-[var(--text-primary)]">
                           <div className="flex flex-col items-center gap-4">
                             <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                             <p className="animate-pulse tracking-[0.3em] text-[10px] font-black uppercase overflow-hidden whitespace-nowrap">Synchronizing Database...</p>
                           </div>
                        </td>
                      </tr>
                    ) : filteredQuotes.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-10 py-32 text-center">
                           <p className="text-sm font-bold text-[var(--text-muted)] italic">No records discovered for this search parameter.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredQuotes.map((quote) => {
                        const status = getStatusInfo(quote.status);
                        const sub = calculateSubtotal(quote.items);
                        return (
                          <tr key={quote.id} className="hover:bg-green-500/[0.04] dark:hover:bg-green-500/[0.02] transition-colors group cursor-pointer" onClick={() => selectQuote(quote)}>
                            <td className="px-10 py-7 font-black text-green-600/80 dark:text-green-500/80 font-mono tracking-tighter text-base">#{quote.id.toString().padStart(5, '0')}</td>
                            <td className="px-10 py-7 text-[var(--text-secondary)] font-medium">
                               <div className="flex items-center gap-2.5">
                                 <Calendar size={14} className="opacity-40" />
                                 <span className="text-xs font-bold uppercase tracking-wide">{new Date(quote.created_at).toLocaleDateString()}</span>
                               </div>
                            </td>
                            <td className="px-10 py-7">
                               <p className="font-extrabold text-[var(--text-primary)] text-sm mb-0.5">{quote.customer_name}</p>
                               <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-tighter">{quote.customer_email}</p>
                            </td>
                            <td className="px-10 py-7 font-black text-[var(--text-primary)] tabular-nums">
                               GHS {sub.toLocaleString()}
                            </td>
                            <td className="px-10 py-7">
                               <span className={`px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 w-fit shadow-sm ${status.color}`}>
                                 {status.icon}
                                 {quote.status}
                               </span>
                            </td>
                            <td className="px-10 py-7 text-right">
                               <button className="w-12 h-12 bg-[var(--bg-secondary)] hover:bg-green-500 hover:text-white rounded-[1.2rem] transition-all shadow-md border border-[var(--border-color)] flex items-center justify-center translate-x-3 group-hover:translate-x-0 group-hover:scale-105 active:scale-95">
                                 <Eye size={20} />
                               </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Detailed Inline Project View */
          <div className="space-y-8 animate-slideInRight max-w-7xl mx-auto pb-20">
            {/* Nav Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b-2 border-dashed border-[var(--border-color)]">
               <div className="flex items-center gap-8">
                  <button 
                    onClick={() => setSelectedQuote(null)}
                    className="w-14 h-14 rounded-3xl bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] flex items-center justify-center hover:bg-green-500 hover:text-white hover:border-green-500 transition-all shadow-xl active:scale-90"
                  >
                    <ArrowLeft size={24} />
                  </button>
                  <div>
                    <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Quote Analysis</h1>
                    <div className="flex items-center gap-3 mt-1.5">
                       <span className="text-[10px] font-black text-green-600 bg-green-500/10 px-3 py-1 rounded-lg uppercase tracking-widest font-mono">Archive: #EXP-Q{selectedQuote.id.toString().padStart(5, '0')}</span>
                       <div className="w-1 h-1 rounded-full bg-[var(--text-muted)]"></div>
                       <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{new Date(selectedQuote.created_at).toLocaleString()}</span>
                    </div>
                  </div>
               </div>
               <div className="flex items-center gap-4">
                  <span className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border-2 flex items-center gap-3 shadow-xl ${getStatusInfo(selectedQuote.status).color}`}>
                    {getStatusInfo(selectedQuote.status).icon}
                    {selectedQuote.status}
                  </span>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
               {/* Assets & Meta (Left) */}
               <div className="lg:col-span-2 space-y-10">
                  {/* Registry Card */}
                  <div className="glass p-10 rounded-[3rem] border border-[var(--border-color)] shadow-2xl relative overflow-hidden bg-gradient-to-br from-white/40 to-white/10 dark:from-gray-900/40 dark:to-gray-900/10">
                    <div className="grid md:grid-cols-3 gap-10 relative z-10">
                       <div className="space-y-2">
                          <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2"><User size={12} className="text-green-500" /> Client Identity</p>
                          <p className="text-xl font-extrabold text-[var(--text-primary)]">{selectedQuote.customer_name}</p>
                       </div>
                       <div className="space-y-2">
                          <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2"><Mail size={12} className="text-blue-500" /> Communications</p>
                          <p className="text-base font-bold text-[var(--text-secondary)]">{selectedQuote.customer_email}</p>
                       </div>
                       <div className="space-y-2">
                          <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2"><Phone size={12} className="text-yellow-500" /> Secure Line</p>
                          <p className="text-base font-bold text-[var(--text-secondary)]">{selectedQuote.customer_phone || 'REDACTED'}</p>
                       </div>
                    </div>
                    {/* Atmospheric Decoration */}
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-green-500/5 blur-3xl rounded-full"></div>
                  </div>

                  {/* Product Inventory Assets */}
                  <div className="glass rounded-[3rem] border border-[var(--border-color)] shadow-2xl overflow-hidden bg-white/60 dark:bg-gray-950/60">
                    <div className="px-10 py-8 bg-[var(--bg-secondary)]/60 border-b border-[var(--border-color)] flex items-center justify-between backdrop-blur-md">
                       <h3 className="text-base font-black text-[var(--text-primary)] tracking-widest flex items-center gap-3">
                          <Package size={22} className="text-green-500" strokeWidth={2.5} /> 
                          QUOTE ASSETS
                       </h3>
                       <div className="flex items-center gap-2 px-4 py-1.5 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] shadow-inner">
                          <span className="text-[10px] font-black text-green-600 tracking-tighter">{parseItems(selectedQuote.items).length} SKU(s)</span>
                          <span className="w-1 h-1 rounded-full bg-[var(--border-color)] mx-1"></span>
                          <span className="text-[10px] font-black text-[var(--text-muted)] tracking-tighter">VERIFIED</span>
                       </div>
                    </div>
                    <div className="p-10">
                       <div className="space-y-8">
                          {parseItems(selectedQuote.items).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-10 group/item transition-all hover:translate-x-1">
                               <div className="flex items-center gap-8">
                                  <div className="w-24 h-24 rounded-[2rem] bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] overflow-hidden flex-shrink-0 shadow-lg group-hover/item:border-green-500/50 transition-colors">
                                     {item.image ? (
                                       <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500" />
                                     ) : (
                                       <div className="w-full h-full flex items-center justify-center text-4xl">🏷️</div>
                                     )}
                                  </div>
                                  <div className="space-y-1.5">
                                     <h4 className="font-black text-[var(--text-primary)] text-lg line-clamp-1">{item.name}</h4>
                                     <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
                                           <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tighter">QTY:</span>
                                           <span className="text-sm font-black text-green-600">{item.quantity}</span>
                                        </div>
                                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest font-mono">Unit: GHS {parseFloat(item.price).toLocaleString()}</span>
                                     </div>
                                  </div>
                               </div>
                               <div className="text-right space-y-1">
                                  <p className="text-xl font-black text-[var(--text-primary)] tabular-nums">GHS {(item.price * item.quantity).toLocaleString()}</p>
                                  <p className="text-[10px] font-black text-green-500/70 tracking-widest uppercase">System Price Verified</p>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>

                  {/* Memo Card */}
                  <div className="glass p-10 rounded-[3rem] border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)]/10">
                    <div className="flex items-center gap-3 mb-6">
                       <div className="w-10 h-10 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center border border-[var(--border-color)] text-green-500 shadow-sm">
                          <Info size={20} strokeWidth={2.5} />
                       </div>
                       <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-[0.2em]">Project Discovery Memo</h3>
                    </div>
                    <p className="text-base text-[var(--text-secondary)] font-medium leading-[2] italic px-2">"{selectedQuote.details}"</p>
                  </div>
               </div>

               {/* Pricing & Control Center (Right) */}
               <div className="lg:sticky lg:top-8 space-y-8">
                  <div className="glass p-10 rounded-[3.5rem] border border-[var(--border-color)] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.15)] bg-gradient-to-b from-white dark:from-gray-900 to-transparent">
                     <h3 className="text-xl font-black text-[var(--text-primary)] mb-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/30">
                           <BadgePercent size={24} />
                        </div>
                        Proposal Terms
                     </h3>

                     <div className="space-y-8">
                        {/* Financial Snapshot */}
                        <div className="p-8 bg-[var(--bg-secondary)] rounded-[2.5rem] border border-[var(--border-color)] shadow-inner space-y-6">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Base Subtotal (GHS)</span>
                              <span className="font-extrabold text-lg text-[var(--text-secondary)] tabular-nums">{subtotal.toLocaleString()}</span>
                           </div>
                           <div className="flex items-center justify-between text-blue-500 transition-all duration-300">
                              <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><Percent size={12} /> Applied Discount</span>
                              <span className="font-extrabold text-lg tabular-nums">-{reviewForm.discount || 0}%</span>
                           </div>
                           <div className="flex items-center justify-between text-red-500/80">
                              <span className="text-[10px] font-black uppercase tracking-widest">Reduction Amount</span>
                              <span className="font-extrabold text-sm tabular-nums">- GHS {discountAmount.toLocaleString()}</span>
                           </div>
                           <div className="pt-6 border-t-2 border-dashed border-[var(--border-color)] space-y-2">
                              <p className="text-[9px] font-black text-green-600 uppercase tracking-[0.3em] text-center mb-1">Finalized Client Proposal</p>
                              <div className="text-4xl font-black text-green-600 text-center tracking-tighter tabular-nums drop-shadow-sm">GHS {finalPrice.toLocaleString()}</div>
                           </div>
                        </div>

                        {/* Proposal Form */}
                        <form onSubmit={handleReviewSubmit} className="space-y-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-3">Proposed Discount (%)</label>
                              <div className="relative group">
                                 <Percent className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 group-focus-within:scale-125 transition-transform" strokeWidth={3} />
                                 <input 
                                   type="number" max="100" min="0" step="0.5"
                                   className="w-full pl-14 pr-8 py-5 bg-[var(--bg-secondary)] border-2 border-transparent focus:border-green-500/50 rounded-[1.8rem] text-base font-black text-[var(--text-primary)] outline-none transition-all shadow-inner"
                                   value={reviewForm.discount}
                                   onChange={(e) => setReviewForm({ ...reviewForm, discount: e.target.value })}
                                   placeholder="0"
                                 />
                              </div>
                           </div>

                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-3">Target Fulfillment Date</label>
                              <div className="relative group">
                                 <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 group-focus-within:scale-125 transition-transform" />
                                 <input 
                                   type="date"
                                   className="w-full pl-14 pr-8 py-5 bg-[var(--bg-secondary)] border-2 border-transparent focus:border-green-500/50 rounded-[1.8rem] text-sm font-black text-[var(--text-primary)] outline-none transition-all shadow-inner"
                                   value={reviewForm.estimated_delivery_date}
                                   onChange={(e) => setReviewForm({ ...reviewForm, estimated_delivery_date: e.target.value })}
                                 />
                              </div>
                           </div>

                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-3">Action Lifecycle State</label>
                              <div className="relative">
                                 <select 
                                   className="w-full px-8 py-5 bg-[var(--bg-secondary)] border-2 border-transparent focus:border-green-500/50 rounded-[1.8rem] text-sm font-black text-[var(--text-primary)] outline-none appearance-none cursor-pointer shadow-inner"
                                   value={reviewForm.status}
                                   onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}
                                 >
                                   <option value="pending">PENDING: New Request</option>
                                   <option value="reviewed">REVIEWED: Offer Active</option>
                                   <option value="contacted">CONTACTED: In Discussion</option>
                                   <option value="approved">FINALIZED: Project Ordered</option>
                                   <option value="delivered">DELIVERED: Item Released</option>
                                   <option value="cancelled">CANCELLED: Request Closed</option>
                                 </select>
                                 <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                    <Clock size={16} />
                                 </div>
                              </div>
                           </div>

                           <button
                             type="submit" disabled={submittingReview}
                             className="w-full py-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-[2.2rem] font-extrabold text-sm tracking-widest uppercase hover:scale-[1.03] hover:shadow-[0_25px_60px_-10px_rgba(34,197,94,0.4)] active:scale-95 transition-all flex items-center justify-center gap-3 group disabled:opacity-50 mt-4 shadow-2xl"
                           >
                             {submittingReview ? 'ARCHIVING...' : 'RELEASE PROJECT OFFER'}
                             {!submittingReview && <CheckCircle size={20} className="group-hover:rotate-12 transition-transform" strokeWidth={2.5} />}
                           </button>
                        </form>

                        {/* Manual Payment Confirmation — for approved quotes */}
                        {selectedQuote.status === 'approved' && (
                          <div className="mt-8 pt-8 border-t border-[var(--border-color)]">
                            <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-5 flex items-center gap-2">
                              <Banknote size={14} className="text-yellow-500" /> Confirm Manual Payment
                            </h4>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  type="button"
                                  onClick={() => setPaymentMethod('in_store')}
                                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-sm font-black ${
                                    paymentMethod === 'in_store'
                                      ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-600'
                                      : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                                  }`}
                                >
                                  <Store size={20} />
                                  In Store
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPaymentMethod('check')}
                                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-sm font-black ${
                                    paymentMethod === 'check'
                                      ? 'border-blue-500/50 bg-blue-500/10 text-blue-600'
                                      : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                                  }`}
                                >
                                  <Banknote size={20} />
                                  By Check
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={handleConfirmPayment}
                                disabled={confirmingPayment}
                                className="w-full py-5 bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded-[2rem] font-extrabold text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-lg shadow-yellow-500/20"
                              >
                                {confirmingPayment ? 'CONFIRMING...' : 'CONFIRM PAYMENT RECEIVED'}
                                {!confirmingPayment && <CheckCircle size={16} strokeWidth={2.5} />}
                              </button>
                            </div>
                          </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={confirm.show}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.confirmLabel}
        confirmColor={confirm.confirmColor}
        onConfirm={confirm.onConfirm}
        onClose={() => setConfirm(prev => ({ ...prev, show: false }))}
      />
    </AdminLayout>
  );
};

export default Quotes;
