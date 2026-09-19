import { PrismaClient } from '@prisma/client';
import {
  CustomerOutstandingRow,
  OutstandingReportFilters,
  SupplierOutstandingRow,
} from '@rs-inventory/types';
import { roundCurrency } from '../repositories/reporting.repository.js';

export class ReceivablesPayablesReportService {
  constructor(private readonly prisma: PrismaClient) {}

  // ── Customer Outstanding ─────────────────────────────────────────────────────

  public async getCustomerOutstanding(
    companyId: string,
    filters: OutstandingReportFilters = {},
  ): Promise<CustomerOutstandingRow[]> {
    const asOfDate = filters.asOfDate ? new Date(filters.asOfDate) : new Date();
    asOfDate.setHours(23, 59, 59, 999);

    const customers = await this.prisma.customer.findMany({
      where: {
        companyId,
        isActive: true,
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search } },
                { phone: { contains: filters.search } },
                { customerCode: { contains: filters.search } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        customerCode: true,
        phone: true,
        openingBalance: true,
        openingBalanceType: true,
      },
      orderBy: { name: 'asc' },
    });

    const rows: CustomerOutstandingRow[] = [];

    for (const customer of customers) {
      // Compute ledger totals up to asOfDate
      const ledgerEntries = await this.prisma.customerLedger.findMany({
        where: {
          companyId,
          customerId: customer.id,
          entryDate: { lte: asOfDate },
        },
        select: {
          transactionType: true,
          debitAmount: true,
          creditAmount: true,
        },
      });

      let salesInPeriod = 0;
      let salesReturnsInPeriod = 0;
      let paymentsReceivedInPeriod = 0;

      for (const entry of ledgerEntries) {
        switch (entry.transactionType) {
          case 'SALE':
            salesInPeriod += entry.debitAmount;
            break;
          case 'SALES_RETURN':
            salesReturnsInPeriod += entry.creditAmount;
            break;
          case 'PAYMENT':
            paymentsReceivedInPeriod += entry.creditAmount;
            break;
        }
      }

      // Use the last ledger entry's running balance for the closing balance
      const lastEntry = await this.prisma.customerLedger.findFirst({
        where: { companyId, customerId: customer.id, entryDate: { lte: asOfDate } },
        orderBy: { entryDate: 'desc' },
        select: { runningBalance: true },
      });

      const closingBalance = roundCurrency(lastEntry?.runningBalance ?? customer.openingBalance);

      // Only include customers with a non-zero balance or activity
      if (closingBalance === 0 && salesInPeriod === 0) continue;

      let balanceType: 'RECEIVABLE' | 'ADVANCE' | 'ZERO' = 'ZERO';
      if (closingBalance > 0) balanceType = 'RECEIVABLE';
      else if (closingBalance < 0) balanceType = 'ADVANCE';

      rows.push({
        customerId: customer.id,
        customerName: customer.name,
        customerCode: customer.customerCode,
        phone: customer.phone,
        openingBalance: roundCurrency(customer.openingBalance),
        openingBalanceType: customer.openingBalanceType,
        salesInPeriod: roundCurrency(salesInPeriod),
        salesReturnsInPeriod: roundCurrency(salesReturnsInPeriod),
        paymentsReceivedInPeriod: roundCurrency(paymentsReceivedInPeriod),
        closingBalance: roundCurrency(Math.abs(closingBalance)),
        balanceType,
      });
    }

    return rows.sort((a, b) => b.closingBalance - a.closingBalance);
  }

  // ── Supplier Outstanding ─────────────────────────────────────────────────────

  public async getSupplierOutstanding(
    companyId: string,
    filters: OutstandingReportFilters = {},
  ): Promise<SupplierOutstandingRow[]> {
    const asOfDate = filters.asOfDate ? new Date(filters.asOfDate) : new Date();
    asOfDate.setHours(23, 59, 59, 999);

    const suppliers = await this.prisma.supplier.findMany({
      where: {
        companyId,
        isActive: true,
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search } },
                { phone: { contains: filters.search } },
                { supplierCode: { contains: filters.search } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        supplierCode: true,
        phone: true,
        openingBalance: true,
        openingBalanceType: true,
      },
      orderBy: { name: 'asc' },
    });

    const rows: SupplierOutstandingRow[] = [];

    for (const supplier of suppliers) {
      const ledgerEntries = await this.prisma.supplierLedger.findMany({
        where: {
          companyId,
          supplierId: supplier.id,
          entryDate: { lte: asOfDate },
        },
        select: { transactionType: true, debitAmount: true, creditAmount: true },
      });

      let purchasesInPeriod = 0;
      let purchaseReturnsInPeriod = 0;
      let paymentsMadeInPeriod = 0;

      for (const entry of ledgerEntries) {
        switch (entry.transactionType) {
          case 'PURCHASE':
            purchasesInPeriod += entry.creditAmount;
            break;
          case 'PURCHASE_RETURN':
            purchaseReturnsInPeriod += entry.debitAmount;
            break;
          case 'PAYMENT':
            paymentsMadeInPeriod += entry.debitAmount;
            break;
        }
      }

      const lastEntry = await this.prisma.supplierLedger.findFirst({
        where: { companyId, supplierId: supplier.id, entryDate: { lte: asOfDate } },
        orderBy: { entryDate: 'desc' },
        select: { runningBalance: true },
      });

      const closingBalance = roundCurrency(lastEntry?.runningBalance ?? supplier.openingBalance);

      if (closingBalance === 0 && purchasesInPeriod === 0) continue;

      let balanceType: 'PAYABLE' | 'ADVANCE' | 'ZERO' = 'ZERO';
      if (closingBalance > 0) balanceType = 'PAYABLE';
      else if (closingBalance < 0) balanceType = 'ADVANCE';

      rows.push({
        supplierId: supplier.id,
        supplierName: supplier.name,
        supplierCode: supplier.supplierCode,
        phone: supplier.phone,
        openingBalance: roundCurrency(supplier.openingBalance),
        openingBalanceType: supplier.openingBalanceType,
        purchasesInPeriod: roundCurrency(purchasesInPeriod),
        purchaseReturnsInPeriod: roundCurrency(purchaseReturnsInPeriod),
        paymentsMadeInPeriod: roundCurrency(paymentsMadeInPeriod),
        closingBalance: roundCurrency(Math.abs(closingBalance)),
        balanceType,
      });
    }

    return rows.sort((a, b) => b.closingBalance - a.closingBalance);
  }
}
