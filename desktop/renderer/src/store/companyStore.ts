import { create } from 'zustand';
import { Company } from '@rs-inventory/types';

interface CompanyState {
  company: Company | null;
  isLoading: boolean;
  fetchCompany: () => Promise<void>;
  updateCompany: (dto: Partial<Company>) => Promise<{ success: boolean; error?: string }>;
}

export const useCompanyStore = create<CompanyState>((set) => ({
  company: null,
  isLoading: false,

  fetchCompany: async () => {
    set({ isLoading: true });
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.getCompany();
        if (res.success && res.data) {
          set({ company: res.data, isLoading: false });
          return;
        }
      }
      set({ isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  updateCompany: async (dto: Partial<Company>) => {
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.updateCompany(dto);
        if (res.success && res.data) {
          set({ company: res.data });
          return { success: true };
        }
        return { success: false, error: res.error?.message || 'Failed to update company.' };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
}));
