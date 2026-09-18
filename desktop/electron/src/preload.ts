import {
  ApiResponse,
  AppConfig,
  AuditLog,
  ChangePasswordDTO,
  Company,
  CompanySetupDTO,
  DatabaseHealth,
  IPC_CHANNELS,
  LogLevel,
  LoginRequestDTO,
  LoginResponseDTO,
  ResetPasswordDTO,
  Role,
  RsInventoryApi,
  Setting,
  SystemInfo,
  User,
  UserCreateDTO,
  UserUpdateDTO,
  WindowAction,
} from '@rs-inventory/types';
import { contextBridge, ipcRenderer } from 'electron';

const api: RsInventoryApi = {
  // Base App & System
  getAppConfig: async (): Promise<ApiResponse<AppConfig>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.APP_GET_CONFIG);
  },

  getSystemInfo: async (): Promise<ApiResponse<SystemInfo>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_INFO);
  },

  checkDatabaseHealth: async (): Promise<ApiResponse<DatabaseHealth>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DATABASE_HEALTH_CHECK);
  },

  logMessage: async (
    level: LogLevel,
    message: string,
    meta?: unknown,
  ): Promise<ApiResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOGGER_LOG, { level, message, meta });
  },

  windowControl: async (action: WindowAction): Promise<ApiResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CONTROL, action);
  },

  // Auth
  login: async (credentials: LoginRequestDTO): Promise<ApiResponse<LoginResponseDTO>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, credentials);
  },

  logout: async (): Promise<ApiResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT);
  },

  getCurrentUser: async (): Promise<ApiResponse<LoginResponseDTO | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_CURRENT_USER);
  },

  changePassword: async (dto: ChangePasswordDTO): Promise<ApiResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUTH_CHANGE_PASSWORD, dto);
  },

  // Company
  checkCompanySetup: async (): Promise<
    ApiResponse<{ isSetup: boolean; company?: Company | null }>
  > => {
    return ipcRenderer.invoke(IPC_CHANNELS.COMPANY_CHECK_SETUP);
  },

  getCompany: async (): Promise<ApiResponse<Company | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.COMPANY_GET);
  },

  setupCompany: async (dto: CompanySetupDTO): Promise<ApiResponse<LoginResponseDTO>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.COMPANY_SETUP, dto);
  },

  updateCompany: async (dto: Partial<Company>): Promise<ApiResponse<Company>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.COMPANY_UPDATE, dto);
  },

  selectCompanyLogo: async (): Promise<ApiResponse<string | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.COMPANY_SELECT_LOGO);
  },

  // Users
  listUsers: async (): Promise<ApiResponse<User[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.USERS_LIST);
  },

  createUser: async (dto: UserCreateDTO): Promise<ApiResponse<User>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.USERS_CREATE, dto);
  },

  updateUser: async (id: string, dto: UserUpdateDTO): Promise<ApiResponse<User>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.USERS_UPDATE, { id, dto });
  },

  toggleUserActive: async (id: string): Promise<ApiResponse<User>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.USERS_TOGGLE_ACTIVE, id);
  },

  resetUserPassword: async (dto: ResetPasswordDTO): Promise<ApiResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.USERS_RESET_PASSWORD, dto);
  },

  getRoles: async (): Promise<ApiResponse<Role[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ROLES_GET_ALL);
  },

  // Settings & Audits
  getSettings: async (): Promise<ApiResponse<Record<string, string>>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL);
  },

  updateSettings: async (settingsMap: Record<string, string>): Promise<ApiResponse<Setting[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, settingsMap);
  },

  getAuditLogs: async (limit?: number): Promise<ApiResponse<AuditLog[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUDIT_GET_LOGS, limit);
  },
};

// Expose safe, strictly typed API to renderer via contextBridge
contextBridge.exposeInMainWorld('rsInventory', api);
