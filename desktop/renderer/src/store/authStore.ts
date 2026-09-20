import { create } from 'zustand';
import { Company, LoginRequestDTO, User } from '@rs-inventory/types';

interface AuthState {
  currentUser: User | null;
  company: Company | null;
  sessionToken: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  isSetup: boolean;
  isLoading: boolean;

  checkAuth: () => Promise<{ isSetup: boolean; isAuthenticated: boolean }>;
  login: (credentials: LoginRequestDTO) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasPermission: (permissionCode: string) => boolean;
  updateCurrentUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  company: null,
  sessionToken: null,
  permissions: [],
  isAuthenticated: false,
  isSetup: true,
  isLoading: true,

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        // 1. Check if company setup has been completed
        const setupRes = await window.rsInventory.checkCompanySetup();
        const isSetup = Boolean(setupRes.success && setupRes.data?.isSetup);

        if (!isSetup) {
          set({ isSetup: false, isAuthenticated: false, currentUser: null, isLoading: false });
          return { isSetup: false, isAuthenticated: false };
        }

        // 2. Check current active session
        const sessionRes = await window.rsInventory.getCurrentUser();
        if (sessionRes.success && sessionRes.data) {
          const { user, sessionToken, permissions, company } = sessionRes.data;
          set({
            currentUser: user,
            sessionToken,
            permissions,
            company,
            isSetup: true,
            isAuthenticated: true,
            isLoading: false,
          });
          return { isSetup: true, isAuthenticated: true };
        }

        set({
          isSetup: true,
          isAuthenticated: false,
          currentUser: null,
          sessionToken: null,
          permissions: [],
          isLoading: false,
        });
        return { isSetup: true, isAuthenticated: false };
      }

      // Fallback for browser mock/testing
      set({ isSetup: true, isAuthenticated: true, isLoading: false });
      return { isSetup: true, isAuthenticated: true };
    } catch {
      set({ isLoading: false });
      return { isSetup: false, isAuthenticated: false };
    }
  },

  login: async (credentials: LoginRequestDTO) => {
    set({ isLoading: true });
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.login(credentials);
        if (res.success && res.data) {
          const { user, sessionToken, permissions, company } = res.data;
          set({
            currentUser: user,
            sessionToken,
            permissions,
            company,
            isAuthenticated: true,
            isSetup: true,
            isLoading: false,
          });
          return { success: true };
        }
        set({ isLoading: false });
        return { success: false, error: res.error?.message || 'Invalid username or password.' };
      }
      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, error: (err as Error).message || 'Unable to connect to service.' };
    }
  },

  logout: async () => {
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        await window.rsInventory.logout();
      }
    } finally {
      set({
        currentUser: null,
        sessionToken: null,
        permissions: [],
        isAuthenticated: false,
      });
    }
  },

  hasPermission: (permissionCode: string) => {
    const { permissions, currentUser } = get();
    // System Administrator or Admin role has unconditional full access to all features
    const roleName = currentUser?.role?.name?.toUpperCase();
    if (
      roleName === 'ADMINISTRATOR' ||
      roleName === 'ADMIN' ||
      (currentUser?.role?.isSystemRole && roleName?.includes('ADMIN')) ||
      permissions.includes('*')
    ) {
      return true;
    }
    return permissions.includes(permissionCode);
  },

  updateCurrentUser: (userUpdates: Partial<User>) => {
    const { currentUser } = get();
    if (currentUser) {
      set({ currentUser: { ...currentUser, ...userUpdates } });
    }
  },
}));
