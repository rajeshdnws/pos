import { ApiResponse, LogLevel } from './common.js';
import { AppConfig } from './config.js';
import {
  AuditLog,
  ChangePasswordDTO,
  Company,
  CompanySetupDTO,
  LoginRequestDTO,
  LoginResponseDTO,
  ResetPasswordDTO,
  Role,
  Setting,
  User,
  UserCreateDTO,
  UserUpdateDTO,
} from './domain.js';
import { DatabaseHealth, SystemInfo } from './system.js';

export const IPC_CHANNELS = {
  APP_GET_CONFIG: 'app:get-config',
  SYSTEM_GET_INFO: 'system:get-info',
  DATABASE_HEALTH_CHECK: 'database:health-check',
  LOGGER_LOG: 'logger:log',
  WINDOW_CONTROL: 'window:control',

  // Authentication & Session
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_GET_CURRENT_USER: 'auth:get-current-user',
  AUTH_CHANGE_PASSWORD: 'auth:change-password',

  // Company Setup & Profile
  COMPANY_CHECK_SETUP: 'company:check-setup',
  COMPANY_GET: 'company:get',
  COMPANY_SETUP: 'company:setup',
  COMPANY_UPDATE: 'company:update',
  COMPANY_SELECT_LOGO: 'company:select-logo',

  // Users & Roles
  USERS_LIST: 'users:list',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_TOGGLE_ACTIVE: 'users:toggle-active',
  USERS_RESET_PASSWORD: 'users:reset-password',
  ROLES_GET_ALL: 'roles:get-all',

  // Settings & Audits
  SETTINGS_GET_ALL: 'settings:get-all',
  SETTINGS_UPDATE: 'settings:update',
  AUDIT_GET_LOGS: 'audit:get-logs',
} as const;

export type WindowAction = 'minimize' | 'maximize' | 'close' | 'restart';

export interface RsInventoryApi {
  // Base App & System
  getAppConfig: () => Promise<ApiResponse<AppConfig>>;
  getSystemInfo: () => Promise<ApiResponse<SystemInfo>>;
  checkDatabaseHealth: () => Promise<ApiResponse<DatabaseHealth>>;
  logMessage: (level: LogLevel, message: string, meta?: unknown) => Promise<ApiResponse<void>>;
  windowControl: (action: WindowAction) => Promise<ApiResponse<void>>;

  // Auth
  login: (credentials: LoginRequestDTO) => Promise<ApiResponse<LoginResponseDTO>>;
  logout: () => Promise<ApiResponse<void>>;
  getCurrentUser: () => Promise<ApiResponse<LoginResponseDTO | null>>;
  changePassword: (dto: ChangePasswordDTO) => Promise<ApiResponse<void>>;

  // Company
  checkCompanySetup: () => Promise<ApiResponse<{ isSetup: boolean; company?: Company | null }>>;
  getCompany: () => Promise<ApiResponse<Company | null>>;
  setupCompany: (dto: CompanySetupDTO) => Promise<ApiResponse<LoginResponseDTO>>;
  updateCompany: (dto: Partial<Company>) => Promise<ApiResponse<Company>>;
  selectCompanyLogo: () => Promise<ApiResponse<string | null>>;

  // Users
  listUsers: () => Promise<ApiResponse<User[]>>;
  createUser: (dto: UserCreateDTO) => Promise<ApiResponse<User>>;
  updateUser: (id: string, dto: UserUpdateDTO) => Promise<ApiResponse<User>>;
  toggleUserActive: (id: string) => Promise<ApiResponse<User>>;
  resetUserPassword: (dto: ResetPasswordDTO) => Promise<ApiResponse<void>>;
  getRoles: () => Promise<ApiResponse<Role[]>>;

  // Settings & Audits
  getSettings: () => Promise<ApiResponse<Record<string, string>>>;
  updateSettings: (settingsMap: Record<string, string>) => Promise<ApiResponse<Setting[]>>;
  getAuditLogs: (limit?: number) => Promise<ApiResponse<AuditLog[]>>;
}

declare global {
  interface Window {
    rsInventory: RsInventoryApi;
  }
}
