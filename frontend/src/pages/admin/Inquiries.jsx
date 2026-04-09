import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Search, MessageSquare, CheckCircle, Clock, User, Mail, Phone, Calendar, AlertCircle, Eye, RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';
import Pagination from '../../components/admin/Pagination';

const Inquiries = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const fetchInquiries = useCallback(async (p = page, q = searchQuery) => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/inquiries?page=${p}&q=${encodeURIComponent(q)}`);
      setInquiries(response.data.inquiries || []);
      setPagination(response.data.pagination || null);
    } catch (err) {
      toast.error('Failed to fetch inquiries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInquiries(page, searchQuery); }, [page]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchInquiries(1, searchQuery); }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const updateInquiryStatus = async (id, newStatus) => {
    try {
      await api.patch(`/admin/inquiries/${id}/status`, { status: newStatus });
      toast.success(`Inquiry updated to ${newStatus}`);
      fetchInquiries(page, searchQuery);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const filteredInquiries = inquiries;

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Customer Inquiries</h1>
            <p className="text-[var(--text-muted)] mt-1">Manage support requests and questions</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
              <input 
                type="text"
                placeholder="Search inquiries..."
                className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-2 pl-10 pr-4 text-sm focus:border-green-500 focus:ring-0 w-64 text-[var(--text-primary)]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Inquiry Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-full py-20 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[var(--text-muted)]">Loading inquiries...</p>
              </div>
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="col-span-full py-20 text-center glass rounded-3xl overflow-hidden">
              <p className="text-[var(--text-muted)]">No inquiries found.</p>
            </div>
          ) : (
            filteredInquiries.map((iq) => (
              <div key={iq.id} className="glass p-6 rounded-3xl flex flex-col group hover:border-green-500/30 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500/20 to-yellow-500/20 border border-green-500/20 flex items-center justify-center text-green-500">
                      <User size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--text-primary)]">{iq.customer_name}</h3>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-1">
                        <Calendar size={12} />
                        {new Date(iq.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border
                    ${iq.status === 'contacted' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                      iq.status === 'reviewed' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                      'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>
                    {iq.status}
                  </span>
                </div>

                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Mail size={14} className="text-[var(--text-muted)]" />
                    {iq.customer_email}
                  </div>
                  {iq.customer_phone && (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Phone size={14} className="text-[var(--text-muted)]" />
                      {iq.customer_phone}
                    </div>
                  )}
                  <div className="p-4 bg-[var(--bg-secondary)]/50 rounded-2xl border border-[var(--border-color)] mt-4">
                    <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed font-medium">
                      "{iq.details}"
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                  {iq.status === 'pending' ? (
                    <button 
                      onClick={() => updateInquiryStatus(iq.id, 'reviewed')}
                      className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                    >
                      <RefreshCw size={14} /> Mark Reviewed
                    </button>
                  ) : iq.status === 'reviewed' ? (
                    <button 
                      onClick={() => updateInquiryStatus(iq.id, 'contacted')}
                      className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-[#0f172a] rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                    >
                      <CheckCircle size={14} /> Mark Contacted
                    </button>
                  ) : (
                    <button 
                       onClick={() => updateInquiryStatus(iq.id, 'pending')}
                       className="px-4 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                    >
                      <Clock size={14} /> Reset to Pending
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        {pagination && (
          <div className="glass px-4 rounded-2xl">
            <Pagination pagination={pagination} onPageChange={p => setPage(p)} />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Inquiries;
