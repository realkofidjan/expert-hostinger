import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlert } from '../../context/AlertContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../api';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  MessageSquare,
  Package,
  Clock,
  CheckCircle,
  Plus,
  AlertCircle,
  FileText,
  HardDrive
} from 'lucide-react';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const { showAlert } = useAlert();
  const socket = useSocket();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    totalInquiries: 0,
    pendingOrders: 0,
    lowStockCount: 0,
    lowStockProducts: [],
    storage: { used: 0, limit: 1, percent: 0 }
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.emit('join', 'admin_room'); // Join a generic admin room or just listen to global events

      socket.on('admin_new_order', (data) => {
        showAlert('success', 'New Order Alert', `Order #${data.orderNumber} received from ${data.customer_name}!`);
        fetchDashboardData();
      });

      socket.on('admin_order_cancelled', (data) => {
        showAlert('warning', 'Order Cancellation', `Order #${data.orderNumber} has been cancelled by the customer.`);
        fetchDashboardData();
      });

      socket.on('admin_receipt_uploaded', (data) => {
        showAlert('info', 'Receipt Uploaded', `A new bank receipt was uploaded for order #${data.orderNumber}.`);
        fetchDashboardData();
      });

      return () => {
        socket.off('admin_new_order');
        socket.off('admin_order_cancelled');
        socket.off('admin_receipt_uploaded');
      };
    }
  }, [socket]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/stats');
      const data = response.data;

      setStats({
        totalOrders: data.totalOrders || 0,
        totalProducts: data.totalProducts || 0,
        totalCustomers: data.totalCustomers || 0,
        totalInquiries: data.totalQuotes || 0,
        pendingOrders: data.pendingOrders || 0,
        lowStockCount: data.lowStockCount || 0,
        lowStockProducts: data.lowStockProducts || [],
        storage: data.storage || { used: 0, limit: 1, percent: 0 }
      });

      setRecentOrders(data.recentOrders || []);
    } catch (err) {
      console.error('Dashboard Error:', err);
      toast.error('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Orders', value: stats.totalOrders, icon: <ShoppingCart />, color: 'from-blue-500 to-indigo-600' },
    { title: 'Customers', value: stats.totalCustomers, icon: <Users />, color: 'from-green-500 to-emerald-600' },
    { title: 'Pending Orders', value: stats.pendingOrders, icon: <Clock />, color: 'from-yellow-400 to-orange-500' },
    { title: 'Storage Used', value: `${stats.storage.percent}%`, icon: <HardDrive />, color: 'from-red-500 to-orange-600' },
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
          {/* Recent Orders Table */}
          <div className="lg:col-span-2 glass rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-secondary)]/50">
              <h3 className="font-bold text-lg flex items-center gap-2 text-[var(--text-primary)]">
                <Package size={20} className="text-green-500" />
                Recent Orders
              </h3>
              <button onClick={() => navigate('/admin/orders')} className="text-sm text-green-500 hover:underline">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--bg-secondary)] text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold border-b border-[var(--border-color)]">
                    <th className="px-6 py-4">Order ID</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {loading ? (
                    <tr><td colSpan="4" className="px-6 py-10 text-center"><div className="animate-spin inline-block w-6 h-6 border-2 border-green-500 rounded-full border-t-transparent"></div></td></tr>
                  ) : recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-10 text-center text-[var(--text-muted)]">
                        No orders recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-[var(--bg-tertiary)] transition-colors text-sm">
                        <td className="px-6 py-4 font-mono font-medium text-green-500">{order.order_number || `#${order.id}`}</td>
                        <td className="px-6 py-4 text-[var(--text-primary)]">
                          {order.customer_name || order.full_name || 'Guest'}
                        </td>
                        <td className="px-6 py-4 font-semibold text-[var(--text-primary)]">GHS {parseFloat(order.total_amount).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                            ${order.status === 'delivered' ? 'bg-green-500/10 text-green-500' :
                              order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                'bg-blue-500/10 text-blue-500'}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions / Activity Feed */}
          <div className="flex flex-col gap-8">
            {/* Low Stock Alerts */}
            <div className="glass rounded-3xl p-6 bg-red-500/[0.02]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2 text-[var(--text-primary)]">
                  <AlertCircle size={20} className="text-red-500" />
                  Low Stock Alerts
                </h3>
                {stats.lowStockCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse">
                    {stats.lowStockCount}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {stats.lowStockProducts?.length === 0 ? (
                  <div className="py-4 text-center text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest opacity-50">
                    Inventory healthy
                  </div>
                ) : (
                  stats.lowStockProducts?.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] hover:border-red-500/30 transition-all group">
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-red-400 transition-colors uppercase tracking-tight">{product.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-black line-clamp-1">{product.category || 'Uncategorized'}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-xs font-black text-red-500">{product.stock}</p>
                        <p className="text-[8px] text-[var(--text-muted)] uppercase font-bold">In Stock</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass rounded-3xl p-6 bg-[var(--bg-secondary)]/10 flex flex-col flex-1">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2 shrink-0 text-[var(--text-primary)]">
                <TrendingUp size={20} className="text-yellow-500" />
                Administrative Actions
              </h3>
              <div className="space-y-4 flex-1">
                <button
                  onClick={() => navigate('/admin/products')}
                  className="w-full flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] hover:border-green-500/50 transition-all group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                      <Plus size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">New Product</p>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">New Inventory Entry</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/admin/brands')}
                  className="w-full flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] hover:border-blue-500/50 transition-all group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Manage Brands</p>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">BrandManufacturer Setup</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/admin/blogs')}
                  className="w-full flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] hover:border-purple-500/50 transition-all group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Create Content</p>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Blog & Article Editor</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Storage Pie Chart Card */}
            <div className="glass rounded-[2rem] p-8 border border-[var(--border-color)] bg-[var(--bg-secondary)]/10">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500">
                  <HardDrive size={18} />
                </div>
                <h3 className="font-black text-sm uppercase tracking-widest text-[var(--text-primary)]">Storage Allocation</h3>
              </div>

              <div className="flex flex-col items-center">
                {/* Custom SVG Pie Chart */}
                <div className="relative w-40 h-40 mb-8">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50" cy="50" r="40"
                      className="fill-none stroke-[var(--border-color)]"
                      strokeWidth="12"
                    />
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
                      <div 
                        className="h-full bg-red-500 transition-all duration-1000"
                        style={{ width: `${stats.storage.percent}%` }}
                      ></div>
                    </div>
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
