import { describe, it, expect } from 'vitest';
import { CurrencyService } from '../../packages/business/src/utils/currency';
import { DateTimeService } from '../../packages/business/src/utils/datetime';

describe('Currency & DateTime Service Unit Tests', () => {
  describe('CurrencyService', () => {
    it('should format amounts using the Indian numbering system', () => {
      expect(CurrencyService.format(150000)).toBe('₹1,50,000.00');
      expect(CurrencyService.format(10000000)).toBe('₹1,00,00,000.00'); // 1 crore
      expect(CurrencyService.format(1234.56)).toBe('₹1,234.56');
      expect(CurrencyService.format(0)).toBe('₹0.00');
    });

    it('should handle custom symbols', () => {
      expect(CurrencyService.format(500, 'INR ')).toBe('INR 500.00');
    });

    it('should handle invalid or null numbers gracefully', () => {
      expect(CurrencyService.format(NaN)).toBe('₹0.00');
    });
  });

  describe('DateTimeService', () => {
    it('should format dates as DD/MM/YYYY', () => {
      const date = new Date(2026, 8, 18); // Sep 18, 2026
      expect(DateTimeService.formatDate(date)).toBe('18/09/2026');
    });

    it('should format date and time as DD/MM/YYYY HH:mm', () => {
      const date = new Date(2026, 8, 18, 14, 30);
      expect(DateTimeService.formatDateTime(date)).toBe('18/09/2026 14:30');
    });

    it('should calculate Indian Financial Year (Apr 1 to Mar 31) accurately', () => {
      // Date in September 2026 -> FY 2026-27
      const sepDate = new Date(2026, 8, 18);
      const fySep = DateTimeService.getCurrentFinancialYear(sepDate);
      expect(fySep.label).toBe('2026-27');
      expect(fySep.start.getFullYear()).toBe(2026);
      expect(fySep.start.getMonth()).toBe(3); // April
      expect(fySep.start.getDate()).toBe(1);
      expect(fySep.end.getFullYear()).toBe(2027);
      expect(fySep.end.getMonth()).toBe(2); // March
      expect(fySep.end.getDate()).toBe(31);

      // Date in February 2027 -> FY 2026-27
      const febDate = new Date(2027, 1, 15);
      const fyFeb = DateTimeService.getCurrentFinancialYear(febDate);
      expect(fyFeb.label).toBe('2026-27');
      expect(fyFeb.start.getFullYear()).toBe(2026);
      expect(fyFeb.end.getFullYear()).toBe(2027);

      // Date in April 2027 -> FY 2027-28
      const aprDate = new Date(2027, 3, 1);
      const fyApr = DateTimeService.getCurrentFinancialYear(aprDate);
      expect(fyApr.label).toBe('2027-28');
      expect(fyApr.start.getFullYear()).toBe(2027);
      expect(fyApr.end.getFullYear()).toBe(2028);
    });

    it('should handle null or invalid dates gracefully', () => {
      expect(DateTimeService.formatDate(null)).toBe('-');
      expect(DateTimeService.formatDate('invalid-date')).toBe('-');
    });
  });
});
