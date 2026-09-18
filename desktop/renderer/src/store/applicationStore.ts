import { create } from 'zustand';
import { AppConfig, DatabaseHealth, SystemInfo } from '@rs-inventory/types';

interface ApplicationState {
  config: AppConfig | null;
  systemInfo: SystemInfo | null;
  databaseHealth: DatabaseHealth | null;
  isLoading: boolean;
  isOffline: boolean;
  setConfig: (config: AppConfig) => void;
  setSystemInfo: (info: SystemInfo) => void;
  setDatabaseHealth: (health: DatabaseHealth) => void;
  setLoading: (loading: boolean) => void;
  fetchInitialData: () => Promise<void>;
}

export const useApplicationStore = create<ApplicationState>((set) => ({
  config: null,
  systemInfo: null,
  databaseHealth: null,
  isLoading: true,
  isOffline: true, // Offline-first Solo design

  setConfig: (config) => set({ config }),
  setSystemInfo: (systemInfo) => set({ systemInfo }),
  setDatabaseHealth: (databaseHealth) => set({ databaseHealth }),
  setLoading: (isLoading) => set({ isLoading }),

  fetchInitialData: async () => {
    set({ isLoading: true });
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const [configRes, systemRes, dbRes] = await Promise.all([
          window.rsInventory.getAppConfig(),
          window.rsInventory.getSystemInfo(),
          window.rsInventory.checkDatabaseHealth(),
        ]);

        set({
          config: configRes.success && configRes.data ? configRes.data : null,
          systemInfo: systemRes.success && systemRes.data ? systemRes.data : null,
          databaseHealth: dbRes.success && dbRes.data ? dbRes.data : null,
          isLoading: false,
        });
      } else {
        // Fallback for browser testing when electron IPC is not loaded
        set({
          config: {
            appName: 'RS Inventory',
            appVersion: '1.0.0',
            environment: 'development',
            databasePath: '%APPDATA%/RS Inventory/database/rs_inventory.db',
            backupPath: '%APPDATA%/RS Inventory/backups',
            logPath: '%APPDATA%/RS Inventory/logs/application.log',
            exportPath: '%APPDATA%/RS Inventory/exports',
            logLevel: 'DEBUG',
          },
          systemInfo: {
            platform: 'win32',
            arch: 'x64',
            osVersion: 'Windows 11',
            nodeVersion: '22.0.0',
            electronVersion: '34.0.0',
            uptimeSeconds: 120,
            memoryUsageMb: 85,
          },
          databaseHealth: {
            status: 'connected',
            latencyMs: 3,
            databasePath: '%APPDATA%/RS Inventory/database/rs_inventory.db',
            tableCount: 21,
            timestamp: new Date().toISOString(),
          },
          isLoading: false,
        });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
