import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Upload, CheckCircle, AlertCircle, Loader2, CreditCard, Clock, X, ArrowLeft } from 'lucide-react';
import MainNavbar from '../components/MainNavbar';
import MainFooter from '../components/MainFooter';
import api from '../api';

const UploadReceipt = () => {
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('orderNumber') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [order, setOrder] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [looking, setLooking] = useState(false);

  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadDone, setUploadDone] = useState(false);

  const fileInputRef = useRef(null);

  // Auto-lookup if params are pre-filled
  useEffect(() => {
    if (searchParams.get('orderNumber') && searchParams.get('email')) {
      handleLookup(searchParams.get('orderNumber'), searchParams.get('email'));
    }
  }, []);

  const handleLookup = async (num = orderNumber, em = email) => {
    if (!num.trim() || !em.trim()) {
      setLookupError('Please enter both your order number and email address.');
      return;
    }
    setLooking(true);
    setLookupError('');
    setOrder(null);
    try {
      const res = await api.get(`/orders/lookup?orderNumber=${encodeURIComponent(num.trim())}&email=${encodeURIComponent(em.trim())}`);
      setOrder(res.data);
    } catch (err) {
      setLookupError(err.response?.data?.error || 'Order not found. Check your order number and email.');
    } finally {
      setLooking(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext)) {
      setUploadError('Only JPEG, PNG or PDF files are allowed. No screenshots.');
      return;
    }
    setReceiptFile(file);
    setUploadError('');
    if (ext !== 'pdf') {
      const reader = new FileReader();
      reader.onloadend = () => setReceiptPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview('pdf');
    }
  };

  const handleUpload = async () => {
    if (!receiptFile) {
      setUploadError('Please select your deposit receipt first.');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('bank_receipt', receiptFile);
      fd.append('email', email.trim());
      await api.post(`/orders/${order.order_number}/upload-receipt`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadDone(true);
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getTimeRemaining = (createdAt) => {
    const deadline = new Date(new Date(createdAt).getTime() + 72 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = deadline - now;
    if (diffMs <= 0) return { expired: true, label: 'Expired' };
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { expired: false, label: `${hours}h ${minutes}m remaining` };
  };

  // ── Upload success ────────────────────────────────────────────────────────────
  if (uploadDone) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        <MainNavbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-20" style={{ marginTop: '80px' }}>
          <div className="w-24 h-24 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <div className="text-center max-w-md">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Receipt Submitted!</h1>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              Your deposit receipt has been uploaded for order <strong className="text-gray-900 dark:text-white">{order?.order_number}</strong>. Our team will verify it and confirm your order shortly.
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link to="/products" className="px-8 py-4 bg-gradient-to-r from-green-600 to-yellow-500 text-white font-black rounded-2xl hover:shadow-lg transition-all">
              Continue Shopping
            </Link>
            <Link to="/" className="px-8 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
        <MainFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <MainNavbar />
      <div className="pt-36 pb-20 px-6 max-w-xl mx-auto w-full">
        <Link to="/profile?tab=orders" className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-400 hover:text-green-600 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to My Orders
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Upload Deposit Receipt</h1>
        </div>

        {/* ── Lookup form ── */}
        {!order && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-lg space-y-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your order number and the email used at checkout to look up your pending bank transfer order.
            </p>

            {lookupError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {lookupError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Order Number *</label>
              <input
                type="text"
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
                placeholder="e.g. EXP-20240408-123456"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="The email used at checkout"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            <button
              onClick={() => handleLookup()}
              disabled={looking}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {looking ? <><Loader2 className="w-4 h-4 animate-spin" /> Looking up...</> : 'Find My Order'}
            </button>
          </div>
        )}

        {/* ── Order found + upload ── */}
        {order && (
          <div className="space-y-4">
            {/* Order summary */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order Found</p>
                  <p className="font-black text-blue-700 dark:text-blue-400 text-lg">{order.order_number}</p>
                </div>
                <button onClick={() => { setOrder(null); setReceiptFile(null); setReceiptPreview(null); }} className="text-xs text-gray-400 hover:text-gray-600 font-medium">
                  Wrong order?
                </button>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Customer</span>
                  <span className="font-bold text-gray-900 dark:text-white">{order.customer_name}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Total</span>
                  <span className="font-black text-green-600">₵{parseFloat(order.total_amount || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
                </div>
                {order.created_at && (() => {
                  const { expired, label } = getTimeRemaining(order.created_at);
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Time remaining</span>
                      <span className={`flex items-center gap-1 text-xs font-black ${expired ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'}`}>
                        <Clock className="w-3 h-3" /> {label}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Already uploaded */}
            {order.bank_receipt_path && (
              <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-2xl text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                A receipt has already been uploaded for this order. Our team is reviewing it.
              </div>
            )}

            {/* Upload form */}
            {!order.bank_receipt_path && (
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-lg space-y-4">
                <div>
                  <p className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Upload Your Deposit Receipt</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Upload a clear photo of your physical bank deposit receipt or a PDF. Screenshots are not accepted.</p>
                </div>

                {uploadError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {uploadError}
                  </div>
                )}

                {!receiptFile ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center gap-2 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                  >
                    <Upload className="w-7 h-7 text-gray-400" />
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Click to upload receipt</span>
                    <span className="text-xs text-gray-400">JPEG, PNG or PDF — max 5MB</span>
                  </button>
                ) : (
                  <div className="relative">
                    {receiptPreview === 'pdf' ? (
                      <div className="w-full py-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center gap-2 text-blue-600 font-bold text-sm">
                        <CreditCard className="w-5 h-5" /> {receiptFile.name}
                      </div>
                    ) : (
                      <img src={receiptPreview} alt="Receipt" className="w-full max-h-56 object-contain rounded-xl bg-gray-100 dark:bg-gray-800" />
                    )}
                    <button
                      type="button"
                      onClick={() => { setReceiptFile(null); setReceiptPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleFileChange} />

                <button
                  onClick={handleUpload}
                  disabled={uploading || !receiptFile}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Submit Receipt</>}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <MainFooter />
    </div>
  );
};

export default UploadReceipt;
