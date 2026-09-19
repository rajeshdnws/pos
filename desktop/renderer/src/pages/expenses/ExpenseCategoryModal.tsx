import React, { useState, useEffect } from 'react';
import { ExpenseCategory, ExpenseCategoryCreateDTO, ExpenseCategoryUpdateDTO } from '@rs-inventory/types';
import { X, Loader2, AlertCircle } from 'lucide-react';

interface ExpenseCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  categoryToEdit?: ExpenseCategory | null;
}

export const ExpenseCategoryModal: React.FC<ExpenseCategoryModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  categoryToEdit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setDescription(categoryToEdit.description || '');
      setIsActive(categoryToEdit.isActive);
    } else {
      setName('');
      setDescription('');
      setIsActive(true);
    }
    setError(null);
  }, [categoryToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (categoryToEdit) {
        const updateDto: ExpenseCategoryUpdateDTO = {
          name: name.trim(),
          description: description.trim() || null,
          isActive,
        };
        const res = await window.rsInventory.updateExpenseCategory(categoryToEdit.id, updateDto);
        if (!res.success) throw new Error(res.error?.message || 'Failed to update category.');
      } else {
        const createDto: ExpenseCategoryCreateDTO = {
          name: name.trim(),
          description: description.trim() || null,
        };
        const res = await window.rsInventory.createExpenseCategory(createDto);
        if (!res.success) throw new Error(res.error?.message || 'Failed to create category.');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface-900 border border-surface-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/40">
          <h3 className="text-base font-semibold text-white">
            {categoryToEdit ? 'Edit Expense Category' : 'New Expense Category'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Category Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Office Stationery, Electricity, Delivery, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="Brief description of expenses tracked under this category"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          {categoryToEdit && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="catActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded bg-surface-950 border-surface-700 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="catActive" className="text-xs text-slate-300 select-none">
                Category is Active (Active categories can be selected when recording new expenses)
              </label>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-surface-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 text-white hover:bg-brand-500 transition flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {categoryToEdit ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
