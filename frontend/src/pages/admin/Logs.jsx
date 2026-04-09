import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import AdminLayout from '../../components/admin/AdminLayout';
import Pagination from '../../components/admin/Pagination';
import {
  Activity, Clock, Search, RefreshCcw,
  Package, ShoppingCart, MessageSquare, FileText,
  Layers, Briefcase, User, Upload, Tag
} from 'lucide-react';
import { toast } from 'react-toastify';

const ACTION_LABELS = {
  CREATE_PRODUCT:      'Added Product',
  UPDATE_PRODUCT:      'Updated Product',
  DELETE_PRODUCT:      'Removed Product',
  BULK_IMPORT:         'Bulk Product Import',
  CREATE_CATEGORY:     'Added Category',
  UPDATE_CATEGORY:     'Updated Category',
  DELETE_CATEGORY:     'Removed Category',
  CREATE_SUBCATEGORY:  'Added Subcategory',
  UPDATE_SUBCATEGORY:  'Updated Subcategory',
  DELETE_SUBCATEGORY:  'Removed Subcategory',
  CREATE_BRAND:        'Added Brand',
  UPDATE_BRAND:        'Updated Brand',
  DELETE_BRAND:        'Removed Brand',
  CREATE_BLOG:         'Published Blog Post',
  UPDATE_BLOG:         'Edited Blog Post',
  DELETE_BLOG:         'Deleted Blog Post',
  UPDATE_ORDER_STATUS: 'Updated Order Status',
  UPDATE_USER:         'Updated User Account',
  DELETE_USER:         'Removed User Account',
  UPDATE_QUOTE_STATUS: 'Updated Inquiry Status',
  CREATE_DISCOUNT:     'Added Coupon',
  UPDATE_DISCOUNT:     'Updated Coupon',
  DELETE_DISCOUNT:     'Removed Coupon',
  CREATE_SALE:         'Created Sale Event',
  UPDATE_SALE:         'Updated Sale Event',
  DELETE_SALE:         'Removed Sale Event',
};

const ACTION_META = {
  product:    { icon: Package,      color: 'text-blue-400',   badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  bulk:       { icon: Upload,       color: 'text-indigo-400', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  order:      { icon: ShoppingCart, color: 'text-green-400',  badge: 'bg-green-500/10 text-green-400 border-green-500/20' },
  category:   { icon: Layers,       color: 'text-yellow-400', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  subcategory:{ icon: Tag,          color: 'text-yellow-400', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  brand:      { icon: Briefcase,    color: 'text-orange-400', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  blog:       { icon: FileText,     color: 'text-purple-400', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  user:       { icon: User,         color: 'text-red-400',    badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
  inquiry:    { icon: MessageSquare,color: 'text-cyan-400',   badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  quote:      { icon: MessageSquare,color: 'text-cyan-400',   badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  discount:   { icon: Tag,          color: 'text-pink-400',   badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  default:    { icon: Activity,     color: 'text-gray-400',   badge: 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-color)]' },
};

const getActionMeta = (action) => {
  const a = action.toLowerCase();
  if (a.includes('bulk'))       return ACTION_META.bulk;
  if (a.includes('subcategory')) return ACTION_META.subcategory;
  if (a.includes('product'))    return ACTION_META.product;
  if (a.includes('order'))      return ACTION_META.order;
  if (a.includes('category'))   return ACTION_META.category;
  if (a.includes('brand'))      return ACTION_META.brand;
  if (a.includes('blog'))       return ACTION_META.blog;
  if (a.includes('user'))       return ACTION_META.user;
  if (a.includes('discount') || a.includes('sale')) return ACTION_META.discount;
  if (a.includes('inquiry') || a.includes('quote')) return ACTION_META.inquiry;
  return ACTION_META.default;
};

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const fetchLogs = useCallback(async (p = 1, q = '') => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/logs?page=${p}&q=${encodeURIComponent(q)}`);
      setLogs(response.data.logs || []);
      setPagination(response.data.pagination || null);
    } catch (err) {
      console.error('Error fetching logs:', err);
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(page, searchTerm); }, [page]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchLogs(1, searchTerm); }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filteredLogs = logs;

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fadeIn">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Activity Log</h1>
            <p className="text-[var(--text-muted)] mt-1 uppercase tracking-widest text-[10px] font-bold">Audit trail of all admin actions</p>
          </div>

          <button
            onClick={() => fetchLogs(page, searchTerm)}
            className="glass px-6 py-3 rounded-2xl text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all flex items-center gap-2"
          >
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Search */}
        <div className="glass p-4 rounded-3xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
            <input
              type="text"
              placeholder="Search by admin, action, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-3 pl-12 pr-4 text-[var(--text-primary)] focus:outline-none focus:border-green-500 transition-all font-medium"
            />
          </div>
        </div>

        {/* Table */}
        <div className="glass rounded-[2rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
                  <th className="px-8 py-5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Admin</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Action</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Details</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-8 py-20 text-center">
                      <div className="inline-block w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-8 py-20 text-center text-[var(--text-muted)] text-sm font-medium">
                      No activity logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const meta = getActionMeta(log.action);
                    const Icon = meta.icon;
                    const label = ACTION_LABELS[log.action] || log.action.replace(/_/g, ' ');
                    return (
                      <tr key={log.id} className="hover:bg-[var(--bg-secondary)]/30 transition-colors group">
                        {/* Admin */}
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 font-black text-sm border border-green-500/20">
                              {log.admin_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-sm text-[var(--text-primary)] group-hover:text-green-500 transition-colors">
                              {log.admin_name}
                            </span>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2.5">
                            <Icon size={15} className={meta.color} />
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${meta.badge}`}>
                              {label}
                            </span>
                          </div>
                        </td>

                        {/* Details */}
                        <td className="px-8 py-5 max-w-xs">
                          <p className="text-xs text-[var(--text-muted)] truncate" title={log.context}>
                            {log.context || '—'}
                          </p>
                        </td>

                        {/* Timestamp */}
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs">
                            <Clock size={12} />
                            {new Date(log.created_at).toLocaleString('en-GH', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {pagination && (
            <div className="px-6 py-2 border-t border-[var(--border-color)]">
              <Pagination pagination={pagination} onPageChange={p => setPage(p)} />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Logs;
