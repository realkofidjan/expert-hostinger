import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Trash2, Plus, Minus, ArrowLeft, ArrowRight,
  CheckCircle, Loader2, ShoppingCart, MapPin, CreditCard,
  Banknote, Smartphone, AlertCircle, Truck, Store, Clock, Tag, X
} from 'lucide-react';
import MainNavbar from '../components/MainNavbar';
import MainFooter from '../components/MainFooter';
import { useCart } from '../context/CartContext';
import CustomPhoneInput from '../components/ui/PhoneInput';
import api from '../api';
import { createProductUrl, getImageUrl } from '../utils/url';


const STEPS = ['Cart', 'Your Info', 'Delivery', 'Payment'];

const CartPage = () => {
  const { cartItems, removeFromCart, updateQuantity, clearCart, cartCount } = useCart();
  const navigate = useNavigate();

  const [step, setStep] = useState(0); // 0=cart, 1=info, 2=delivery, 3=payment
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [saveThisAddress, setSaveThisAddress] = useState(false);
  const [delivery, setDelivery] = useState({ mode: '', region: '', regionId: null, fee: 0, address: '', city: '', landmark: '' });
  const [regions, setRegions] = useState([]);
  const [payment, setPayment] = useState({ method: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [paystackEnabled, setPaystackEnabled] = useState(true); // default true; corrected once settings load

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, type, value, discount_amount, message }
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Re-fetch the Paystack toggle every time the customer reaches the payment step
  // so the current admin setting is always reflected without a page refresh.
  useEffect(() => {
    if (step !== 3) return;
    api.get('/settings')
      .then(res => { setPaystackEnabled(res.data?.paystack_enabled !== 'false'); })
      .catch(() => { /* keep last known value */ });
  }, [step]);

  // Pre-fill from stored user
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setForm({ name: u.full_name || '', email: u.email || '', phone: u.phone || '' });
        fetchSavedAddresses();
      } catch { }
    }
  }, []);

  const fetchSavedAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const res = await api.get('/my-addresses');
      setSavedAddresses(res.data);
    } catch (err) {
      console.error('Error fetching addresses:', err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleAddressSelect = (addr) => {
    const regionObj = regions.find(r => r.region_name === addr.region);
    setDelivery(d => ({
      ...d,
      address: addr.address_line1,
      city: addr.city,
      landmark: addr.delivery_instructions || '',
      region: addr.region,
      regionId: regionObj?.id || d.regionId,
      fee: regionObj?.delivery_fee || 0,
      isFree: regionObj?.is_free || false,
      feeSet: !!regionObj
    }));
  };

  // Fetch delivery regions when reaching delivery step
  useEffect(() => {
    if (step === 2 && regions.length === 0) {
      api.get('/delivery-regions').then(res => setRegions(res.data || [])).catch(() => { });
    }
  }, [step]);

  const subtotal = cartItems.reduce((sum, i) => sum + (parseFloat(i.price || 0) * i.quantity), 0);
  const couponDiscount = appliedCoupon ? parseFloat(appliedCoupon.discount_amount) : 0;
  const total = Math.max(0, subtotal + delivery.fee - couponDiscount);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError('');
    setCouponLoading(true);
    try {
      const res = await api.post('/coupons/validate', { code: couponInput.trim(), subtotal });
      setAppliedCoupon(res.data);
      setCouponInput('');
    } catch (err) {
      setCouponError(err.response?.data?.error || 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
    setCouponInput('');
  };

  const canProceedToDelivery = form.name.trim() && form.email.trim();

  const handleRegionSelect = (r) => {
    setDelivery(d => ({
      ...d,
      region: r.region_name,
      regionId: r.id,
      fee: r.is_free ? 0 : parseFloat(r.delivery_fee || 0),
      isFree: !!r.is_free,
      feeSet: r.is_free || r.delivery_fee > 0
    }));
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const items = cartItems.map(i => ({
        product_id: i.id,
        quantity: i.quantity,
        unit_price: parseFloat(i.price || 0),
        variant: i.variant // Essential for stock management
      }));

      let orderId, orderNumber;

      const shippingAddress = delivery.mode === 'delivery'
        ? JSON.stringify({ address: delivery.address, city: delivery.city, region: delivery.region, landmark: delivery.landmark || '' })
        : null;

      const payload = {
        customer_name: form.name,
        customer_email: form.email,
        customer_phone: form.phone || '',
        payment_method: payment.method,
        delivery_mode: delivery.mode,
        region: delivery.region || '',
        delivery_fee: delivery.fee,
        shipping_address: shippingAddress,
        items,
        ...(appliedCoupon ? { coupon_code: appliedCoupon.code } : {})
      };
      console.log('PLACE_ORDER_PAYLOAD:', payload);

      // Save address if requested
      if (saveThisAddress && delivery.mode === 'delivery' && localStorage.getItem('token')) {
        try {
          await api.post('/my-addresses', {
            address_line1: delivery.address,
            city: delivery.city,
            region: delivery.region,
            landmark: delivery.landmark,
            is_default: savedAddresses.length === 0
          });
        } catch (addrErr) {
          console.error('Failed to save address:', addrErr);
          // Don't block order placement if address saving fails
        }
      }

      const res = await api.post('/orders', payload);
      orderId = res.data.orderId;
      orderNumber = res.data.orderNumber;

      clearCart();

      if (payment.method === 'momo') {
        // Initialize Paystack
        const payRes = await api.post('/payments/initialize', { orderId });
        window.location.href = payRes.data.authorization_url;
        return;
      }

      // Cash or bank_transfer → success page
      navigate(`/order-success?orderNumber=${orderNumber}&method=${payment.method}&email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Empty cart ──────────────────────────────────────────────────────────────
  if (cartItems.length === 0 && step === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <MainNavbar />
        <div className="flex flex-col items-center justify-center gap-6 px-6" style={{ minHeight: 'calc(100vh - 144px)', marginTop: '144px' }}>
          <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <ShoppingBag className="w-12 h-12 text-gray-300 dark:text-gray-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your cart is empty</h2>
          <p className="text-gray-500 dark:text-gray-400">Browse our products and add items to get started</p>
          <Link to="/products" className="px-8 py-4 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-bold rounded-2xl hover:bg-green-600 dark:hover:bg-green-500 dark:hover:text-white transition-colors">
            Browse Products
          </Link>
        </div>
        <MainFooter />
      </div>
    );
  }

  // ── Step Indicator ──────────────────────────────────────────────────────────
  const StepBar = () => (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((s, i) => (
        <React.Fragment key={i}>
          <div className={`flex items-center gap-2 ${i <= step ? 'opacity-100' : 'opacity-30'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors
              ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
              {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs font-bold hidden sm:block ${i === step ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>{s}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />}
        </React.Fragment>
      ))}
    </div>
  );

  // ── Order Summary Sidebar ───────────────────────────────────────────────────
  const OrderSummary = () => (
    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-lg sticky top-28 space-y-4">
      <h3 className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-wider">Order Summary</h3>
      <ul className="space-y-2 max-h-48 overflow-y-auto">
        {cartItems.map(item => (
          <li key={item.id} className="flex items-center gap-3">
            <Link to={createProductUrl({ id: item.id, name: item.name })} className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800 hover:opacity-80 transition-opacity">
              {item.image
                ? <img src={getImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-lg">🪑</div>}
            </Link>
            <div className="flex flex-col flex-1 min-w-0">
              <Link to={createProductUrl({ id: item.id, name: item.name })} className="text-xs text-gray-900 dark:text-white font-bold line-clamp-1 hover:text-green-600 transition-colors">
                {item.name}
              </Link>
              <div className="flex flex-col mt-1 gap-1">
                {item.variant && (
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                    <span className="text-[7px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{item.variant}</span>
                  </div>
                )}
                <span className="text-[7px] font-bold text-gray-400">₵{parseFloat(item.price || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })} each</span>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0 ml-3 gap-0.5">
              <p className="text-xs font-black text-gray-900 dark:text-white">₵{(parseFloat(item.price || 0) * item.quantity).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
              <span className="text-[8px] font-black text-green-600 dark:text-green-500">×{item.quantity}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-500 dark:text-gray-400">
          <span>Subtotal</span>
          <span className="font-bold">₵{subtotal.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-gray-500 dark:text-gray-400">
          <span>Delivery</span>
          <span className="font-bold">
            {delivery.mode === 'pickup' ? 'Pickup'
              : delivery.mode === 'delivery'
                ? delivery.isFree ? 'Free'
                  : delivery.fee > 0 ? `₵${delivery.fee.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`
                    : 'TBD'
                : '—'}
          </span>
        </div>
        {delivery.mode === 'delivery' && delivery.region && (
          <div className="text-[11px] text-gray-400 dark:text-gray-500 flex items-start gap-1">
            <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{[delivery.address, delivery.city, delivery.region].filter(Boolean).join(', ') || delivery.region}</span>
          </div>
        )}

        {/* Coupon applied */}
        {appliedCoupon && (
          <div className="flex justify-between text-green-600 dark:text-green-400">
            <span className="flex items-center gap-1 font-bold">
              <Tag className="w-3 h-3" /> {appliedCoupon.code}
            </span>
            <span className="font-bold">-₵{couponDiscount.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
          </div>
        )}

        <div className="flex justify-between text-gray-900 dark:text-white font-black text-base pt-1 border-t border-gray-100 dark:border-gray-800">
          <span>Total</span>
          <span className="text-green-600">₵{total.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <MainNavbar />
      <div className="pt-36 pb-20 px-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-6 h-6 text-green-600" />
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">
              {step === 0 ? 'Your Cart' : step === 1 ? 'Your Information' : step === 2 ? 'Delivery Preference' : 'Payment'}
            </h1>
          </div>
          <Link to="/products" className="flex items-center gap-1.5 text-sm font-bold text-gray-400 hover:text-green-600 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Continue Shopping
          </Link>
        </div>

        <StepBar />

        {error && (
          <div className="flex items-center gap-2 p-4 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-400 text-sm font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">

            {/* ── STEP 0: Cart Review ── */}
            {step === 0 && (
              <div className="space-y-4">
                {cartItems.map(item => (
                  <div key={item.id} className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-lg flex gap-5 items-center">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                      {item.image
                        ? <img src={getImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-3xl">🪑</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4">
                        <p className="font-bold text-gray-900 dark:text-white text-base leading-tight truncate">{item.name}</p>
                        <p className="text-lg font-black text-gray-900 dark:text-white">
                          ₵{(parseFloat(item.price || 0) * item.quantity).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="flex items-end justify-between mt-4">
                        <div className="flex flex-col gap-2 min-w-0">
                          {item.variant && (
                            <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-lg w-fit">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-600" />
                              <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{item.variant}</span>
                            </div>
                          )}

                          <div className="flex flex-col">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Unit Price</span>
                            <span className="text-sm font-black text-gray-600 dark:text-gray-400">₵{parseFloat(item.price || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.variant)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm transition-all border border-transparent">
                              <Minus className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                            </button>
                            <span className="text-xs font-black text-gray-900 dark:text-white w-7 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.variant)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm transition-all border border-transparent">
                              <Plus className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                            </button>
                          </div>
                          <button onClick={() => removeFromCart(item.id, item.variant)} className="text-[9px] font-black text-gray-300 hover:text-red-400 uppercase tracking-widest transition-colors flex items-center gap-2">
                            <Trash2 className="w-3 h-3" /> Remove Selection
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-500 font-medium transition-colors">Clear all items</button>
                <button
                  onClick={() => setStep(1)}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-green-600 to-yellow-500 text-white font-black rounded-2xl hover:shadow-lg hover:shadow-green-500/30 hover:-translate-y-0.5 transform transition-all text-sm mt-2"
                >
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── STEP 1: Customer Info ── */}
            {step === 1 && (
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-lg space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Full Name *</label>
                  <input
                    type="text" required value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Kofi Mensah"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Email Address *</label>
                  <input
                    type="email" required value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="kofi@example.com"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Phone Number</label>
                  <CustomPhoneInput value={form.phone} onChange={val => setForm(f => ({ ...f, phone: val || '' }))} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(0)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={() => { if (canProceedToDelivery) setStep(2); else setError('Name and email are required'); }}
                    className="flex-1 py-3 bg-gradient-to-r from-green-600 to-yellow-500 text-white font-black rounded-2xl hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Delivery ── */}
            {step === 2 && (
              <div className="space-y-4">
                {/* Mode selection */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { mode: 'pickup', label: 'Pickup', icon: Store, desc: 'Collect from our showroom' },
                    { mode: 'delivery', label: 'Delivery', icon: Truck, desc: 'We deliver to your location' }
                  ].map(({ mode, label, icon: Icon, desc }) => (
                    <button
                      key={mode}
                      onClick={() => setDelivery({ mode, region: '', regionId: null, fee: 0, isFree: false, feeSet: false, address: '', city: '', landmark: '' })}
                      className={`p-5 rounded-2xl border-2 text-left transition-all ${delivery.mode === mode ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'}`}
                    >
                      <Icon className={`w-6 h-6 mb-2 ${delivery.mode === mode ? 'text-green-600' : 'text-gray-400'}`} />
                      <p className={`font-black text-sm ${delivery.mode === mode ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>{label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>

                {/* Region + Address (delivery only) */}
                {delivery.mode === 'delivery' && (
                  <>
                    {/* Region picker */}
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-lg">
                      <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                        <MapPin className="inline w-3.5 h-3.5 mr-1" />Select Your Region
                      </p>
                      {regions.length === 0 ? (
                        <div className="flex items-center gap-2 text-gray-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading regions...</div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                          {regions.map(r => (
                            <button
                              key={r.id}
                              onClick={() => handleRegionSelect(r)}
                              className={`px-3 py-2.5 rounded-xl text-left transition-all ${delivery.regionId === r.id ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500' : 'bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                            >
                              <span className={`block font-bold text-xs ${delivery.regionId === r.id ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                {r.region_name}
                              </span>
                              <span className={`text-[10px] font-bold ${r.is_free ? 'text-green-500' : r.delivery_fee > 0 ? 'text-blue-500' : 'text-amber-500'}`}>
                                {r.is_free ? '🎉 Free' : r.delivery_fee > 0 ? `₵${parseFloat(r.delivery_fee).toLocaleString('en-GH', { minimumFractionDigits: 2 })}` : 'Price TBD'}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      {delivery.regionId && !delivery.feeSet && (
                        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-xl">
                          Delivery fee for this region hasn't been set yet. Our team will confirm the cost before processing your order.
                        </p>
                      )}
                    </div>

                    {/* Delivery address */}
                    {delivery.regionId && (
                      <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-lg space-y-4">
                        <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <MapPin className="inline w-3.5 h-3.5 mr-1" />Delivery Address
                        </p>

                        {/* Saved Addresses Section */}
                        {savedAddresses.length > 0 && (
                          <div className="space-y-3 pb-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Use Saved Address</p>
                            <div className="grid grid-cols-1 gap-2">
                              {savedAddresses.map(addr => (
                                <button
                                  key={addr.id}
                                  onClick={() => handleAddressSelect(addr)}
                                  className={`p-4 rounded-2xl border text-left transition-all group ${delivery.address === addr.address_line1 ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-white dark:bg-gray-900'}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <p className={`text-xs font-black uppercase tracking-tight ${delivery.address === addr.address_line1 ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                                        {addr.address_line1}
                                      </p>
                                      <p className="text-[10px] text-gray-500 font-bold">{addr.city}, {addr.region}</p>
                                    </div>
                                    {delivery.address === addr.address_line1 && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                                  </div>
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 py-1">
                              <div className="h-px bg-gray-100 dark:bg-gray-800 flex-1" />
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Or Enter New</span>
                              <div className="h-px bg-gray-100 dark:bg-gray-800 flex-1" />
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Street Address / House No. *</label>
                          <input
                            type="text"
                            value={delivery.address}
                            onChange={e => setDelivery(d => ({ ...d, address: e.target.value }))}
                            placeholder="e.g. 12 Liberation Road, East Legon"
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">City / Town *</label>
                          <input
                            type="text"
                            value={delivery.city}
                            onChange={e => setDelivery(d => ({ ...d, city: e.target.value }))}
                            placeholder="e.g. Accra"
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Landmark / Additional Info <span className="normal-case font-normal">(optional)</span></label>
                          <input
                            type="text"
                            value={delivery.landmark}
                            onChange={e => setDelivery(d => ({ ...d, landmark: e.target.value }))}
                            placeholder="e.g. Near Shell Filling Station, Blue gate"
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                          />
                        </div>

                        {localStorage.getItem('token') && (
                          <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <input
                              type="checkbox"
                              checked={saveThisAddress}
                              onChange={e => setSaveThisAddress(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <div>
                              <p className="text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-tight leading-none">Save to your profile</p>
                              <p className="text-[9px] text-gray-500 font-bold mt-0.5">Securely store this address for future purchases</p>
                            </div>
                          </label>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={() => {
                      if (!delivery.mode) { setError('Please select a delivery option'); return; }
                      if (delivery.mode === 'delivery') {
                        if (!delivery.regionId) { setError('Please select your region'); return; }
                        if (!delivery.address.trim()) { setError('Please enter your street address'); return; }
                        if (!delivery.city.trim()) { setError('Please enter your city or town'); return; }
                      }
                      setError('');
                      setStep(3);
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-green-600 to-yellow-500 text-white font-black rounded-2xl hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Payment ── */}
            {step === 3 && (
              <div className="space-y-4">
                <PaymentOptions
                  deliveryMode={delivery.mode}
                  selected={payment.method}
                  onSelect={method => setPayment({ method })}
                  paystackEnabled={paystackEnabled}
                />

                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={() => {
                      if (!payment.method) { setError('Please select a payment method'); return; }
                      setError('');
                      handleSubmit();
                    }}
                    disabled={submitting}
                    className="flex-1 py-3 bg-gradient-to-r from-green-600 to-yellow-500 text-white font-black rounded-2xl hover:shadow-lg hover:-translate-y-0.5 transform transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <>Place Order <CheckCircle className="w-4 h-4" /></>}
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Sidebar */}
          <div className="space-y-3">
            <OrderSummary />

            {/* Coupon input — rendered here (not inside OrderSummary) so it doesn't
                lose focus when CartPage state updates */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl px-5 py-4 border border-gray-100 dark:border-gray-800 shadow-lg">
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Tag className="w-3 h-3" /> Coupon Code
              </p>

              {appliedCoupon ? (
                <div className="flex items-center justify-between px-3 py-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <Tag className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-green-700 dark:text-green-400 leading-tight">{appliedCoupon.code}</p>
                      <p className="text-[10px] text-green-600 dark:text-green-500 font-bold leading-tight">{appliedCoupon.message}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                      placeholder="Enter code"
                      className="flex-1 min-w-0 px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors font-bold tracking-widest"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="shrink-0 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-black rounded-xl hover:bg-green-600 dark:hover:bg-green-500 dark:hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Apply
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-[11px] text-red-500 dark:text-red-400 flex items-center gap-1 pl-1">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {couponError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <MainFooter />
    </div>
  );
};

// ── Payment options component ─────────────────────────────────────────────────
const PaymentOptions = ({ deliveryMode, selected, onSelect, paystackEnabled }) => {
  const [bankDetails, setBankDetails] = useState(null);

  useEffect(() => {
    api.get('/settings').then(res => setBankDetails(res.data)).catch(() => { });
  }, []);

  const options = [
    ...(deliveryMode === 'pickup' ? [{ id: 'cash', label: 'Cash', icon: Banknote, desc: 'Pay cash when you pick up your order', color: 'yellow' }] : []),
    ...(paystackEnabled ? [{ id: 'momo', label: 'Mobile Money (MoMo)', icon: Smartphone, desc: 'Pay securely via Paystack — MTN, AirtelTigo, Vodafone', color: 'green' }] : []),
    { id: 'bank_transfer', label: 'Bank Transfer', icon: CreditCard, desc: 'Transfer via mobile banking app or at the bank — upload your receipt to confirm', color: 'blue' },
  ];

  const colorMap = {
    yellow: { border: 'border-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20', icon: 'text-yellow-600', text: 'text-yellow-700 dark:text-yellow-400' },
    green: { border: 'border-green-500', bg: 'bg-green-50 dark:bg-green-900/20', icon: 'text-green-600', text: 'text-green-700 dark:text-green-400' },
    blue: { border: 'border-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-600', text: 'text-blue-700 dark:text-blue-400' },
  };

  return (
    <div className="space-y-3">
      {options.map(({ id, label, icon: Icon, desc, color }) => {
        const c = colorMap[color];
        const isSelected = selected === id;
        return (
          <div key={id}>
            <button
              onClick={() => onSelect(id)}
              className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${isSelected ? `${c.border} ${c.bg}` : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'}`}
            >
              <div className="flex items-start gap-4">
                <Icon className={`w-6 h-6 mt-0.5 shrink-0 ${isSelected ? c.icon : 'text-gray-400'}`} />
                <div>
                  <p className={`font-black text-sm ${isSelected ? c.text : 'text-gray-700 dark:text-gray-300'}`}>{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                </div>
                <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? `${c.border} ${c.bg}` : 'border-gray-300 dark:border-gray-600'}`}>
                  {isSelected && <div className={`w-2.5 h-2.5 rounded-full ${color === 'yellow' ? 'bg-yellow-400' : color === 'green' ? 'bg-green-500' : 'bg-blue-500'}`} />}
                </div>
              </div>
            </button>

            {/* Paystack note */}
            {isSelected && id === 'momo' && (
              <div className="mt-2 p-4 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-200 dark:border-green-800 text-sm">
                <p className="font-black text-green-700 dark:text-green-400 text-xs uppercase tracking-wider mb-1">Paystack Checkout</p>
                <p className="text-gray-700 dark:text-gray-300">You will be securely redirected to Paystack to complete your purchase via Mobile Money or Card.</p>
              </div>
            )}

            {/* Bank Transfer — show account details + 72h instructions, NO file upload here */}
            {isSelected && id === 'bank_transfer' && (
              <div className="mt-2 space-y-3">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-800 text-sm">
                  <p className="font-black text-blue-700 dark:text-blue-400 text-xs uppercase tracking-wider mb-2">Bank Account Details</p>
                  {!bankDetails ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500">Loading bank details...</p>
                  ) : (bankDetails.bank_name || bankDetails.bank_account_number) ? (
                    <>
                      {bankDetails.bank_name && <p className="text-gray-700 dark:text-gray-300">Bank: <strong>{bankDetails.bank_name}</strong></p>}
                      {bankDetails.bank_branch && <p className="text-gray-700 dark:text-gray-300">Branch: <strong>{bankDetails.bank_branch}</strong></p>}
                      {bankDetails.bank_account_name && <p className="text-gray-700 dark:text-gray-300">Account Name: <strong>{bankDetails.bank_account_name}</strong></p>}
                      {bankDetails.bank_account_number && <p className="text-gray-700 dark:text-gray-300">Account Number: <strong className="text-blue-700 dark:text-blue-400 text-base tracking-wider">{bankDetails.bank_account_number}</strong></p>}
                    </>
                  ) : (
                    <p className="text-xs text-amber-600 dark:text-amber-400">Bank details not configured yet. Contact us for account details.</p>
                  )}
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="font-black text-amber-700 dark:text-amber-400 text-xs uppercase tracking-wider">How It Works</p>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-amber-700 dark:text-amber-300 text-xs">
                    <li>Place your order — it's held for <strong>72 hours</strong></li>
                    <li>Transfer the total amount using the account details above — via your <strong>mobile banking app</strong> or at the bank</li>
                    <li>Take a <strong>screenshot</strong> of your transfer confirmation or payment receipt</li>
                    <li>Return to this site and upload the screenshot</li>
                    <li>We verify and confirm your order</li>
                  </ol>
                  <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">Your order will be automatically cancelled if no receipt is uploaded within 72 hours.</p>
                </div>
              </div>
            )}

            {/* Cash detail */}
            {isSelected && id === 'cash' && bankDetails?.pickup_address && (
              <div className="mt-2 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-2xl border border-yellow-200 dark:border-yellow-800 text-sm">
                <p className="font-black text-yellow-700 dark:text-yellow-400 text-xs uppercase tracking-wider mb-1">Pickup Location</p>
                <p className="text-gray-700 dark:text-gray-300">{bankDetails.pickup_address || bankDetails.store_address}</p>
                <p className="text-xs text-gray-500 mt-1">An invoice will be generated for your cash payment at pickup.</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CartPage;
