import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, Moon, Sun, Menu, X, ChevronRight, LogOut, LayoutDashboard, Phone } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Projects', href: '/projects' },
  { label: 'Our Services', href: '/services' },
  { label: 'Blog', href: '/blog' },
];

const MainNavbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { cartCount, setIsCartOpen } = useCart();
  const userMenuRef = useRef(null);

  // Read auth state from localStorage
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const isLoggedIn = !!token && !!user;

  const isHeroPage = ['/', '/projects'].includes(location.pathname) || /^\/blog\/.+/.test(location.pathname);
  const isTransparent = isHeroPage && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUserMenuOpen(false);
    navigate('/');
    window.location.reload();
  };


  const dynamicIconClass = `w-11 h-11 flex items-center justify-center rounded-2xl transition-all duration-300 cursor-pointer ${
    isTransparent
      ? "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/20"
      : "bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
  }`;

  const navLinkClass = (isActive) => `px-5 py-2 text-sm font-bold transition-all duration-300 relative group ${
    isTransparent
      ? (isActive ? 'text-white' : 'text-white/60 hover:text-white')
      : (isActive ? 'text-green-600 dark:text-white' : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white')
  }`;

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b ${
      isTransparent
        ? 'bg-transparent border-transparent shadow-none'
        : 'bg-white/90 dark:bg-gray-950/80 backdrop-blur-2xl shadow-xl border-gray-200/50 dark:border-white/5'
    }`}>
      <div className="max-w-[1600px] mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-20 sm:h-24">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-4 group flex-shrink-0">
            <img
              src="/images/Logo.png"
              alt="Expert Office"
              className={`h-12 w-auto object-contain transition-all duration-500 group-hover:scale-105 ${
                isTransparent ? 'brightness-110' : 'brightness-100 dark:brightness-110'
              }`}
            />
            <div className="flex flex-col">
              <p className={`text-xl font-black tracking-tight transition-colors duration-300 ${isTransparent ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                Expert Office Furnish
              </p>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-300 ${isTransparent ? 'text-white/50' : 'text-gray-500 dark:text-white/40'}`}>
                Premium Furniture
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-2">
            {navLinks.map(link => {
              const isActive = location.pathname === link.href || (link.href !== '/' && location.pathname.startsWith(link.href));
              
              return link.href.startsWith('#') ? (
                <a
                  key={link.label}
                  href={link.href}
                  className={navLinkClass(false)}
                >
                  {link.label}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-green-500 group-hover:w-full transition-all duration-300" />
                </a>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
                  className={navLinkClass(isActive)}
                >
                  {link.label}
                  <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-green-500 transition-all duration-300 ${
                    isActive ? 'w-full' : 'w-0 group-hover:w-full'
                  }`} />
                </Link>
              );
            })}
          </nav>

          {/* Right icons */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">


              {/* Dark mode toggle */}
              <button className={dynamicIconClass} onClick={toggleTheme} aria-label="Toggle theme">
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Call button */}
              <a 
                href="tel:+233571386600"
                className={dynamicIconClass}
                title="Call Support"
              >
                <Phone size={20} />
              </a>

              {/* Cart */}
              <button className={`${dynamicIconClass} relative`} onClick={() => setIsCartOpen(true)} aria-label="Open cart">
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </button>

              {/* User / Profile / Login */}
              <div className="relative" ref={userMenuRef}>
                {isLoggedIn ? (
                  <button
                    className={dynamicIconClass}
                    onClick={() => setUserMenuOpen(v => !v)}
                    aria-label="User menu"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-yellow-400 flex items-center justify-center text-xs font-black text-gray-900">
                      {(user.full_name || user.email).charAt(0).toUpperCase()}
                    </div>
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className={`flex items-center gap-2 px-5 h-11 rounded-2xl font-bold text-sm transition-all duration-300 ${
                      isTransparent
                        ? 'bg-white/5 border border-white/10 text-white/90 hover:bg-white/10 hover:text-white'
                        : 'bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/90 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <User size={16} />
                    <span>Login</span>
                  </Link>
                )}

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-3 w-56 bg-white dark:bg-gray-900 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fadeIn">
                    {isLoggedIn ? (
                      <>
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
                          <p className="text-[10px] text-gray-400 dark:text-white/40 uppercase tracking-wider">Signed in as</p>
                          <p className="text-sm text-gray-900 dark:text-white font-bold truncate mt-0.5">{user.full_name || user.email}</p>
                          <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full font-bold uppercase tracking-wider">
                            {user.role}
                          </span>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <User size={15} /> My Profile
                        </Link>
                        {(user.role === 'admin' || user.role === 'sub-admin') && (
                          <Link
                            to="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                          >
                            <LayoutDashboard size={15} /> Admin Portal
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border-t border-gray-100 dark:border-white/5"
                        >
                          <LogOut size={15} /> Sign Out
                        </button>
                      </>
                    ) : (
                      <Link
                        to="/login"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <User size={15} /> Login
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Link
              to="/products"
              className="hidden sm:flex items-center px-8 h-11 bg-gradient-to-r from-green-500 to-yellow-400 text-gray-900 font-black text-sm rounded-2xl hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:scale-[1.02] transform transition-all duration-300 active:scale-95"
            >
              Shop Now
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`lg:hidden w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${
                isTransparent
                  ? 'bg-white/5 border border-white/10 text-white'
                  : 'bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
              }`}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className={`lg:hidden absolute top-full left-0 right-0 backdrop-blur-2xl border-t py-8 px-6 shadow-2xl animate-fadeIn ${
          theme === 'dark' 
            ? 'bg-gray-950/95 border-white/5' 
            : 'bg-white/95 border-gray-100'
        }`}>
          <nav className="flex flex-col gap-1">
            {navLinks.map(link => {
              const isActive = location.pathname === link.href || (link.href !== '/' && location.pathname.startsWith(link.href));

              const mobileLinkClass = `flex items-center justify-between p-4 text-lg font-bold transition-all rounded-2xl ${
                isActive 
                  ? (theme === 'dark' ? 'bg-white/10 text-white' : 'bg-green-50 text-green-600')
                  : (theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
              }`;

              return link.href.startsWith('#') ? (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClass}
                >
                  {link.label}
                  <ChevronRight size={18} className="opacity-20" />
                </a>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
                  className={mobileLinkClass}
                >
                  {link.label}
                  <div className="flex items-center gap-3">
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />}
                    <ChevronRight size={18} className={isActive ? 'opacity-40' : 'opacity-20'} />
                  </div>
                </Link>
              );
            })}
          </nav>
          <div className={`mt-8 pt-8 border-t grid grid-cols-2 gap-4 ${theme === 'dark' ? 'border-white/5' : 'border-gray-100'}`}>
            <button 
              onClick={() => { setIsCartOpen(true); setMenuOpen(false); }} 
              className={`flex items-center justify-center gap-3 p-4 rounded-2xl font-bold relative ${
                theme === 'dark' ? 'bg-white/5 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            >
              <ShoppingCart size={20} /> Cart
              {cartCount > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-green-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
            {isLoggedIn ? (
              <Link 
                to="/profile" 
                onClick={() => setMenuOpen(false)} 
                className={`flex items-center justify-center gap-3 p-4 rounded-2xl font-bold ${
                  theme === 'dark' ? 'bg-white/5 text-white' : 'bg-gray-100 text-gray-900'
                }`}
              >
                <User size={20} /> Profile
              </Link>
            ) : (
              <Link 
                to="/login" 
                className={`flex items-center justify-center gap-3 p-4 rounded-2xl font-bold ${
                  theme === 'dark' ? 'bg-white/5 text-white' : 'bg-gray-100 text-gray-900'
                }`}
              >
                <User size={20} /> Login
              </Link>
            )}
            {isLoggedIn && (
              <button 
                onClick={handleLogout} 
                className="col-span-2 flex items-center justify-center gap-3 p-4 bg-red-500/10 rounded-2xl text-red-400 font-bold"
              >
                <LogOut size={20} /> Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};


export default MainNavbar;
