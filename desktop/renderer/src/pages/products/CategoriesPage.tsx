import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle,
  Edit2,
  FolderPlus,
  Layers,
  Loader2,
  Plus,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import { Category, CategoryCreateDTO } from '@rs-inventory/types';
import { useNotificationStore } from '../../store/notificationStore';

export const CategoriesPage: React.FC = () => {
  const { notify } = useNotificationStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [formData, setFormData] = useState<CategoryCreateDTO>({
    name: '',
    description: '',
    isActive: true,
  });
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.listCategories(true);
        if (res.success && res.data) {
          setCategories(res.data);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', isActive: true });
    setModalError(null);
    setShowModal(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      description: cat.description || '',
      isActive: cat.isActive,
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.name.trim()) {
      setModalError('Category name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        let res;
        if (editingCategory) {
          res = await window.rsInventory.updateCategory(editingCategory.id, formData);
        } else {
          res = await window.rsInventory.createCategory(formData);
        }

        if (res.success) {
          notify(
            'success',
            `Category '${formData.name}' ${editingCategory ? 'updated' : 'created'} successfully.`,
          );
          setShowModal(false);
          fetchCategories();
        } else {
          setModalError(res.error?.message || 'Failed to save category.');
        }
      }
    } catch (err) {
      setModalError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (cat: Category) => {
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.toggleCategoryActive(cat.id);
        if (res.success) {
          notify(
            'success',
            `Category '${cat.name}' ${res.data?.isActive ? 'activated' : 'deactivated'}.`,
          );
          fetchCategories();
        } else {
          notify('error', res.error?.message || 'Failed to toggle status.');
        }
      }
    } catch (err) {
      notify('error', (err as Error).message);
    }
  };

  const filteredCategories = categories.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-950 border border-surface-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500"
          />
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-500 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Categories Table */}
      <div className="rounded-2xl bg-surface-900/70 border border-surface-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-950/80 border-b border-surface-800 text-slate-400 font-medium">
              <tr>
                <th className="px-5 py-3.5">Category Name</th>
                <th className="px-4 py-3.5">Description</th>
                <th className="px-4 py-3.5">Products Linked</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Created Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60">
              {isLoading && categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-brand-500" />
                    Loading categories...
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    <Layers className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                    <div className="font-semibold text-slate-300">No categories found</div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {searchQuery
                        ? 'Try adjusting your search query'
                        : 'Create your first product category to organize your inventory'}
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={openAddModal}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-500 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Category</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => {
                  const productCount = cat._count?.products || 0;
                  return (
                    <tr key={cat.id} className="hover:bg-surface-800/30 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-white">{cat.name}</td>
                      <td className="px-4 py-3.5 text-slate-400 max-w-xs truncate">
                        {cat.description || '-'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-surface-800 text-slate-300 border border-surface-700">
                          {productCount} {productCount === 1 ? 'item' : 'items'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            cat.isActive
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${cat.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`}
                          />
                          <span>{cat.isActive ? 'Active' : 'Inactive'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                        {new Date(cat.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition-colors"
                          title="Edit Category"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(cat)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            cat.isActive
                              ? 'text-rose-400 hover:bg-rose-500/10'
                              : 'text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                          title={cat.isActive ? 'Deactivate Category' : 'Activate Category'}
                        >
                          {cat.isActive ? (
                            <XCircle className="h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-surface-800">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-brand-400" />
                <span>{editingCategory ? 'Edit Category' : 'Add New Category'}</span>
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Category Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Cold Drinks, Groceries, Electronics"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 focus:outline-none focus:border-brand-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Description / Notes (Optional)
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Brief description of product group..."
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              <div className="pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.isActive)}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded bg-surface-950 border-surface-700 text-brand-600 focus:ring-0"
                  />
                  <span className="text-slate-300 font-medium">Category Active</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-surface-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-800 text-slate-300 hover:bg-surface-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-semibold shadow-lg shadow-brand-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>{editingCategory ? 'Save Changes' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
