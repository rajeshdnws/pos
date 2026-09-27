export type Environment = 'development' | 'test' | 'production';

export interface AppConfig {
  appName: string;
  appVersion: string;
  appEdition?: string;
  environment: Environment;
  databasePath: string;
  backupPath: string;
  logPath: string;
  exportPath: string;
  logLevel: string;
}
