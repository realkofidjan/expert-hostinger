import React, { useState, useEffect } from 'react';
import api from '../../api';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Plus, Trash2, Search, Layers, ChevronRight, FolderTree, AlertCircle, Tag, ChevronDown, Edit
} from 'lucide-react';
import { toast } from 'react-toastify';
import ConfirmModal from '../../components/admin/ConfirmModal';
import { useRole } from '../../utils/permissions';

const Categories = () => {
  const { can } = useRole();
  const canManage = can('manageCategories');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newCategory, setNewCategory] = useState({
    name: '',
    parent_id: '',
    is_subcategory: false
  });
  const [editingCategory, setEditingCategory] = useState(null);
  const [confirm, setConfirm] = useState({ show: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/categories?_t=${Date.now()}`);
      setCategories(response.data);
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        const url = editingCategory.category_id
          ? `/admin/subcategories/${editingCategory.id}`
          : `/admin/categories/${editingCategory.id}`;
        await api.put(url, newCategory);
        toast.success('Updated successfully');
      } else {
        if (newCategory.parent_id) {
          await api.post('/admin/subcategories', {
            name: newCategory.name,
            category_id: newCategory.parent_id
          });
        } else {
          await api.post('/admin/categories', {
            name: newCategory.name
          });
        }
        toast.success('Created successfully');
      }
      setNewCategory({ name: '', parent_id: '', is_subcategory: false });
      setEditingCategory(null);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    }
  };

  const startEditing = (item, isSub = false) => {
    setEditingCategory(item);
    setNewCategory({
      name: item.name,
      description: item.description || '',
      parent_id: isSub ? (item.category_id || '') : '',
      is_subcategory: isSub
    });
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setNewCategory({ name: '', description: '', parent_id: '', is_subcategory: false });
  };

  const handleDeleteCategory = (id, isSub = false) => {
    setConfirm({
      show: true,
      title: isSub ? 'Delete Subcategory' : 'Delete Category',
      message: isSub
        ? 'This subcategory will be permanently removed.'
        : 'Deleting this category will also remove all its subcategories. This action cannot be undone.',
      onConfirm: async () => {
        try {
          const url = isSub ? `/admin/subcategories/${id}` : `/admin/categories/${id}`;
          await api.delete(url);
          toast.success('Deleted successfully');
          fetchCategories();
        } catch (err) {
          toast.error('Delete failed');
        }
      }
    });
  };

  return (
    <AdminLayout>
      <div className="h-full flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Product Categories</h1>
            <p className="text-[var(--text-muted)] mt-1 uppercase tracking-widest text-[10px] font-bold text-yellow-500">EXPERT OFFICE HIERARCHY</p>
          </div>
        </div>

        <div className={`flex-1 grid grid-cols-1 ${canManage ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6 overflow-hidden`}>
          <div className="lg:col-span-2 flex flex-col h-full space-y-4">
            <div className="flex-1 glass rounded-[2rem] overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                {categories.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-50">
                    <FolderTree size={48} className="mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">No categories defined yet</p>
                  </div>
                ) : (
                  categories.map((parent) => (
                    <div key={parent.id} className="group">
                      <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] rounded-2xl hover:border-green-500/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                            <Layers size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-[var(--text-primary)] text-sm">{parent.name}</p>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">{parent.subcategories?.length || 0} Subcategories</p>
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => startEditing(parent, false)} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleDeleteCategory(parent.id, false)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="ml-14 mt-2 space-y-2 border-l-2 border-[var(--border-color)] pl-4">
                        {(parent.subcategories || []).map((child) => (
                          <div key={child.id} className="flex items-center justify-between p-3 bg-[var(--bg-secondary)]/20 border border-transparent hover:border-[var(--border-color)] rounded-xl transition-all group/sub">
                            <p className="text-xs font-medium text-[var(--text-secondary)] transition-colors">{child.name}</p>
                            {canManage && (
                              <div className="flex items-center gap-1">
                                <button onClick={() => startEditing(child, true)} className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                                  <Edit size={14} />
                                </button>
                                <button onClick={() => handleDeleteCategory(child.id, true)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {canManage && <div className="flex flex-col h-full space-y-4 overflow-hidden">
            <div className="glass rounded-[2rem] p-6 flex flex-col flex-1 shadow-2xl">
              <div className="flex items-center gap-3 mb-8 shrink-0">
                <div className={`w-8 h-8 rounded-lg ${editingCategory ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'} flex items-center justify-center`}>
                  {editingCategory ? <Edit size={18} /> : <Plus size={18} />}
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight leading-none">{editingCategory ? 'Edit Category' : 'New Category'}</h2>
              </div>

              <form onSubmit={handleCreateCategory} className="flex-1 flex flex-col justify-between overflow-hidden">
                <div className="overflow-y-auto custom-scrollbar pr-2 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Category Name *</label>
                    <input required type="text" className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} />
                  </div>

                  {!editingCategory && (
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2 text-yellow-500">Parent Category</label>
                      <select className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none focus:border-green-500 text-sm appearance-none" value={newCategory.parent_id} onChange={(e) => setNewCategory({ ...newCategory, parent_id: e.target.value })}>
                        <option value="">None (Top Level)</option>
                        {categories.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 mt-8">
                  <button type="submit" className={`w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all border border-[var(--border-color)] uppercase tracking-[0.2em] shrink-0 ${editingCategory ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20' : 'bg-green-600 hover:bg-green-500 shadow-green-500/20'} text-white`}>
                    {editingCategory ? 'Update Entry' : 'Save Entry'}
                  </button>
                  {editingCategory && <button type="button" onClick={cancelEdit} className="w-full py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all">Cancel</button>}
                </div>
              </form>
            </div>
          </div>}
        </div>
      </div>
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

export default Categories;
