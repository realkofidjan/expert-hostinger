import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import api from '../api';

export default function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('No verification token found in the URL.');
            return;
        }

        api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
            .then(res => {
                const { token: jwt, user } = res.data;
                // Auto-login the user
                localStorage.setItem('token', jwt);
                localStorage.setItem('user', JSON.stringify(user));
                setStatus('success');
                setMessage(res.data.message || 'Email verified! Redirecting you…');
                setTimeout(() => navigate('/'), 2500);
            })
            .catch(err => {
                setStatus('error');
                setMessage(err.response?.data?.error || 'Verification failed. The link may have expired.');
            });
    }, [token]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
            <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <img
                        src="/assets/Company logo.png"
                        alt="Expert Office"
                        className="h-16 object-contain"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                </div>

                {status === 'loading' && (
                    <>
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Loader2 size={28} className="text-gray-400 animate-spin" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-3">
                            Verifying…
                        </h1>
                        <p className="text-gray-400 text-sm">Please wait while we confirm your email address.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 size={32} className="text-green-600" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-3">
                            Email Verified!
                        </h1>
                        <p className="text-gray-400 text-sm mb-8">{message}</p>
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-green-600 text-white font-black text-[11px] uppercase tracking-[0.2em] py-4 px-8 rounded-2xl transition-all duration-300"
                        >
                            Start Shopping <ArrowRight size={14} />
                        </Link>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle size={32} className="text-red-500" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-3">
                            Link Expired
                        </h1>
                        <p className="text-gray-400 text-sm mb-8">{message}</p>
                        <Link
                            to="/register"
                            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-green-600 text-white font-black text-[11px] uppercase tracking-[0.2em] py-4 px-8 rounded-2xl transition-all duration-300"
                        >
                            Back to Sign Up <ArrowRight size={14} />
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
