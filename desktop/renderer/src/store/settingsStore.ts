import { create } from 'zustand';

export interface AppSettingsMap {
  theme: string;
  dateFormat: string;
  currency: string;
  currencySymbol: string;
  decimalPrecision: string;
  autoBackupOnClose: string;
  lowStockThresholdDefault: string;
  invoicePrintFormat: string;
  thermalPaperSize: string;
}

const DEFAULT_SETTINGS: AppSettingsMap = {
  theme: 'dark',
  dateFormat: 'DD/MM/YYYY',
  currency: 'INR',
  currencySymbol: '₹',
  decimalPrecision: '2',
  autoBackupOnClose: 'true',
  lowStockThresholdDefault: '10',
  invoicePrintFormat: 'thermal',
  thermalPaperSize: '80mm',
};

interface SettingsState {
  settings: AppSettingsMap;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (
    updates: Partial<AppSettingsMap>,
  ) => Promise<{ success: boolean; error?: string }>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.getSettings();
        if (res.success && res.data) {
          set({ settings: { ...DEFAULT_SETTINGS, ...res.data }, isLoading: false });
          return;
        }
      }
      set({ isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  updateSettings: async (updates: Partial<AppSettingsMap>) => {
    try {
      const current = get().settings;
      const merged = { ...current, ...updates };

      if (typeof window !== 'undefined' && window.rsInventory) {
        const stringUpdates: Record<string, string> = {};
        for (const [k, v] of Object.entries(updates)) {
          stringUpdates[k] = String(v);
        }
        const res = await window.rsInventory.updateSettings(stringUpdates);
        if (res.success) {
          set({ settings: merged });
          return { success: true };
        }
        return { success: false, error: res.error?.message || 'Failed to save settings.' };
      }
      set({ settings: merged });
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
}));
