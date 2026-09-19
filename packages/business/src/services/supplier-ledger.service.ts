import { PrismaClient } from '@prisma/client';
import {
  PaginatedResult,
  SupplierLedgerEntry,
  SupplierLedgerFilterDTO,
  SupplierStatementDTO,
} from '@rs-inventory/types';
import { BusinessRuleError } from '../errors/app.error.js';
import { SupplierLedgerRepository } from '../repositories/supplier-ledger.repository.js';
import { SupplierRepository } from '../repositories/supplier.repository.js';
import { PurchaseCalculationService } from './purchase-calculation.service.js';

export class SupplierLedgerService {
  private repo: SupplierLedgerRepository;
  private supplierRepo: SupplierRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new SupplierLedgerRepository(prisma);
    this.supplierRepo = new SupplierRepository(prisma);
  }

  public async getEntries(
    companyId: string,
    filters: SupplierLedgerFilterDTO,
  ): Promise<PaginatedResult<SupplierLedgerEntry>> {
    const supplier = await this.supplierRepo.findById(filters.supplierId, companyId);
    if (!supplier) {
      throw new BusinessRuleError('Supplier not found.');
    }
    return this.repo.findEntries(companyId, filters);
  }

  public async getStatement(
    companyId: string,
    supplierId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<SupplierStatementDTO> {
    const supplier = await this.supplierRepo.findById(supplierId, companyId);
    if (!supplier) {
      throw new BusinessRuleError('Supplier not found.');
    }

    const entries = await this.repo.getStatementEntries(companyId, supplierId, startDate, endDate);

    // Calculate initial opening balance if startDate is specified
    let openingBalance = 0;
    if (startDate) {
      const priorEntries = await this.prisma.supplierLedger.findMany({
        where: {
          companyId,
          supplierId,
          entryDate: { lt: new Date(startDate) },
        },
        orderBy: { entryDate: 'asc' },
      });

      let balance = 0;
      for (const entry of priorEntries) {
        balance += entry.creditAmount - entry.debitAmount;
      }
      openingBalance = PurchaseCalculationService.round(balance, 2);
    } else {
      openingBalance = 0;
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      totalDebit += entry.debitAmount;
      totalCredit += entry.creditAmount;
    }

    totalDebit = PurchaseCalculationService.round(totalDebit, 2);
    totalCredit = PurchaseCalculationService.round(totalCredit, 2);
    const closingBalance = PurchaseCalculationService.round(
      openingBalance + totalCredit - totalDebit,
      2,
    );

    return {
      supplier,
      openingBalance,
      totalDebit,
      totalCredit,
      closingBalance,
      entries,
    };
  }
}
