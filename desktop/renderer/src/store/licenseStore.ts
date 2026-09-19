import { create } from 'zustand';
import { ActivationRequestDTO, LicenseStatusDTO } from '@rs-inventory/types';

interface LicenseState {
  status: LicenseStatusDTO | null;
  isLoading: boolean;
  isActionLoading: boolean;
  error: string | null;
  successMessage: string | null;

  fetchStatus: () => Promise<void>;
  generateRequest: (customerName?: string) => Promise<ActivationRequestDTO | null>;
  exportRequest: (customerName?: string) => Promise<{ filePath: string; fileName: string } | null>;
  chooseFile: () => Promise<string | null>;
  importLicenseFile: (filePath?: string) => Promise<boolean>;
  activateContent: (content: string) => Promise<boolean>;
  deactivateLicense: () => Promise<boolean>;
  clearMessages: () => void;
}

export const useLicenseStore = create<LicenseState>((set, get) => ({
  status: null,
  isLoading: false,
  isActionLoading: false,
  error: null,
  successMessage: null,

  clearMessages: () => set({ error: null, successMessage: null }),

  fetchStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      if (window.rsInventory && window.rsInventory.getLicenseStatus) {
        const res = await window.rsInventory.getLicenseStatus();
        if (res.success && res.data) {
          set({ status: res.data, isLoading: false });
          return;
        }
        set({
          error: res.error?.message || 'Failed to retrieve license status.',
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      set({
        error: err?.message || 'Error communicating with licensing service.',
        isLoading: false,
      });
    }
  },

  generateRequest: async (customerName?: string) => {
    set({ isActionLoading: true, error: null });
    try {
      const res = await window.rsInventory.generateActivationRequest(customerName);
      set({ isActionLoading: false });
      if (res.success && res.data) {
        return res.data;
      }
      set({ error: res.error?.message || 'Failed to generate activation request.' });
      return null;
    } catch (err: any) {
      set({ isActionLoading: false, error: err?.message || 'Activation request generation failed.' });
      return null;
    }
  },

  exportRequest: async (customerName?: string) => {
    set({ isActionLoading: true, error: null });
    try {
      const res = await window.rsInventory.exportActivationRequest(customerName);
      set({ isActionLoading: false });
      if (res.success && res.data) {
        set({ successMessage: `Activation request successfully exported to: ${res.data.fileName}` });
        return res.data;
      }
      set({ error: res.error?.message || 'Failed to export activation request.' });
      return null;
    } catch (err: any) {
      set({ isActionLoading: false, error: err?.message || 'Activation request export failed.' });
      return null;
    }
  },

  chooseFile: async () => {
    try {
      const res = await window.rsInventory.chooseLicenseFile();
      return res.success && res.data ? res.data : null;
    } catch {
      return null;
    }
  },

  importLicenseFile: async (filePath?: string) => {
    set({ isActionLoading: true, error: null, successMessage: null });
    try {
      const res = await window.rsInventory.importLicenseFile(filePath);
      set({ isActionLoading: false });
      if (res.success && res.data) {
        set({
          status: res.data,
          successMessage: 'License successfully validated and activated on this machine!',
        });
        return true;
      }
      set({ error: res.error?.message || 'License activation failed.' });
      return false;
    } catch (err: any) {
      set({ isActionLoading: false, error: err?.message || 'Failed to import license file.' });
      return false;
    }
  },

  activateContent: async (content: string) => {
    set({ isActionLoading: true, error: null, successMessage: null });
    try {
      const res = await window.rsInventory.activateLicenseContent(content);
      set({ isActionLoading: false });
      if (res.success && res.data) {
        set({
          status: res.data,
          successMessage: 'License successfully validated and activated on this machine!',
        });
        return true;
      }
      set({ error: res.error?.message || 'License activation failed.' });
      return false;
    } catch (err: any) {
      set({ isActionLoading: false, error: err?.message || 'Failed to activate license certificate.' });
      return false;
    }
  },

  deactivateLicense: async () => {
    set({ isActionLoading: true, error: null, successMessage: null });
    try {
      const res = await window.rsInventory.deactivateLicense();
      set({ isActionLoading: false });
      if (res.success) {
        set({ successMessage: 'License deactivated successfully from this machine.' });
        await get().fetchStatus();
        return true;
      }
      set({ error: res.error?.message || 'Failed to deactivate license.' });
      return false;
    } catch (err: any) {
      set({ isActionLoading: false, error: err?.message || 'License deactivation failed.' });
      return false;
    }
  },
}));
