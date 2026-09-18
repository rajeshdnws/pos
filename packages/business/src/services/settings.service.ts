import { PrismaClient } from '@prisma/client';
import { Setting } from '@rs-inventory/types';

export const DEFAULT_APP_SETTINGS: Record<string, string> = {
  theme: 'dark',
  dateFormat: 'DD/MM/YYYY',
  currency: 'INR',
  currencySymbol: '₹',
  decimalPrecision: '2',
  autoBackupOnClose: 'true',
  lowStockThresholdDefault: '10',
  invoicePrintFormat: 'thermal', // thermal | standard_a4
  thermalPaperSize: '80mm', // 58mm | 80mm
};

export class SettingsService {
  constructor(private readonly prisma: PrismaClient) {}

  public async getSettings(companyId: string): Promise<Record<string, string>> {
    const records = await this.prisma.setting.findMany({
      where: { companyId },
    });

    const settingsMap: Record<string, string> = { ...DEFAULT_APP_SETTINGS };
    for (const record of records) {
      settingsMap[record.key] = record.value;
    }
    return settingsMap;
  }

  public async updateSettings(
    companyId: string,
    updates: Record<string, string>,
  ): Promise<Setting[]> {
    const updatedSettings: Setting[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(updates)) {
        const item = await tx.setting.upsert({
          where: {
            companyId_key: {
              companyId,
              key,
            },
          },
          update: {
            value: String(value),
          },
          create: {
            companyId,
            key,
            value: String(value),
            type: 'STRING',
          },
        });
        updatedSettings.push(item as unknown as Setting);
      }
    });

    return updatedSettings;
  }
}
