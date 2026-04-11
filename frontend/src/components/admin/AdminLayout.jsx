import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Users as UsersIcon,
  Package,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  Bell,
  Search,
  ClipboardList,
  Layers,
  Briefcase,
  FileText,
  Sun,
  Moon,
  ExternalLink,
  Tag,
  ClipboardCheck,
  Settings,
  ShoppingBag,
  Upload,
  CheckCheck,
  FolderOpen,
  BarChart3
} from 'lucide-react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTheme } from '../../context/ThemeContext';
import { useInactivityLogout } from '../../hooks/useInactivityLogout';
import { useRole } from '../../utils/permissions';
import { useSocket } from '../../context/SocketContext';
import { toast } from 'react-toastify';
import api from '../../api';

const TYPE_ROUTES = {
  product: '/admin/products',
  category: '/admin/categories',
  brand: '/admin/brands',
  order: '/admin/orders',
  user: '/admin/users',
};

const TYPE_LABELS = {
  product: 'Product',
  category: 'Category',
  brand: 'Brand',
  order: 'Order',
  user: 'User',
};

const AdminLayout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);
  const searchDebounce = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const notifPollRef = useRef(null);

  const [utilsExpanded, setUtilsExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('admin_user') || localStorage.getItem('user') || '{}');
  const { can } = useRole();

  useInactivityLogout();

  // Close search on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close notifications on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch notifications on mount + poll every 30s
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/admin/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    notifPollRef.current = setInterval(fetchNotifications, 30000);
    return () => clearInterval(notifPollRef.current);
  }, []);

  // Real-time push notifications via Socket.IO
  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      // Increment unread count instantly
      setUnreadCount(prev => prev + 1);
      // Refresh full list
      fetchNotifications();
      // Show toast
      toast.info(data?.title || 'New notification', {
        icon: '🔔',
        autoClose: 5000,
      });
      // Play chime
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch {}
    };
    socket.on('admin:notification', handler);
    return () => socket.off('admin:notification', handler);
  }, [socket]);

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await api.patch(`/admin/notifications/${notif.id}/read`);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {}
    }
    setNotifOpen(false);
    if (notif.order_id) navigate('/admin/orders');
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/admin/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch {}
  };

  // Close search on route change
  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }, [location.pathname]);

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    clearTimeout(searchDebounce.current);
    if (q.trim().length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    setSearchLoading(true);
    setSearchOpen(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        const res = await api.get(`/admin/search?q=${encodeURIComponent(q.trim())}`);
        setSearchResults(res.data.results || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const handleSearchSelect = (result) => {
    navigate(TYPE_ROUTES[result.type] || '/admin');
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const allMenuItems = [
    { name: 'Dashboard',          icon: <LayoutDashboard size={20} />, path: '/admin' },
    { name: 'Categories',         icon: <Layers size={20} />,          path: '/admin/categories' },
    { name: 'Brands',             icon: <Briefcase size={20} />,       path: '/admin/brands' },
    { name: 'Products',           icon: <Package size={20} />,         path: '/admin/products' },
    { name: 'Discounts & Coupons',icon: <Tag size={20} />,             path: '/admin/discounts',  permission: 'manageDiscounts' },
    { name: 'Orders',             icon: <ShoppingCart size={20} />,    path: '/admin/orders' },
    { name: 'Finance',            icon: <BarChart3 size={20} />,       path: '/admin/finance',    permission: 'manageOrders' },
    { name: 'Proforma',           icon: <ClipboardCheck size={20} />,  path: '/admin/proforma' },
    { name: 'Content',            icon: <FileText size={20} />,        path: '/admin/blogs',      permission: 'manageContent' },
    { name: 'Projects',           icon: <FolderOpen size={20} />,      path: '/admin/projects',   permission: 'manageContent' },
    { name: 'Logs',               icon: <ClipboardList size={20} />,   path: '/admin/logs' },
    { name: 'Users',              icon: <UsersIcon size={20} />,       path: '/admin/users',      permission: 'manageUsers' },
    { name: 'Settings',           icon: <Settings size={20} />,        path: '/admin/settings',   permission: 'manageSettings' },
  ];
  const menuItems = allMenuItems.filter(item => !item.permission || can(item.permission));

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/admin') return location.pathname === '/admin' || location.pathname === '/admin/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen overflow-hidden font-sans transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute top-[-10%] right-[-10%] w-[500px] h-[500px] ${isDarkMode ? 'bg-green-500/8' : 'bg-green-500/5'} blur-[130px] rounded-full`}></div>
        <div className={`absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] ${isDarkMode ? 'bg-yellow-500/8' : 'bg-yellow-500/4'} blur-[130px] rounded-full`}></div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative z-50 h-screen transition-all duration-300 ease-in-out glass
          border-r border-[var(--border-color)]
          ${isSidebarOpen ? 'w-64' : 'w-20'}`}
        style={{ backgroundColor: isDarkMode ? 'rgba(15,23,42,0.9)' : 'rgba(248,250,252,0.9)' }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 flex items-center justify-center">
            <img
              src="/assets/Company logo.png"
              alt="Expert Office Logo"
              className="w-10 h-10 object-contain"
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
            {/* Sticky/Pronounced Main Website Button */}
            <div className="sticky top-[-1rem] z-20 pt-1 pb-4 mb-4"
              style={{ backgroundColor: isDarkMode ? 'rgba(15,23,42,1)' : 'rgba(248,250,252,1)' }}>
              <Link
                to="/"
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group
                  bg-gradient-to-r from-green-500/15 to-yellow-500/10 
                  border-2 border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.1)]
                  hover:border-green-500/60 hover:shadow-[0_0_25px_rgba(34,197,94,0.2)]
                  hover:scale-[1.02] active:scale-95`}
              >
                <span className="shrink-0 text-green-500 group-hover:scale-110 transition-transform">
                  <ExternalLink size={20} />
                </span>
                {isSidebarOpen && (
                  <span className="font-black text-sm tracking-tight text-[var(--text-primary)]">
                    Main Website
                  </span>
                )}
                {isSidebarOpen && (
                  <div className="ml-auto flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse" />
                  </div>
                )}
              </Link>
            </div>

            {isSidebarOpen && (
              <p className="text-[9px] font-black uppercase tracking-[0.25em] px-3 py-2 text-[var(--text-muted)]">
                Management
              </p>
            )}

            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                  ${isActive(item.path)
                    ? 'bg-gradient-to-r from-green-500/20 to-yellow-500/10 border border-green-500/25'
                    : 'hover:bg-[var(--bg-secondary)] border border-transparent'}`}
              >
                <span className={`shrink-0 ${isActive(item.path)
                  ? 'text-green-500'
                  : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors'}`}>
                  {item.icon}
                </span>
                {isSidebarOpen && (
                  <span className={`font-semibold text-sm ${isActive(item.path)
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors'}`}>
                    {item.name}
                  </span>
                )}
                {isActive(item.path) && isSidebarOpen && (
                  <ChevronRight size={14} className="ml-auto text-green-500" />
                )}
              </Link>
            ))}
          </nav>

          {/* User Profile & Logout */}
          <div className="p-3 border-t border-[var(--border-color)]">
            {isSidebarOpen && (
              <div className="flex items-center gap-3 mb-3 p-2.5 rounded-xl bg-[var(--bg-secondary)]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green-500 to-yellow-500 flex items-center justify-center font-black text-white text-xs shadow-lg shrink-0">
                  {user.full_name?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="overflow-hidden min-w-0">
                  <p className="font-bold text-xs truncate text-[var(--text-primary)]">{user.full_name || 'Admin'}</p>
                  <p className="text-[9px] truncate text-[var(--text-muted)]">{user.email}</p>
                  <span className={`inline-block text-[8px] font-black uppercase tracking-widest mt-0.5 px-1.5 py-0.5 rounded-full ${
                    user.role === 'admin' ? 'bg-yellow-500/20 text-yellow-500' :
                    user.role === 'sub-admin' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>{user.role}</span>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all text-[var(--text-muted)]"
            >
              <LogOut size={18} className="shrink-0" />
              {isSidebarOpen && <span className="font-semibold text-sm">Logout</span>}
            </button>
          </div>
        </div>

        {/* Desktop Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className={`absolute -right-3 top-[4.5rem] w-6 h-6 rounded-full border-2 flex items-center justify-center hover:scale-110 transition-transform lg:flex hidden z-[60]
            ${isDarkMode
              ? 'bg-green-500 border-[#0f172a] text-[#0f172a]'
              : 'bg-white border-slate-200 text-slate-600 shadow-md'}`}
        >
          {isSidebarOpen ? <X size={12} /> : <Menu size={12} />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        {/* Header */}
        <header
          className="h-16 flex items-center justify-between px-6 shrink-0 border-b border-[var(--border-color)] sticky top-0 z-40"
          style={{ backgroundColor: 'var(--header-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
        >
          {/* Search */}
          <div ref={searchRef} className="relative w-80">
            <div className="flex items-center border border-[var(--border-color)] rounded-full px-4 py-1.5 bg-[var(--bg-secondary)] group focus-within:border-green-500 transition-all">
              <Search size={16} className="text-[var(--text-muted)] group-focus-within:text-green-500 shrink-0" />
              <input
                type="text"
                placeholder="Search products, orders, brands..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-full text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
              />
              {searchLoading && <div className="w-3.5 h-3.5 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin shrink-0" />}
            </div>

            {searchOpen && (
              <div
                className="absolute top-full mt-2 w-full rounded-2xl overflow-hidden shadow-2xl z-50 border border-[var(--border-color)]"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                {searchResults.length === 0 ? (
                  <p className="px-4 py-4 text-xs text-[var(--text-muted)] text-center font-medium">
                    No results found
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--border-color)] max-h-72 overflow-y-auto custom-scrollbar">
                    {searchResults.map((r, i) => (
                      <li key={i}>
                        <button
                          onClick={() => handleSearchSelect(r)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                        >
                          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-green-500/10 text-green-500 shrink-0">
                            {TYPE_LABELS[r.type] || r.type}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[var(--text-primary)] truncate">{r.name}</p>
                            {r.subtitle && <p className="text-[10px] text-[var(--text-muted)] truncate">{r.subtitle}</p>}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Collapsible Admin Utilities */}
            <div className={`flex items-center gap-3 overflow-hidden transition-all duration-500 ease-in-out py-1 ${
              utilsExpanded ? 'max-w-[300px] opacity-100' : 'max-w-0 opacity-0 pointer-events-none'
            }`}>
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full transition-all duration-200 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-yellow-500"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Notifications */}
              <div ref={notifRef} className="relative">
                <button
                  onClick={() => { setNotifOpen(o => !o); if (!notifOpen) fetchNotifications(); }}
                  className="p-2 rounded-full relative transition-colors text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none shadow-sm">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden z-50"
                    style={{ backgroundColor: 'var(--bg-primary)' }}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
                      <p className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider">Notifications</p>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="flex items-center gap-1 text-[10px] font-bold text-green-500 hover:text-green-400 transition-colors"
                        >
                          <CheckCheck size={12} /> Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center">
                          <Bell size={24} className="mx-auto text-[var(--text-muted)] mb-2 opacity-40" />
                          <p className="text-xs text-[var(--text-muted)]">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map(n => (
                          <button
                            key={n.id}
                            onClick={() => handleNotifClick(n)}
                            className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[var(--bg-secondary)] transition-colors border-b border-[var(--border-color)] last:border-0 ${!n.is_read ? 'bg-green-500/5' : ''}`}
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              n.type === 'new_order' ? 'bg-green-500/10 text-green-500' :
                              n.type === 'new_quote' || n.type === 'quote_approved' ? 'bg-purple-500/10 text-purple-500' :
                              n.type === 'new_inquiry' ? 'bg-orange-500/10 text-orange-500' :
                              n.type === 'new_user' ? 'bg-cyan-500/10 text-cyan-500' :
                              'bg-blue-500/10 text-blue-500'
                            }`}>
                              {n.type === 'new_order' ? <ShoppingBag size={14} /> :
                               n.type === 'new_user' ? <UsersIcon size={14} /> :
                               n.type === 'new_quote' || n.type === 'quote_approved' ? <ClipboardList size={14} /> :
                               <Bell size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate ${!n.is_read ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{n.title}</p>
                              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                              <p className="text-[9px] text-[var(--text-muted)] mt-1 opacity-60">
                                {new Date(n.created_at).toLocaleString('en-GH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {!n.is_read && <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 mt-1.5" />}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* EXPAND / COLLAPSE TOGGLE ARROW */}
            <button
              onClick={() => setUtilsExpanded(!utilsExpanded)}
              className="p-2 rounded-full transition-all duration-200 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-green-600 hover:bg-green-500 hover:text-white group"
              title={utilsExpanded ? "Collapse shortcuts" : "Show more shortcuts"}
            >
              <div className="transition-transform duration-500">
                {utilsExpanded ? <ChevronRight size={18} /> : <ChevronLeft size={18} className="animate-pulse" />}
              </div>
            </button>

            <div className={`h-7 w-px mx-1 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>

            {/* User */}
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold leading-none mb-0.5 text-[var(--text-primary)]">{user.full_name || 'Admin'}</p>
                <p className="text-[9px] font-bold text-green-500 uppercase tracking-widest">{user.role}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green-500 to-yellow-500 flex items-center justify-center font-black text-white text-xs">
                {user.full_name?.[0]?.toUpperCase() || 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-5 lg:p-8 custom-scrollbar scroll-smooth">
          <div className="max-w-[1600px] mx-auto min-h-full">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile FAB Toggle */}
      <button
        onClick={() => setSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-[60] w-12 h-12 bg-green-500 rounded-full text-white shadow-2xl flex items-center justify-center active:scale-95 transition-transform"
      >
        {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Toast Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={isDarkMode ? 'dark' : 'light'}
      />
    </div>
  );
};

export default AdminLayout;
