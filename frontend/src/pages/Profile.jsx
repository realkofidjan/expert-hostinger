import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  User, Mail, Phone, LogOut,
  ShoppingBag, Package,
  MapPin, CheckCircle, Clock, ChevronRight, Edit3,
  X, CreditCard, Truck, Store, Banknote, Smartphone,
  ArrowLeft, Upload, AlertCircle, CalendarDays, MessageSquare,
  Loader2, ShieldCheck, Trash2, Heart
} from 'lucide-react';
import ConfirmModal from '../components/admin/ConfirmModal';
import MainNavbar from '../components/MainNavbar';
import MainFooter from '../components/MainFooter';
import ProductCard from '../components/ProductCard';
import api from '../api';
import { useAlert } from '../context/AlertContext';
import { useSocket } from '../context/SocketContext';
import { useWishlist } from '../context/WishlistContext';

const Profile = () => {
  const { showAlert } = useAlert();
  const socket = useSocket();
  const { wishlist, loading: loadingWishlist } = useWishlist();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = localStorage.getItem('token');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'details');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [bankSettings, setBankSettings] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({ address_line1: '', city: '', region: '', landmark: '', is_default: false });
  const [regions, setRegions] = useState([]);
  const [cancelling, setCancelling] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null, label: 'Confirm', color: 'red' });

  useEffect(() => {
    if (!token || !user) {
      navigate('/login');
      return;
    }
    api.get('/auth/me')
      .then(res => {
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
        setEditForm({ full_name: res.data.full_name || '', phone: res.data.phone || '' });
      })
      .catch(err => { if (err.response?.status === 401) handleLogout(); });
  }, [token, navigate]);

  useEffect(() => {
    if (activeTab === 'orders' && token) fetchOrders();
    if (activeTab === 'addresses' && token) {
      fetchAddresses();
      fetchRegions();
    }
  }, [activeTab]);

  useEffect(() => {
    if (socket) {
      socket.on('order_update', (data) => {
        console.log('Real-time order update received:', data);
        showAlert('success', 'Order Updated', `Order #${data.orderNumber} is now ${data.status || data.payment_status}.`);
        
        // Refresh orders list directly
        fetchOrders();
        
        // If an order is currently open in the details view, refresh it
        if (selectedOrder && selectedOrder.order_number === data.orderNumber) {
          openOrder(selectedOrder);
        }
      });

      return () => {
        socket.off('order_update');
      };
    }
  }, [socket, selectedOrder]);

  const fetchAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const res = await api.get('/my-addresses');
      setAddresses(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const fetchRegions = async () => {
    try {
      const res = await api.get('/delivery-regions');
      setRegions(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingAddress) {
        await api.put(`/my-addresses/${editingAddress.id}`, {
          ...addressForm,
          is_default: addressForm.is_default
        });
        showAlert('success', 'Address Updated', 'Location details have been modified.');
      } else {
        await api.post('/my-addresses', {
          ...addressForm,
          is_default: addressForm.is_default || addresses.length === 0
        });
        showAlert('success', 'Address Saved', 'Your new fulfillment location has been archived.');
      }
      setShowAddressModal(false);
      setEditingAddress(null);
      setAddressForm({ address_line1: '', city: '', region: '', landmark: '', is_default: false });
      fetchAddresses();
    } catch (err) {
      showAlert('error', 'Address Error', 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const openEditAddress = (addr) => {
    setEditingAddress(addr);
    setAddressForm({
      address_line1: addr.address_line1,
      city: addr.city,
      region: addr.region,
      landmark: addr.delivery_instructions || '',
      is_default: !!addr.is_default
    });
    setShowAddressModal(true);
  };

  const handleDeleteAddress = (id) => {
    setConfirmModal({
      show: true,
      title: 'Archive Address?',
      message: 'This location will be removed from your saved fulfillment profiles.',
      confirmLabel: 'Remove',
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          await api.delete(`/my-addresses/${id}`);
          fetchAddresses();
          showAlert('success', 'Address Archived', 'Location removed from your profile.');
        } catch (err) {
          showAlert('error', 'Delete Error', 'Failed to remove address');
        }
      }
    });
  };

  const fetchOrders = async () => {
    if (loadingOrders) return;
    setLoadingOrders(true);
    try {
      const [ordersRes, settingsRes] = await Promise.all([
        api.get('/my-orders'),
        api.get('/settings'),
      ]);
      setOrders(ordersRes.data || []);
      setBankSettings(settingsRes.data || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const openOrder = async (order) => {
    setSelectedOrder(order);
    setOrderDetails(null);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/orders/${order.order_number}/details?email=${encodeURIComponent(order.customer_email)}`);
      setOrderDetails(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', editForm);
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setIsEditing(false);
      showAlert('success', 'Profile Updated', 'Your identity details have been archived successfully.');
    } catch (err) {
      showAlert('error', 'Profile Error', err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelOrder = (orderNumber, email) => {
    setConfirmModal({
      show: true,
      title: 'Cancel Order?',
      message: 'Are you sure you want to retract this order? Items will be instantly restocked for other customers. This cannot be undone.',
      confirmLabel: 'Yes, Cancel Order',
      confirmColor: 'red',
      onConfirm: async () => {
        setCancelling(true);
        try {
          await api.post(`/orders/${orderNumber}/cancel`, { email });
          showAlert('success', 'Order Cancelled', 'Your order has been retracted and items have been restocked.');
          await fetchOrders();
          setSelectedOrder(prev => prev ? { ...prev, status: 'cancelled' } : null);
        } catch (err) {
          showAlert('error', 'Cancellation Failed', err.response?.data?.error || 'Failed to cancel order.');
        } finally {
          setCancelling(false);
        }
      }
    });
  };


  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
    window.location.reload();
  };

  if (!token || !user) return null;

  const initials = (user.full_name || user.email || 'U').charAt(0).toUpperCase();

  const tabs = [
    { id: 'details', label: 'Account Details', icon: <User className="w-4 h-4" /> },
    { id: 'orders', label: 'My Orders', icon: <Package className="w-4 h-4" /> },
    { id: 'addresses', label: 'Saved Addresses', icon: <MapPin className="w-4 h-4" /> },
    { id: 'wishlist', label: 'My Favorites', icon: <Heart className="w-4 h-4" /> },
  ];

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending': return { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: <Clock className="w-4 h-4" /> };
      case 'confirmed': return { label: 'Confirmed', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: <CheckCircle className="w-4 h-4" /> };
      case 'processing': return { label: 'Processing', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: <Package className="w-4 h-4" /> };
      case 'en_route': return { label: 'On the Way', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20', icon: <Truck className="w-4 h-4" /> };
      case 'delivered': return { label: 'Delivered', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: <CheckCircle className="w-4 h-4" /> };
      case 'cancelled': return { label: 'Cancelled', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: <X className="w-4 h-4" /> };
      default: return { label: status || 'Pending', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', icon: <Clock className="w-4 h-4" /> };
    }
  };

  const methodLabel = (m) => m === 'bank_transfer' ? 'Bank Transfer' : m === 'momo' ? 'Mobile Money' : m === 'cash' ? 'Cash' : m || '—';
  const methodIcon = (m) => {
    if (m === 'cash') return <Banknote className="w-4 h-4 text-yellow-500" />;
    if (m === 'momo') return <Smartphone className="w-4 h-4 text-green-500" />;
    if (m === 'bank_transfer') return <CreditCard className="w-4 h-4 text-blue-500" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
      <MainNavbar />

      <div className="pt-36 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-4 gap-8">

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 shadow-xl text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-green-500 to-yellow-400 flex items-center justify-center text-4xl font-black text-gray-900 shadow-xl shadow-green-500/20 mx-auto mb-4 scale-up-hover relative z-10 transition-transform">
                {initials}
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white truncate relative z-10">{user.full_name || 'User'}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate mb-4 relative z-10">{user.email}</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-3 border border-gray-100 dark:border-gray-800 shadow-lg space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSelectedOrder(null); setOrderDetails(null); }}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold transition-all duration-300 relative group overflow-hidden ${activeTab === tab.id
                      ? 'text-gray-900 dark:text-white translate-x-1'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100'
                    }`}
                >
                  {activeTab === tab.id && (
                    <div className="absolute inset-0 p-[2px] rounded-2xl bg-gradient-to-r from-green-500 via-green-400 to-yellow-500">
                      <div className="w-full h-full bg-white dark:bg-gray-900 rounded-[calc(1rem-2px)]" />
                    </div>
                  )}
                  <span className={`relative z-10 ${activeTab === tab.id ? 'text-green-600 dark:text-green-400 font-black' : ''}`}>
                    {tab.icon}
                  </span>
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}

              <div className="h-px bg-gray-100 dark:bg-gray-800 my-3 mx-4" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/40"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'details' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 border border-gray-100 dark:border-gray-800 shadow-xl">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h2 className="text-3xl font-black text-gray-900 dark:text-white">Account Profile</h2>
                      <p className="text-sm text-gray-500 mt-1">Manage your identity and Preferences</p>
                    </div>
                    {!isEditing && (
                      <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold text-sm hover:translate-y-[-2px] transition-all shadow-lg">
                        <Edit3 className="w-4 h-4" /> Edit
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                          <input
                            type="text" required value={editForm.full_name}
                            onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-green-500/30 rounded-2xl text-sm font-bold border-gray-100 dark:border-gray-700 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                          <input
                            type="tel" value={editForm.phone}
                            onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-green-500/30 rounded-2xl text-sm font-bold border-gray-100 dark:border-gray-700 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button type="submit" disabled={saving} className="px-8 py-4 bg-green-600 text-white rounded-2xl font-black text-sm hover:shadow-xl transition-all shadow-green-500/20">
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button type="button" onClick={() => setIsEditing(false)} className="px-8 py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-2xl font-bold text-sm">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      {[
                        { icon: <User />, label: 'Identity', value: user.full_name || 'Not provided' },
                        { icon: <Mail />, label: 'Email Connection', value: user.email },
                        { icon: <Phone />, label: 'Contact Line', value: user.phone || '—' },
                        { icon: <Clock />, label: 'Member Since', value: new Date(user.created_at).toLocaleDateString() }
                      ].map((item, i) => (
                        <div key={i} className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-[2rem] flex items-center gap-6">
                          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center text-green-600 shadow-sm border border-gray-100 dark:border-gray-700">
                            {React.cloneElement(item.icon, { size: 20 })}
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{item.label}</p>
                            <p className="font-extrabold text-gray-900 dark:text-white truncate max-w-[180px]">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'orders' && !selectedOrder && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 border border-gray-100 dark:border-gray-800 shadow-xl">
                  <div className="mb-8">
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white">My Orders</h2>
                    <p className="text-sm text-gray-500 mt-1">Track your order history and status</p>
                  </div>

                  {loadingOrders ? (
                    <div className="py-32 flex flex-col items-center justify-center gap-4">
                      <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Loading Orders...</p>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="py-32 text-center">
                      <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-6" />
                      <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">No Orders Yet</h3>
                      <p className="text-sm text-gray-500 max-w-xs mx-auto mb-8">Browse our products and place your first order today.</p>
                      <Link to="/products" className="inline-flex items-center gap-2 px-8 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Start Shopping</Link>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {orders.map(order => {
                        const status = getStatusInfo(order.status);
                        const needsReceipt = order.payment_method === 'bank_transfer' && !order.bank_receipt_path && order.status === 'pending';
                        return (
                          <div
                            key={order.id}
                            onClick={() => openOrder(order)}
                            className="group p-5 bg-gray-50 dark:bg-gray-800/40 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-transparent hover:border-green-500/20 hover:bg-white dark:hover:bg-gray-800 transition-all cursor-pointer shadow-sm"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${status.color}`}>
                                {status.icon}
                              </div>
                              <div>
                                <h4 className="font-black text-gray-900 dark:text-white text-sm">{order.order_number || `#${order.id}`}</h4>
                                <p className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                {needsReceipt && (
                                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-black text-amber-600 dark:text-amber-400">
                                    <AlertCircle size={10} /> Receipt required
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-6 ml-16 sm:ml-0">
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                {methodIcon(order.payment_method)}
                                <span>{methodLabel(order.payment_method)}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total</p>
                                <p className="font-black text-gray-900 dark:text-white text-sm">₵{parseFloat(order.total_amount || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${status.color}`}>{status.label}</span>
                              <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Order Detail View */}
            {activeTab === 'orders' && selectedOrder && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
                <button
                  onClick={() => { setSelectedOrder(null); setOrderDetails(null); }}
                  className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-green-600 transition-all"
                >
                  <ArrowLeft size={16} /> Back to Orders
                </button>

                {/* Header card */}
                <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-8 border border-gray-100 dark:border-gray-800 shadow-xl">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white">{selectedOrder.order_number}</h2>
                      <p className="text-sm text-gray-400 mt-0.5">Placed {new Date(selectedOrder.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${getStatusInfo(selectedOrder.status).color}`}>
                      {getStatusInfo(selectedOrder.status).label}
                    </span>
                  </div>

                  {(selectedOrder.status === 'pending') && (selectedOrder.payment_method === 'bank_transfer' || selectedOrder.payment_method === 'cash') && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleCancelOrder(selectedOrder.order_number, selectedOrder.customer_email)}
                        disabled={cancelling}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/20 transition-all shadow-sm disabled:opacity-50"
                      >
                        {cancelling ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                        {cancelling ? 'Processing...' : 'Cancel Order'}
                      </button>
                    </div>
                  )}

                  {/* Tracking timeline */}
                  {selectedOrder.status !== 'cancelled' && (() => {
                    const isDelivery = selectedOrder.delivery_mode === 'delivery';
                    const steps = isDelivery
                      ? [
                        { key: 'pending', label: 'Order Placed', icon: ShoppingBag },
                        { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
                        { key: 'processing', label: 'Being Prepared', icon: Package },
                        { key: 'on_route', label: 'Out for Delivery', icon: Truck },
                        { key: 'delivered', label: 'Delivered', icon: ShieldCheck },
                      ]
                      : [
                        { key: 'pending', label: 'Order Placed', icon: ShoppingBag },
                        { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
                        { key: 'processing', label: 'Being Prepared', icon: Package },
                        { key: 'delivered', label: 'Ready / Collected', icon: Store },
                      ];
                    const order = ['pending', 'confirmed', 'processing', 'on_route', 'delivered'];
                    const currentIdx = order.indexOf(selectedOrder.status);
                    return (
                      <div className="mt-8 mb-2">
                        <div className="flex items-center">
                          {steps.map((step, i) => {
                            const stepOrderIdx = order.indexOf(step.key);
                            const done = stepOrderIdx < currentIdx || (stepOrderIdx === currentIdx);
                            const active = stepOrderIdx === currentIdx;
                            const Icon = step.icon;
                            return (
                              <React.Fragment key={step.key}>
                                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${done ? active ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 scale-110' : 'bg-green-500 text-white'
                                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                                    }`}>
                                    <Icon size={16} />
                                  </div>
                                  <span className={`text-[9px] font-black text-center uppercase tracking-wider w-16 leading-tight ${active ? 'text-green-600 dark:text-green-400' : done ? 'text-gray-600 dark:text-gray-400' : 'text-gray-300 dark:text-gray-600'
                                    }`}>{step.label}</span>
                                </div>
                                {i < steps.length - 1 && (
                                  <div className={`flex-1 h-0.5 mx-1 mb-5 transition-colors ${order.indexOf(steps[i + 1].key) <= currentIdx ? 'bg-green-500' : 'bg-gray-100 dark:bg-gray-800'
                                    }`} />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {selectedOrder.status === 'cancelled' && (
                    <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3 text-sm text-red-600 dark:text-red-400">
                      <X size={16} className="shrink-0" />
                      This order has been cancelled.
                    </div>
                  )}
                </div>

                {/* Estimated delivery date + notes (delivery orders, once set) */}
                {selectedOrder.delivery_mode === 'delivery' && (selectedOrder.estimated_delivery_date || selectedOrder.delivery_notes) && (
                  <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-lg space-y-3">
                    {selectedOrder.estimated_delivery_date && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                          <CalendarDays size={18} className="text-green-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estimated Delivery</p>
                          <p className="font-black text-gray-900 dark:text-white">
                            {new Date(selectedOrder.estimated_delivery_date).toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedOrder.delivery_notes && (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                          <MessageSquare size={18} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Delivery Notes</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{selectedOrder.delivery_notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Delivery address (for delivery orders) */}
                {selectedOrder.delivery_mode === 'delivery' && (() => {
                  let addr = null;
                  try { addr = JSON.parse(selectedOrder.shipping_address); } catch { }
                  if (!addr) return null;
                  return (
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-lg flex items-start gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                        <MapPin size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Delivery Address</p>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{addr.address}</p>
                        {addr.city && <p className="text-sm text-gray-600 dark:text-gray-400">{addr.city}</p>}
                        {selectedOrder.region && <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{selectedOrder.region}</p>}
                        {addr.landmark && <p className="text-xs text-gray-400 italic mt-0.5">{addr.landmark}</p>}
                        {selectedOrder.delivery_fee > 0 && (
                          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">Delivery fee: ₵{parseFloat(selectedOrder.delivery_fee).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Pickup notice */}
                {selectedOrder.delivery_mode === 'pickup' && bankSettings?.pickup_address && (
                  <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-lg flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center shrink-0">
                      <Store size={18} className="text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pickup Location</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{bankSettings.pickup_address}</p>
                      <p className="text-xs text-gray-500 mt-1">Please bring your order number when you come to collect.</p>
                    </div>
                  </div>
                )}

                {/* Bank transfer pending actions */}
                {selectedOrder.payment_method === 'bank_transfer' && selectedOrder.status === 'pending' && (
                  <div className="space-y-3">
                    {bankSettings && (bankSettings.bank_name || bankSettings.bank_account_number) && !selectedOrder.bank_receipt_path && (
                      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-lg">
                        <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-3">Deposit To This Account</p>
                        <div className="space-y-2 text-sm">
                          {bankSettings.bank_name && <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Bank</span><span className="font-bold text-gray-900 dark:text-white">{bankSettings.bank_name}</span></div>}
                          {bankSettings.bank_branch && <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Branch</span><span className="font-bold text-gray-900 dark:text-white">{bankSettings.bank_branch}</span></div>}
                          {bankSettings.bank_account_name && <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Account Name</span><span className="font-bold text-gray-900 dark:text-white">{bankSettings.bank_account_name}</span></div>}
                          {bankSettings.bank_account_number && (
                            <div className="flex justify-between items-center pt-2 border-t border-blue-100 dark:border-blue-800 mt-1">
                              <span className="text-gray-500 dark:text-gray-400">Account Number</span>
                              <span className="font-black text-blue-700 dark:text-blue-400 text-base tracking-wider">{bankSettings.bank_account_number}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {!selectedOrder.bank_receipt_path ? (
                      <div className="p-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-black text-amber-700 dark:text-amber-400">Receipt not uploaded yet</p>
                          <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Make your bank deposit, then upload the receipt to confirm this order.</p>
                        </div>
                        <Link
                          to={`/upload-receipt?orderNumber=${selectedOrder.order_number}&email=${encodeURIComponent(selectedOrder.customer_email)}`}
                          className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-colors"
                        >
                          <Upload size={14} /> Upload Receipt
                        </Link>
                      </div>
                    ) : !selectedOrder.bank_receipt_verified ? (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center gap-3 text-sm text-blue-700 dark:text-blue-400">
                        <CheckCircle size={16} className="shrink-0" /> Receipt uploaded — our team is reviewing your deposit.
                      </div>
                    ) : null}
                  </div>
                )}

                {selectedOrder.bank_receipt_verified == 1 && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-2xl flex items-center gap-3 text-sm text-green-700 dark:text-green-400">
                    <ShieldCheck size={16} className="shrink-0" /> Bank transfer verified — your order is confirmed!
                  </div>
                )}

                {/* Payment + Order items */}
                <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-8 border border-gray-100 dark:border-gray-800 shadow-xl space-y-5">
                  {/* Payment method */}
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      {methodIcon(selectedOrder.payment_method)}
                      <span className="font-bold text-sm text-gray-900 dark:text-white">{methodLabel(selectedOrder.payment_method)}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${selectedOrder.payment_status === 'paid' || selectedOrder.payment_status === 'verified'
                        ? 'bg-green-500/10 text-green-600 border-green-500/20'
                        : selectedOrder.payment_status === 'pending_verification'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                      }`}>
                      {(selectedOrder.payment_status || 'pending').replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Items */}
                  {loadingDetails ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                      <Loader2 size={18} className="animate-spin" /> Loading items...
                    </div>
                  ) : orderDetails?.items?.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Items Ordered</p>
                      {orderDetails.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl">
                          <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                            {item.image_url
                              ? <img src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || ''}${item.image_url}`} alt={item.product_name} className="w-full h-full object-cover" />
                              : <Package size={18} className="text-gray-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{item.product_name}</p>
                            <p className="text-xs text-gray-400">×{item.quantity} @ ₵{parseFloat(item.unit_price).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <p className="font-black text-sm text-gray-900 dark:text-white shrink-0">₵{parseFloat(item.subtotal).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* Totals */}
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-500 dark:text-gray-400">
                      <span>Subtotal</span>
                      <span>₵{parseFloat(selectedOrder.subtotal || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {selectedOrder.delivery_fee > 0 && (
                      <div className="flex justify-between text-gray-500 dark:text-gray-400">
                        <span>Delivery Fee</span>
                        <span>₵{parseFloat(selectedOrder.delivery_fee).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-base text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-800">
                      <span>Total</span>
                      <span className="text-green-600">₵{parseFloat(selectedOrder.total_amount || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 border border-gray-100 dark:border-gray-800 shadow-xl">
                  <div className="mb-10">
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white">Workspace Addresses</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage your active delivery locations</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {loadingAddresses ? (
                      <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
                        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Addresses...</p>
                      </div>
                    ) : (
                      <>
                        {addresses.map(addr => (
                          <div key={addr.id} className="group relative p-8 bg-gray-50 dark:bg-gray-800/40 rounded-[2.5rem] border border-transparent hover:border-green-500/20 hover:bg-white dark:hover:bg-gray-800 transition-all shadow-sm">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-10 h-10 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center text-green-600 shadow-sm border border-gray-100 dark:border-gray-700">
                                    <MapPin size={18} />
                                  </div>
                                  {addr.is_default && <span className="px-3 py-1 bg-green-500/10 text-green-600 border border-green-500/20 rounded-full text-[9px] font-black uppercase tracking-widest">Primary</span>}
                                </div>
                                <h4 className="font-black text-gray-900 dark:text-white mb-1">{addr.address_line1}</h4>
                                <p className="text-sm text-gray-500 font-bold">{addr.city}, {addr.region}</p>
                                {addr.delivery_instructions && <p className="text-xs text-gray-400 italic mt-3 line-clamp-2">"{addr.delivery_instructions}"</p>}
                              </div>
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => handleDeleteAddress(addr.id)}
                                  className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all"
                                  title="Remove Location"
                                >
                                  <X size={18} />
                                </button>
                                <button
                                  onClick={() => openEditAddress(addr)}
                                  className="p-3 text-gray-300 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-2xl transition-all"
                                  title="Edit Location"
                                >
                                  <Edit3 size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                        <div
                          onClick={() => { setEditingAddress(null); setAddressForm({ address_line1: '', city: '', region: '', landmark: '', is_default: false }); setShowAddressModal(true); }}
                          className="p-10 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2.5rem] flex flex-col items-center justify-center text-center group cursor-pointer hover:border-green-500/30 hover:bg-green-500/5 transition-all min-h-[220px]"
                        >
                          <div className="w-14 h-14 rounded-3xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-300 group-hover:text-green-500 group-hover:bg-white dark:group-hover:bg-gray-800 transition-all shadow-sm">
                            <MapPin size={24} />
                          </div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-6 group-hover:text-green-600 transition-colors">Add New Location</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'wishlist' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 border border-gray-100 dark:border-gray-800 shadow-xl">
                  <div className="mb-10">
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white">My Favorites</h2>
                    <p className="text-sm text-gray-500 mt-1">Curated selection of items you love</p>
                  </div>

                  {loadingWishlist ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Favorites...</p>
                    </div>
                  ) : wishlist.length === 0 ? (
                    <div className="py-24 text-center">
                      <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Heart className="w-10 h-10 text-gray-200" />
                      </div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Your wishlist is empty</h3>
                      <p className="text-sm text-gray-500 max-w-xs mx-auto mb-8">Tap the heart on any product to save it here for later.</p>
                      <Link to="/products" className="inline-flex items-center gap-2 px-8 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Explore Collection</Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {wishlist.map(product => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-[3rem] p-10 shadow-2xl relative">
            <button onClick={() => { setShowAddressModal(false); setEditingAddress(null); }} className="absolute top-6 right-6 p-3 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <X size={24} />
            </button>

            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{editingAddress ? 'Modify Location' : 'New Location'}</h3>
            <p className="text-sm text-gray-500 mb-8">{editingAddress ? 'Update your workspace coordinates' : 'Register a new delivery destination'}</p>

            <form onSubmit={handleAddAddress} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Street Address / House No.</label>
                <input
                  type="text" required value={addressForm.address_line1}
                  onChange={e => setAddressForm({ ...addressForm, address_line1: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-green-500/30 rounded-2xl text-sm font-bold border-gray-100 dark:border-gray-700 outline-none transition-all"
                  placeholder="e.g. 12 Liberation Road"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">City</label>
                  <input
                    type="text" required value={addressForm.city}
                    onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-green-500/30 rounded-2xl text-sm font-bold border-gray-100 dark:border-gray-700 outline-none transition-all"
                    placeholder="Accra"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Region</label>
                  <select
                    required value={addressForm.region}
                    onChange={e => setAddressForm({ ...addressForm, region: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-green-500/30 rounded-2xl text-sm font-bold border-gray-100 dark:border-gray-700 outline-none transition-all"
                  >
                    <option value="">Select Region</option>
                    {regions.map(r => <option key={r.id} value={r.region_name}>{r.region_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Landmark / Instructions</label>
                <input
                  type="text" value={addressForm.landmark}
                  onChange={e => setAddressForm({ ...addressForm, landmark: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-green-500/30 rounded-2xl text-sm font-bold border-gray-100 dark:border-gray-700 outline-none transition-all"
                  placeholder="Near Shell station, Blue gate"
                />
              </div>

              <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl cursor-pointer">
                <input
                  type="checkbox" checked={addressForm.is_default}
                  onChange={e => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 outline-none focus:ring-0"
                />
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Set as Primary Address</span>
              </label>

              <div className="flex gap-4 pt-4">
                <button type="submit" disabled={saving} className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black text-sm hover:shadow-xl hover:translate-y-[-2px] transition-all">
                  {saving ? 'Processing...' : editingAddress ? 'Update Location' : 'Add Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MainFooter />
      <ConfirmModal
        isOpen={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        confirmColor={confirmModal.confirmColor}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, show: false }))}
      />
    </div>
  );
};

export default Profile;
