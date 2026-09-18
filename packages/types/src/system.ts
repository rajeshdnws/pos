export interface SystemInfo {
  platform: string;
  arch: string;
  osVersion: string;
  nodeVersion: string;
  electronVersion: string;
  uptimeSeconds: number;
  memoryUsageMb: number;
}

export type DatabaseConnectionStatus = 'connected' | 'disconnected' | 'error';

export interface DatabaseHealth {
  status: DatabaseConnectionStatus;
  latencyMs: number;
  databasePath: string;
  tableCount: number;
  timestamp: string;
  error?: string;
}
