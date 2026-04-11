import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, Sun, Moon, Eye, EyeOff, LogIn, UserX } from 'lucide-react';
import api from '../../api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTheme } from '../../context/ThemeContext';

const AdminLogin = () => {
    const savedUser = JSON.parse(localStorage.getItem('admin_user') || 'null');
    const [quickMode, setQuickMode] = useState(!!savedUser);

    const [email, setEmail] = useState(savedUser?.email || '');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/auth/login', { email, password });
            const { token, user } = response.data;
            const userRole = (user.role || '').toLowerCase();
            if (['admin', 'staff', 'sub-admin'].includes(userRole)) {
                localStorage.setItem('admin_token', token);
                localStorage.setItem('admin_user', JSON.stringify(user));
                toast.success('Welcome back!', { theme: isDark ? 'dark' : 'light' });
                setTimeout(() => navigate('/admin'), 900);
            } else {
                toast.error('Access denied. Staff or admin privileges required.', { theme: isDark ? 'dark' : 'light' });
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Invalid credentials', { theme: isDark ? 'dark' : 'light' });
        } finally {
            setLoading(false);
        }
    };

    const switchAccount = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        setQuickMode(false);
        setEmail('');
        setPassword('');
    };

    const initials = (savedUser?.full_name || savedUser?.email || 'A').charAt(0).toUpperCase();

    return (
        <div
            className="min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-300"
            style={{ backgroundColor: 'var(--bg-primary)' }}
        >
            <ToastContainer position="top-right" />

            {/* Ambient background blobs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className={`absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full blur-[140px] transition-opacity duration-500 ${isDark ? 'bg-green-500/10' : 'bg-green-500/8'}`} />
                <div className={`absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full blur-[140px] transition-opacity duration-500 ${isDark ? 'bg-yellow-500/10' : 'bg-yellow-500/6'}`} />
            </div>

            {/* Theme toggle — top right */}
            <button
                onClick={toggleTheme}
                className="absolute top-6 right-6 z-20 p-2.5 rounded-xl border transition-all duration-200 hover:scale-105"
                style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-muted)'
                }}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Login card */}
            <div className="relative z-10 w-full max-w-md mx-4 animate-fadeIn">
                <div
                    className="rounded-3xl overflow-hidden shadow-2xl border"
                    style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-color)',
                        boxShadow: isDark
                            ? '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
                            : '0 25px 60px rgba(0,0,0,0.12)'
                    }}
                >
                    {/* Card header */}
                    <div className="px-8 pt-8 pb-6 text-center border-b" style={{ borderColor: 'var(--border-color)' }}>
                        {quickMode && savedUser ? (
                            <>
                                <div className="flex justify-center mb-4">
                                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-green-500 to-yellow-400 flex items-center justify-center text-3xl font-black text-gray-900 shadow-xl shadow-green-500/20">
                                        {initials}
                                    </div>
                                </div>
                                <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                                    Get logged back in
                                </h1>
                                <div className="mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                    <Mail size={14} className="text-green-500 shrink-0" />
                                    <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{savedUser.email}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-center mb-5">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-green-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                                        <img
                                            src="/assets/Company logo.png"
                                            alt="Expert Office"
                                            className="w-11 h-11 object-contain"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    </div>
                                </div>
                                <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                                    Admin Portal
                                </h1>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] mt-1.5 text-green-500">
                                    Expert Office Management
                                </p>
                            </>
                        )}
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="px-8 py-7 space-y-5">
                        {/* Email field — only show for full login */}
                        {!quickMode && (
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
                                    Email Address
                                </label>
                                <div className="relative group">
                                    <Mail
                                        size={16}
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
                                        style={{ color: 'var(--text-muted)' }}
                                    />
                                    <input
                                        type="email"
                                        required
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin@expertoffice.com"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium border transition-all duration-200 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/15"
                                        style={{
                                            backgroundColor: 'var(--bg-tertiary)',
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--text-primary)',
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Password field */}
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
                                Password
                            </label>
                            <div className="relative group">
                                <Lock
                                    size={16}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{ color: 'var(--text-muted)' }}
                                />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="current-password"
                                    autoFocus={quickMode}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-11 py-3 rounded-xl text-sm font-medium border transition-all duration-200 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/15"
                                    style={{
                                        backgroundColor: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors hover:text-green-500"
                                    style={{ color: 'var(--text-muted)' }}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-[0.15em] flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                            style={{
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                color: '#fff',
                                boxShadow: '0 8px 24px rgba(34,197,94,0.3)'
                            }}
                            onMouseEnter={e => !loading && (e.currentTarget.style.boxShadow = '0 12px 32px rgba(34,197,94,0.45)')}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(34,197,94,0.3)'}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    <LogIn size={16} />
                                    {quickMode ? 'Sign Back In' : 'Sign In'}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="px-8 pb-6 text-center space-y-3">
                        {quickMode ? (
                            <button
                                onClick={switchAccount}
                                className="flex items-center justify-center gap-2 mx-auto px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200 hover:scale-[1.02]"
                                style={{
                                    color: 'var(--text-muted)',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                <UserX size={14} />
                                Log into a different account
                            </button>
                        ) : (
                            <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                                Restricted access — authorised personnel only
                            </p>
                        )}
                    </div>
                </div>

                {/* Version tag */}
                <p className="text-center mt-4 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', opacity: 0.4 }}>
                    Expert Office
                </p>
            </div>
        </div>
    );
};

export default AdminLogin;
