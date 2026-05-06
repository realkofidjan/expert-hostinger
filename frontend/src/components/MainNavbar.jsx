import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Menu, X, ChevronRight, Phone } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Projects', href: '/projects' },
  { label: 'Our Services', href: '/services' },
  { label: 'Blog', href: '/blog' },
];

const WHATSAPP = '+233574101615';

const MainNavbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const isHeroPage = ['/', '/projects'].includes(location.pathname) || /^\/blog\/.+/.test(location.pathname);
  const isTransparent = isHeroPage && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location]);

  const dynamicIconClass = `w-11 h-11 flex items-center justify-center rounded-2xl transition-all duration-300 cursor-pointer ${
    isTransparent
      ? 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/20'
      : 'bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
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
              return (
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
            {/* Call button */}
            <a href="tel:+233571386600" className={dynamicIconClass} title="Call Support">
              <Phone size={20} />
            </a>

            {/* Theme toggle */}
            <button className={dynamicIconClass} onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Get a Quote CTA */}
            <a
              href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hi, I would like to request a quote for your products.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center px-6 h-11 bg-gradient-to-r from-green-500 to-yellow-400 text-gray-900 font-black text-sm rounded-2xl hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:scale-[1.02] transform transition-all duration-300 active:scale-95 gap-2"
            >
              Get a Quote
            </a>

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
              return (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`flex items-center justify-between p-4 text-lg font-bold transition-all rounded-2xl ${
                    isActive
                      ? (theme === 'dark' ? 'bg-white/10 text-white' : 'bg-green-50 text-green-600')
                      : (theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
                  }`}
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
          <div className={`mt-8 pt-8 border-t ${theme === 'dark' ? 'border-white/5' : 'border-gray-100'}`}>
            <a
              href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hi, I would like to request a quote for your products.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-green-500 to-yellow-400 rounded-2xl font-black text-gray-900 text-base"
            >
              Get a Quote on WhatsApp
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

export default MainNavbar;
