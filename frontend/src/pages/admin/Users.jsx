import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/admin/Pagination';
import api from '../../api';
import AdminLayout from '../../components/admin/AdminLayout';
import { useRole } from '../../utils/permissions';
import {
  Users as UsersIcon,
  Search,
  Trash2,
  Shield,
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Edit,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';
import ConfirmModal from '../../components/admin/ConfirmModal';

const EditUserModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    email: user.email,
    role: user.role || 'admin',
    status: user.status || 'active'
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await onSave(user.id, formData);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="glass w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-scaleIn"
           style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight uppercase">Edit User</h2>
              <p className="text-[10px] text-[var(--text-muted)] font-bold tracking-[0.2em] mt-1 uppercase">MODIFYING UID-{user.id}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[var(--bg-secondary)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Email Address</label>
              <input
                type="email" required
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Role</label>
                <select
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm appearance-none"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="admin">Admin</option>
                  <option value="sub-admin">Sub-Admin</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Status</label>
                <select
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm appearance-none"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-all uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all uppercase tracking-widest shadow-lg shadow-green-500/20"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const Users = () => {
  const navigate = useNavigate();
  const { can } = useRole();
  useEffect(() => { if (!can('manageUsers')) navigate('/admin', { replace: true }); }, []);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [confirm, setConfirm] = useState({ show: false, title: '', message: '', onConfirm: null });

  const fetchUsers = useCallback(async (p = 1, q = '') => {
    try {
      setLoading(true);
      const response = await api.get(`/auth/users?page=${p}&q=${encodeURIComponent(q)}`);
      setUsers(response.data.users || []);
      setPagination(response.data.pagination || null);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(page, searchTerm); }, [page]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchUsers(1, searchTerm); }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const handleUpdate = async (id, userData) => {
    try {
      await api.put(`/admin/users/${id}`, userData);
      toast.success('User updated successfully');
      fetchUsers(page, searchTerm);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update user');
      throw err;
    }
  };

  const handleDelete = (id) => {
    setConfirm({
      show: true,
      title: 'Delete User',
      message: 'This user account will be permanently removed. This action cannot be undone.',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/users/${id}`);
          toast.success('User deleted');
          fetchUsers(page, searchTerm);
        } catch (err) {
          toast.error('Failed to delete user');
        }
      }
    });
  };

  const filteredUsers = users;

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] leading-tight">User Management</h1>
            <p className="text-[var(--text-muted)] mt-1 uppercase tracking-widest text-[10px] font-bold text-yellow-500">CONTROL UNIT PRIVILEGES</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass px-6 py-3 rounded-2xl flex items-center gap-4">
              <UsersIcon className="text-green-500" size={20} />
              <span className="text-[var(--text-primary)] font-bold">{pagination?.total ?? users.length} Total Registered</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-4 pl-12 pr-4 text-[var(--text-primary)] focus:outline-none focus:border-green-500 transition-all font-medium"
          />
        </div>

        {/* Table */}
        <div className="glass rounded-[2rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--bg-secondary)] text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-black border-b border-[var(--border-color)]">
                  <th className="px-8 py-5">User</th>
                  <th className="px-8 py-5">Contact</th>
                  <th className="px-8 py-5">Role</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5">Registered</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-8 py-20 text-center">
                      <div className="flex justify-center">
                        <div className="w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-8 py-20 text-center text-[var(--text-muted)] italic">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-green-500/20 to-yellow-500/20 flex items-center justify-center text-green-500 border border-green-500/20">
                            <UserIcon size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-[var(--text-primary)] tracking-tight">{user.full_name || 'Unnamed User'}</p>
                            <p className="text-[10px] text-[var(--text-muted)] font-black tracking-widest mt-0.5">UID-{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] font-medium">
                            <Mail size={14} className="text-[var(--text-muted)]" />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                              <Phone size={14} />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <Shield size={16} className={user.role === 'admin' ? 'text-yellow-500' : user.role === 'sub-admin' ? 'text-purple-500' : 'text-blue-500'} />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'text-yellow-500' : user.role === 'sub-admin' ? 'text-purple-500' : 'text-blue-500'}`}>
                            {user.role}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          {user.status === 'active' ? (
                            <>
                              <CheckCircle size={14} className="text-green-500" />
                              <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={14} className="text-red-500" />
                              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Suspended</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium">
                          <Calendar size={14} />
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user.role !== 'admin' ? (
                            <>
                              <button
                                onClick={() => setEditingUser(user)}
                                className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(user.id)}
                                className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest bg-[var(--bg-secondary)] px-3 py-1 rounded-full border border-[var(--border-color)]">
                              SYSTEM
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
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

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleUpdate}
        />
      )}
      <ConfirmModal
        isOpen={confirm.show}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onClose={() => setConfirm({ show: false, title: '', message: '', onConfirm: null })}
      />
    </AdminLayout>
  );
};

export default Users;
