import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  TrendingUp,
  Package,
  MessageSquare,
  CheckCircle,
  Plus,
  FileText,
  HardDrive,
  Briefcase,
} from 'lucide-react';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalInquiries: 0,
    storage: { used: 0, limit: 1, percent: 0 }
  });

  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/stats');
      const data = response.data;

      setStats({
        totalProducts: data.totalProducts || 0,
        totalInquiries: data.totalInquiries || data.totalQuotes || 0,
        storage: data.storage || { used: 0, limit: 1, percent: 0 }
      });
    } catch (err) {
      console.error('Dashboard Error:', err);
      toast.error('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Products', value: stats.totalProducts, icon: <Package />, color: 'from-green-500 to-emerald-600' },
    { title: 'Total Inquiries', value: stats.totalInquiries, icon: <MessageSquare />, color: 'from-blue-500 to-indigo-600' },
    { title: 'Storage Used', value: `${parseFloat(stats.storage.percent).toFixed(1)}%`, icon: <HardDrive />, color: 'from-red-500 to-orange-600' },
  ];

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fadeIn">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-muted)] bg-clip-text text-transparent">
              Dashboard Overview
            </h1>
            <p className="text-[var(--text-muted)] mt-1">Real-time performance metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-tertiary)] transition-all flex items-center gap-2 text-sm text-[var(--text-primary)]"
            >
              < TrendingUp size={16} className="text-green-500" />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, index) => (
            <div key={index} className="glass p-6 rounded-3xl relative overflow-hidden group">
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`}></div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-sm font-medium text-[var(--text-secondary)]">{card.title}</p>
                  <h3 className="text-2xl font-bold mt-1 text-[var(--text-primary)]">{card.value}</h3>
                </div>
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${card.color} text-white shadow-lg`}>
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2 glass rounded-3xl p-6 bg-[var(--bg-secondary)]/10">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-[var(--text-primary)]">
              <TrendingUp size={20} className="text-yellow-500" />
              Administrative Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/admin/products')}
                className="w-full flex items-center gap-3 p-5 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] hover:border-green-500/50 transition-all group text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform shrink-0">
                  <Plus size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">New Product</p>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold mt-0.5">Add to catalogue</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/admin/inquiries')}
                className="w-full flex items-center gap-3 p-5 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] hover:border-blue-500/50 transition-all group text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform shrink-0">
                  <MessageSquare size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">View Inquiries</p>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold mt-0.5">Customer quote requests</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/admin/brands')}
                className="w-full flex items-center gap-3 p-5 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] hover:border-yellow-500/50 transition-all group text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform shrink-0">
                  <Briefcase size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">Manage Brands</p>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold mt-0.5">Brand & manufacturer setup</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/admin/blogs')}
                className="w-full flex items-center gap-3 p-5 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] hover:border-purple-500/50 transition-all group text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform shrink-0">
                  <FileText size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">Create Content</p>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold mt-0.5">Blog & article editor</p>
                </div>
              </button>
            </div>
          </div>

          {/* Storage Card */}
          <div className="glass rounded-[2rem] p-8 border border-[var(--border-color)] bg-[var(--bg-secondary)]/10">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500">
                <HardDrive size={18} />
              </div>
              <h3 className="font-black text-sm uppercase tracking-widest text-[var(--text-primary)]">Storage Allocation</h3>
            </div>

            <div className="flex flex-col items-center">
              <div className="relative w-40 h-40 mb-8">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" className="fill-none stroke-[var(--border-color)]" strokeWidth="12" />
                  <circle
                    cx="50" cy="50" r="40"
                    className="fill-none stroke-red-500 transition-all duration-1000 ease-out"
                    strokeWidth="12"
                    strokeDasharray={`${stats.storage.percent * 2.51} 251.2`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-[var(--text-primary)] leading-none">{parseFloat(stats.storage.percent).toFixed(2)}%</span>
                </div>
              </div>

              <div className="w-full space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[var(--text-muted)] uppercase tracking-wider">Used Capacity</span>
                  <span className="font-black text-[var(--text-primary)]">{formatSize(stats.storage.used)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[var(--text-muted)] uppercase tracking-wider">Total Limit</span>
                  <span className="font-black text-[var(--text-primary)]">50 GB</span>
                </div>
                <div className="pt-2">
                  <div className="h-1.5 w-full bg-[var(--border-color)] rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${stats.storage.percent}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
