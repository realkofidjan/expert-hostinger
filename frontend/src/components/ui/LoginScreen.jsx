import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, CheckCircle2, ArrowRight, Loader2, Sparkles, X } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../../api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- helpers ---
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function getPasswordStrength(pwd) {
    if (!pwd) return null;
    const checks = {
        length:  pwd.length >= 8,
        upper:   /[A-Z]/.test(pwd),
        lower:   /[a-z]/.test(pwd),
        number:  /[0-9]/.test(pwd),
        special: /[^A-Za-z0-9]/.test(pwd),
    };
    const score = Object.values(checks).filter(Boolean).length;
    if (score <= 2) return { level: 'weak',   label: 'Weak',   color: 'bg-red-500',    text: 'text-red-500',    bars: 1 };
    if (score <= 3) return { level: 'fair',   label: 'Fair',   color: 'bg-orange-400', text: 'text-orange-400', bars: 2 };
    if (score <= 4) return { level: 'good',   label: 'Good',   color: 'bg-yellow-400', text: 'text-yellow-500', bars: 3 };
    return             { level: 'strong', label: 'Strong', color: 'bg-green-500',  text: 'text-green-600',  bars: 4 };
}

function PasswordStrengthBar({ password }) {
    const strength = getPasswordStrength(password);
    if (!strength) return null;

    const checks = [
        { label: 'At least 8 characters', ok: password.length >= 8 },
        { label: 'Uppercase letter',       ok: /[A-Z]/.test(password) },
        { label: 'Lowercase letter',       ok: /[a-z]/.test(password) },
        { label: 'Number',                 ok: /[0-9]/.test(password) },
        { label: 'Special character',      ok: /[^A-Za-z0-9]/.test(password) },
    ];

    return (
        <div className="mt-2 space-y-2">
            {/* bars */}
            <div className="flex gap-1">
                {[1, 2, 3, 4].map(i => (
                    <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.bars ? strength.color : 'bg-gray-100'}`}
                    />
                ))}
            </div>
            {/* label */}
            <div className="flex items-center justify-between px-0.5">
                <span className={`text-[10px] font-black uppercase tracking-widest ${strength.text}`}>
                    {strength.label} password
                </span>
                {strength.level === 'strong' && (
                    <CheckCircle2 size={12} className="text-green-500" />
                )}
            </div>
            {/* checklist */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-0.5">
                {checks.map(c => (
                    <div key={c.label} className="flex items-center gap-1.5">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${c.ok ? 'bg-green-500' : 'bg-gray-100'}`}>
                            {c.ok
                                ? <CheckCircle2 size={9} className="text-white" />
                                : <X size={8} className="text-gray-300" />
                            }
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wide transition-colors ${c.ok ? 'text-gray-600' : 'text-gray-300'}`}>
                            {c.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function LoginScreen({ initialMode = 'login' }) {
    const [isLogin, setIsLogin] = useState(initialMode === 'login');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [emailTouched, setEmailTouched] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const navigate = useNavigate();

    // derived validation
    const emailValid  = EMAIL_RE.test(formData.email);
    const emailError  = emailTouched && !isLogin && formData.email && !emailValid;
    const pwdStrength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);
    const pwdWeak     = !isLogin && formData.password && pwdStrength?.level === 'weak';
    const pwdMismatch = !isLogin && formData.confirmPassword && formData.password !== formData.confirmPassword;

    const handleGoogleSuccess = async (tokenResponse) => {
        setGoogleLoading(true);
        try {
            const res = await api.post('/auth/google', { access_token: tokenResponse.access_token });
            const { token, user } = res.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            toast.success(`Welcome, ${user.full_name || user.email}!`);
            setTimeout(() => navigate('/'), 900);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Google sign-in failed. Please try again.');
        } finally {
            setGoogleLoading(false);
        }
    };

    const googleLogin = useGoogleLogin({
        onSuccess: handleGoogleSuccess,
        onError: () => toast.error('Google sign-in was cancelled or failed.'),
        flow: 'implicit',
    });

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isLogin) {
            setEmailTouched(true);
            if (!emailValid) {
                toast.error('Please enter a valid email address.');
                return;
            }
            if (pwdStrength?.level === 'weak') {
                toast.error('Password is too weak. Please make it stronger.');
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                toast.error('Passwords do not match.');
                return;
            }
        }

        setLoading(true);
        try {
            if (isLogin) {
                const response = await api.post('/auth/login', {
                    email: formData.email,
                    password: formData.password
                });
                const { token, user } = response.data;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                toast.success('Welcome back!');
                setTimeout(() => navigate('/'), 900);
            } else {
                await api.post('/auth/register', {
                    full_name: formData.full_name,
                    email: formData.email,
                    phone: formData.phone,
                    password: formData.password
                });
                toast.success('Account created! Please sign in.');
                setIsLogin(true);
            }
        } catch (err) {
            toast.error(err.response?.data?.error || err.message || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`w-full h-screen flex bg-white font-sans selection:bg-green-100 selection:text-green-900 overflow-hidden relative ${isLogin ? 'flex-row-reverse' : 'flex-row'}`}>
            <ToastContainer position="top-right" />

            {/* Back Button */}
            <Link
                to="/"
                className={`absolute top-10 left-10 z-50 flex items-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all hover:scale-105 active:scale-95 ${isLogin ? 'text-gray-900/50 hover:text-gray-900' : 'text-white/50 hover:text-white'}`}
            >
                <ArrowRight size={14} className="rotate-180" /> Continue Shopping
            </Link>

            {/* Left side - Hero section */}
            <div className="hidden lg:flex w-1/2 relative overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-10000 hover:scale-105"
                    style={{ backgroundImage: "url('/images/Bg-Vision.jpeg')" }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900/40 to-transparent" />

                <div className="relative z-10 p-16 flex flex-col justify-between w-full">
                    <div />
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30 mb-8 backdrop-blur-md">
                            <Sparkles size={12} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Curated Workplace Aesthetics</span>
                        </div>
                        <h1 className="text-7xl font-black text-white mb-8 leading-[1.05] tracking-tight uppercase">
                            Design your <br /> space. Redefine <br /><span className="text-green-500">your vision.</span>
                        </h1>
                        <p className="text-white/60 text-lg font-medium max-w-sm">
                            Join the elite circle of companies redefining productivity through architectural workspace design.
                        </p>
                    </div>
                    <div className="flex items-center gap-8 text-white/30 font-bold uppercase tracking-widest text-[10px]">
                        <span>© 2026 EXPERT OFFICE</span>
                        <div className="flex gap-6">
                            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
                        </div>
                    </div>
                </div>
                <div className="absolute -bottom-20 -right-20 w-96 h-96 border-[40px] border-white/5 rounded-full blur-xl" />
            </div>

            {/* Right side - Form */}
            <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-8 md:p-12 lg:p-20 relative overflow-y-auto overflow-x-hidden">
                <div className="w-full max-w-md animate-fadeIn">

                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="flex justify-center mb-10">
                            <img
                                src="/assets/Company logo.png"
                                alt="Logo"
                                className="w-24 h-24 object-contain"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        </div>
                        <h2 className="text-4xl font-black text-gray-900 mb-2 uppercase tracking-tight">
                            {isLogin ? 'Welcome Back' : 'Join Today'}
                        </h2>
                        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">
                            {isLogin ? 'There may be a gift waiting for you' : "Let's transform your workspace"}
                        </p>
                    </div>

                    {/* Google */}
                    <div className="mb-8">
                        <button
                            type="button"
                            onClick={() => googleLogin()}
                            disabled={googleLoading}
                            className="w-full flex items-center justify-center gap-3 p-3.5 border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {googleLoading
                                ? <Loader2 size={20} className="animate-spin text-gray-400" />
                                : <FcGoogle size={20} className="group-hover:scale-110 transition-transform" />
                            }
                            <span className="text-[11px] font-black uppercase tracking-widest text-gray-500 group-hover:text-gray-700 transition-colors">
                                {googleLoading ? 'Connecting...' : 'Continue with Google'}
                            </span>
                        </button>
                    </div>

                    <div className="relative mb-8 text-center">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-100" />
                        </div>
                        <span className="relative bg-white px-4 text-[9px] font-black uppercase tracking-widest text-gray-300">Or use email</span>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Name + Email row (signup) */}
                        {!isLogin ? (
                            <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleInputChange}
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:outline-none focus:ring-4 focus:ring-green-500/5 focus:border-green-500 transition-all font-medium text-sm"
                                        placeholder="Full Name"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        onBlur={() => setEmailTouched(true)}
                                        className={`w-full px-5 py-3.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-4 transition-all font-medium text-sm ${
                                            emailError
                                                ? 'border-red-400 focus:ring-red-500/10 focus:border-red-500'
                                                : 'border-transparent focus:ring-green-500/5 focus:border-green-500'
                                        }`}
                                        placeholder="Email Address"
                                        required
                                    />
                                    {emailError && (
                                        <p className="text-[9px] font-bold text-red-500 uppercase tracking-wide ml-1 mt-1">
                                            Enter a valid email address
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Email (login) */
                            <div className="space-y-1.5 animate-fadeIn">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl focus:outline-none focus:ring-4 focus:ring-green-500/5 focus:border-green-500 transition-all font-medium text-sm"
                                    placeholder="name@company.com"
                                    required
                                />
                            </div>
                        )}

                        {/* Phone (signup) */}
                        {!isLogin && (
                            <div className="space-y-1.5 animate-fadeIn">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Phone Number</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:outline-none focus:ring-4 focus:ring-green-500/5 focus:border-green-500 transition-all font-medium text-sm"
                                    placeholder="+233..."
                                />
                            </div>
                        )}

                        {/* Password */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    {isLogin ? 'Password' : 'Create Password'}
                                </label>
                                {isLogin && (
                                    <Link to="/forgot" className="text-[10px] font-black uppercase tracking-widest text-green-600 hover:text-green-700">Forgot?</Link>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className={`w-full px-5 py-3.5 pr-12 bg-gray-50 border rounded-xl focus:outline-none focus:ring-4 transition-all font-medium text-sm ${
                                        pwdWeak
                                            ? 'border-red-300 focus:ring-red-500/10 focus:border-red-400'
                                            : 'border-transparent focus:ring-green-500/5 focus:border-green-500'
                                    }`}
                                    placeholder={isLogin ? '••••••••' : 'Create password'}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(p => !p)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-300 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {/* Strength meter — signup only */}
                            {!isLogin && formData.password && (
                                <PasswordStrengthBar password={formData.password} />
                            )}
                        </div>

                        {/* Confirm Password (signup) */}
                        {!isLogin && (
                            <div className="space-y-1.5 animate-fadeIn">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Confirm Password</label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    className={`w-full px-5 py-3.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-4 transition-all font-medium text-sm ${
                                        pwdMismatch
                                            ? 'border-red-400 focus:ring-red-500/10 focus:border-red-500'
                                            : formData.confirmPassword && !pwdMismatch
                                                ? 'border-green-400 focus:ring-green-500/10 focus:border-green-500'
                                                : 'border-transparent focus:ring-green-500/5 focus:border-green-500'
                                    }`}
                                    placeholder="Verify password"
                                    required
                                />
                                {pwdMismatch && (
                                    <p className="text-[9px] font-bold text-red-500 uppercase tracking-wide ml-1 mt-1">
                                        Passwords do not match
                                    </p>
                                )}
                                {formData.confirmPassword && !pwdMismatch && (
                                    <p className="text-[9px] font-bold text-green-600 uppercase tracking-wide ml-1 mt-1 flex items-center gap-1">
                                        <CheckCircle2 size={10} /> Passwords match
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Remember me (login) */}
                        {isLogin && (
                            <label className="flex items-center px-1 group cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 text-green-600 border-gray-200 rounded-lg focus:ring-green-500 transition-all" />
                                <span className="ml-3 text-[11px] font-bold text-gray-400 group-hover:text-gray-600 transition-colors uppercase tracking-wider">Keep me signed in</span>
                            </label>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gray-900 hover:bg-green-600 text-white font-black text-[11px] uppercase tracking-[0.25em] py-5 px-4 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                    <ArrowRight size={14} />
                                </>
                            )}
                        </button>

                        <div className="text-center pt-8 border-t border-gray-50 mt-8">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                {isLogin ? "Don't have an account?" : 'Already have access?'}
                            </span>{' '}
                            <Link
                                to={isLogin ? '/register' : '/login'}
                                className="text-[11px] font-black text-green-600 hover:text-green-700 uppercase tracking-widest ml-1 underline underline-offset-4 decoration-2"
                            >
                                {isLogin ? 'Sign Up' : 'Login'}
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
