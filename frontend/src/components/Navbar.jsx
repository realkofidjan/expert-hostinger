import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sun, Moon, Bell, User, 
  Menu 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  return (
    <nav className="fixed top-0 w-full z-50 glass border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
        <img src="/assets/Company logo.png" alt="Expert Office" className="h-10 w-auto" />
      </div>

      <div className="hidden lg:flex items-center gap-10 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.25em]">
        <button onClick={() => navigate('/products')} className="hover:text-green-500 transition-all hover:scale-110 active:scale-95 py-2">Catalog</button>
        <button onClick={() => navigate('/categories')} className="hover:text-green-500 transition-all hover:scale-110 active:scale-95 py-2">Categories</button>
        <button onClick={() => navigate('/brands')} className="hover:text-green-500 transition-all hover:scale-110 active:scale-95 py-2">Brands</button>
        <button onClick={() => navigate('/support')} className="hover:text-green-500 transition-all hover:scale-110 active:scale-95 py-2">Assistance</button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="w-12 h-12 rounded-xl glass border border-white/10 flex items-center justify-center text-[var(--text-primary)] hover:bg-white/5 transition-all shadow-xl"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {token ? (
          <div className="flex items-center gap-3">
            <button
              className="w-12 h-12 rounded-xl glass border border-white/10 flex items-center justify-center text-[var(--text-primary)] hover:bg-white/5 transition-all relative group overflow-hidden shadow-xl"
              title="Notifications"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Bell size={20} className="group-hover:scale-110 transition-transform relative z-10" />
              <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-yellow-500 border border-[var(--bg-primary)] rounded-full"></div>
            </button>

            <button
              onClick={() => navigate('/profile')}
              className="w-12 h-12 rounded-xl glass border border-white/10 flex items-center justify-center text-[var(--text-primary)] hover:border-green-500/50 hover:bg-white/5 transition-all shadow-xl group relative overflow-hidden"
              title="Account Hub"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-green-500/10 to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <User size={20} className="group-hover:scale-110 transition-transform relative z-10" />
              <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[var(--bg-primary)] rounded-full translate-x-1/2 -translate-y-1/2"></div>
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2 h-12 rounded-xl glass border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all hidden sm:block"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/admin/login')}
              className="px-6 py-2 h-12 rounded-xl bg-gradient-to-r from-green-500 to-yellow-500 text-[#0f172a] text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-green-500/20"
            >
              Admin Access
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
