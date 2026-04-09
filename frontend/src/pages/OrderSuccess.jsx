import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, CreditCard, Banknote, Smartphone, Clock, Upload } from 'lucide-react';
import MainNavbar from '../components/MainNavbar';
import MainFooter from '../components/MainFooter';
import api from '../api';
import { useSocket } from '../context/SocketContext';
import { useAlert } from '../context/AlertContext';
import ConfirmModal from '../components/admin/ConfirmModal';

const OrderSuccess = () => {
  const [params] = useSearchParams();
  const ref = params.get('ref');
  const orderId = params.get('orderId');
  const orderNumber = params.get('orderNumber');
  const method = params.get('method');
  const email = params.get('email') || '';
  const [verifying, setVerifying] = useState(!!ref);
  const [verifyError, setVerifyError] = useState('');
  const [bankDetails, setBankDetails] = useState(null);
  const socket = useSocket();
  const { showAlert } = useAlert();
  const [liveStatus, setLiveStatus] = useState(null);

  const [cancelling, setCancelling] = useState(false);
  const [cancelDone, setCancelDone] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCurrentOrder = async () => {
    if (!orderNumber || !email) return;
    try {
      const res = await api.get(`/orders/${orderNumber}/details?email=${encodeURIComponent(email)}`);
      setOrder(res.data);
      setLiveStatus(res.data.status);
    } catch (err) {
      console.error('FETCH_ORDER_ERROR:', err);
    }
  };

  useEffect(() => {
    if (orderNumber && email) fetchCurrentOrder();
  }, [orderNumber, email]);

  useEffect(() => {
    if (ref) {
      api.get(`/payments/verify/${ref}`)
        .then(() => { 
          setVerifying(false);
          fetchCurrentOrder(); // Refresh after verification
        })
        .catch(() => { setVerifyError('Payment could not be verified. Please contact support.'); setVerifying(false); });
    }
    if (method === 'bank_transfer') {
      api.get('/settings').then(res => setBankDetails(res.data)).catch(() => {});
    }
  }, [ref, method]);

  useEffect(() => {
    if (socket && email) {
      socket.emit('join', email.toLowerCase());

      socket.on('order_update', (data) => {
        if (data.orderNumber === orderNumber) {
          console.log('Real-time order update:', data);
          setLiveStatus(data.status || data.payment_status);
          showAlert('success', 'Order Updated', `Your order #${data.orderNumber} is now ${data.status || data.payment_status}.`);
          fetchCurrentOrder(); // AJAX-like update
        }
      });

      return () => {
        socket.off('order_update');
      };
    }
  }, [socket, email, orderNumber]);

  const handleCancel = () => {
    setConfirmModal({
      show: true,
      title: 'Cancel Order?',
      message: 'Are you sure you want to retract this order? This action cannot be undone and your items will be restocked.',
      confirmLabel: 'Yes, Cancel',
      confirmColor: 'red',
      onConfirm: async () => {
        setCancelling(true);
        try {
          await api.post(`/orders/${orderNumber}/cancel`, { email });
          setCancelDone(true);
        } catch (err) {
          showAlert('error', 'Cancellation Failed', err.response?.data?.error || 'Failed to cancel order.');
        } finally {
          setCancelling(false);
        }
      }
    });
  };

  const icons = {
    cash: <Banknote className="w-8 h-8 text-yellow-500" />,
    momo: <Smartphone className="w-8 h-8 text-green-500" />,
    bank_transfer: <CreditCard className="w-8 h-8 text-blue-500" />,
  };

  const messages = {
    cash: { title: 'Order Confirmed!', sub: 'Your order has been placed. Please visit our showroom to pay and collect your items. An invoice will be ready for you.' },
    momo: { title: 'Payment Successful!', sub: "Your MoMo payment has been received. We'll process your order and get in touch shortly." },
    bank_transfer: { title: 'Order Pending — Deposit Required', sub: 'Your order is reserved for 72 hours. Go to the bank, make your deposit, then return here to upload your receipt.' },
  };

  const msg = messages[method] || { title: 'Order Placed!', sub: "Thank you for your order. We'll be in touch soon." };

  if (verifying) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        <MainNavbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ marginTop: '144px' }}>
          <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Verifying your payment...</p>
        </div>
        <MainFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <MainNavbar />
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-20" style={{ marginTop: '80px' }}>
        <div className={`w-24 h-24 rounded-full flex items-center justify-center ${verifyError ? 'bg-red-50 dark:bg-red-900/20' : method === 'bank_transfer' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
          {verifyError
            ? <span className="text-4xl">⚠️</span>
            : method === 'bank_transfer'
              ? <Clock className="w-12 h-12 text-blue-500" />
              : <CheckCircle className="w-12 h-12 text-green-500" />}
        </div>

        <div className="text-center max-w-md">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">
            {verifyError ? 'Payment Issue' : msg.title}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
            {verifyError || msg.sub}
          </p>
          {(orderNumber || orderId) && !verifyError && (
            <p className="mt-4 text-sm font-bold text-gray-700 dark:text-gray-300">
              Order Number: <span className={`font-black ${method === 'bank_transfer' ? 'text-blue-600' : 'text-green-600'}`}>{orderNumber || `#${orderId}`}</span>
            </p>
          )}
          {liveStatus && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-black uppercase tracking-widest border border-green-100 dark:border-green-800 animate-pulse">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Live Status: {liveStatus}
            </div>
          )}
        </div>

        {!verifyError && method && (
          <div className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            {icons[method]}
            <div>
              <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Method</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{method === 'bank_transfer' ? 'Bank Transfer' : method === 'momo' ? 'Mobile Money' : 'Cash'}</p>
            </div>
          </div>
        )}

        {/* Bank transfer: show account details + upload CTA */}
        {method === 'bank_transfer' && !verifyError && (
          <div className="w-full max-w-md space-y-4">
            {bankDetails && (bankDetails.bank_name || bankDetails.bank_account_number) && (
              <div className="p-5 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl text-sm">
                <p className="font-black text-blue-700 dark:text-blue-400 text-xs uppercase tracking-wider mb-3">Deposit To This Account</p>
                {bankDetails.bank_name && (
                  <div className="flex justify-between py-1 border-b border-blue-100 dark:border-blue-800">
                    <span className="text-gray-500 dark:text-gray-400">Bank</span>
                    <span className="font-bold text-gray-900 dark:text-white">{bankDetails.bank_name}</span>
                  </div>
                )}
                {bankDetails.bank_branch && (
                  <div className="flex justify-between py-1 border-b border-blue-100 dark:border-blue-800">
                    <span className="text-gray-500 dark:text-gray-400">Branch</span>
                    <span className="font-bold text-gray-900 dark:text-white">{bankDetails.bank_branch}</span>
                  </div>
                )}
                {bankDetails.bank_account_name && (
                  <div className="flex justify-between py-1 border-b border-blue-100 dark:border-blue-800">
                    <span className="text-gray-500 dark:text-gray-400">Account Name</span>
                    <span className="font-bold text-gray-900 dark:text-white">{bankDetails.bank_account_name}</span>
                  </div>
                )}
                {bankDetails.bank_account_number && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500 dark:text-gray-400">Account Number</span>
                    <span className="font-black text-blue-700 dark:text-blue-400 text-base tracking-wider">{bankDetails.bank_account_number}</span>
                  </div>
                )}
              </div>
            )}

            <div className="p-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl text-sm">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="font-black text-amber-700 dark:text-amber-400 text-xs uppercase tracking-wider">72-Hour Window</p>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-amber-700 dark:text-amber-300 text-xs">
                <li>Note your order number above — <strong>use it as your payment reference</strong></li>
                <li>Visit any branch and deposit the exact order total</li>
                <li>Keep your physical deposit receipt or take a screenshot of the transfer</li>
                <li>Return here or visit your profile to upload the receipt for verification</li>
              </ol>
              <p className="mt-3 text-[11px] text-amber-600 dark:text-amber-400 font-medium">Order will be automatically cancelled after 72 hours if no receipt is uploaded.</p>
            </div>

            <Link
              to={`/upload-receipt?orderNumber=${orderNumber || ''}&email=${encodeURIComponent(email)}`}
              className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-colors shadow-lg"
            >
              <Upload className="w-5 h-5" />
              Upload Deposit Receipt
            </Link>
          </div>
        )}

        <div className="flex items-center gap-4 flex-wrap justify-center">
          {cancelDone ? (
            <Link
              to="/"
              className="px-8 py-4 bg-gray-900 text-white font-black rounded-2xl hover:shadow-lg transition-all"
            >
              Order Cancelled — Back to Home
            </Link>
          ) : (
            <>
              <Link
                to="/products"
                className="px-8 py-4 bg-gradient-to-r from-green-600 to-yellow-500 text-white font-black rounded-2xl hover:shadow-lg hover:shadow-green-500/30 transition-all text-center min-w-[180px]"
              >
                {method === 'bank_transfer' || method === 'cash' ? 'Pay Later' : 'Continue Shopping'}
              </Link>
              {method === 'bank_transfer' || method === 'cash' ? (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="px-8 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 hover:border-red-200 transition-colors text-center min-w-[180px] flex items-center justify-center gap-2"
                >
                  {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                  {cancelling ? 'Cancelling...' : 'Cancel Order'}
                </button>
              ) : (
                <Link
                  to="/"
                  className="px-8 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center min-w-[180px]"
                >
                  Back to Home
                </Link>
              )}
            </>
          )}
        </div>
      </div>
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

export default OrderSuccess;
