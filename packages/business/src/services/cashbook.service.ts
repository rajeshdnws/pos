import { PrismaClient } from '@prisma/client';
import {
  CashbookEntry,
  CashbookFilterDTO,
  CashbookSummary,
  CashMovementType,
  PaginatedResult,
} from '@rs-inventory/types';
import { CashMovementRepository } from '../repositories/cash-movement.repository.js';

const INFLOW_TYPES: CashMovementType[] = [
  'OPENING_CASH',
  'CASH_SALE',
  'CUSTOMER_PAYMENT',
  'CASH_IN',
  'CASH_WITHDRAWAL',
];

export class CashbookService {
  private movementRepo: CashMovementRepository;

  constructor(prisma: PrismaClient) {
    this.movementRepo = new CashMovementRepository(prisma);
  }

  public async getCashbook(
    companyId: string,
    filters: CashbookFilterDTO = {},
  ): Promise<{ entries: CashbookEntry[]; summary: CashbookSummary }> {
    const entriesResult = await this.getCashbookEntries(companyId, { ...filters, pageSize: 1000 });
    const summary = await this.getCashbookSummary(companyId, filters);
    return {
      entries: [...entriesResult.items].reverse(),
      summary,
    };
  }

  public async getCashbookEntries(
    companyId: string,
    filters: CashbookFilterDTO = {},
  ): Promise<PaginatedResult<CashbookEntry>> {
    // 1. Fetch all movements up to the end date in ascending order to calculate true running balance
    const allMovements = await this.movementRepo.findAllForPeriod(
      companyId,
      filters.cashRegisterId,
      undefined, // Start from beginning to calculate accurate running balance
      filters.endDate,
    );

    let running = 0;
    const allEntries: CashbookEntry[] = [];

    const startDate = filters.startDate ? new Date(filters.startDate) : null;

    for (const m of allMovements) {
      const isCashIn = INFLOW_TYPES.includes(m.movementType as CashMovementType);
      const cashIn = isCashIn ? m.amount : 0;
      const cashOut = isCashIn ? 0 : m.amount;

      if (isCashIn) {
        running = Math.round((running + m.amount) * 100) / 100;
      } else {
        running = Math.round((running - m.amount) * 100) / 100;
      }

      // Filter by startDate and movementType
      const mDate = new Date(m.movementDate);
      if (startDate && mDate < startDate) {
        continue;
      }

      if (filters.movementType && m.movementType !== filters.movementType) {
        continue;
      }

      allEntries.push({
        id: m.id,
        date: m.movementDate,
        movementNumber: m.movementNumber,
        movementType: m.movementType as CashMovementType,
        referenceType: m.referenceType,
        referenceNumber: m.referenceNumber,
        description: m.description,
        cashIn,
        cashOut,
        runningBalance: running,
      });
    }

    // Return in reverse chronological order for convenient display (newest first)
    const reversed = [...allEntries].reverse();

    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters.pageSize || 25));
    const skip = (page - 1) * pageSize;
    const paginated = reversed.slice(skip, skip + pageSize);

    return {
      items: paginated,
      total: reversed.length,
      page,
      pageSize,
      totalPages: Math.ceil(reversed.length / pageSize) || 1,
    };
  }

  public async getCashbookSummary(
    companyId: string,
    filters: CashbookFilterDTO = {},
  ): Promise<CashbookSummary> {
    const allMovements = await this.movementRepo.findAllForPeriod(
      companyId,
      filters.cashRegisterId,
      undefined,
      filters.endDate,
    );

    const startDate = filters.startDate ? new Date(filters.startDate) : null;

    let openingBalance = 0;
    let totalCashIn = 0;
    let totalCashOut = 0;

    for (const m of allMovements) {
      const isCashIn = INFLOW_TYPES.includes(m.movementType as CashMovementType);
      const mDate = new Date(m.movementDate);

      if (startDate && mDate < startDate) {
        if (isCashIn) {
          openingBalance = Math.round((openingBalance + m.amount) * 100) / 100;
        } else {
          openingBalance = Math.round((openingBalance - m.amount) * 100) / 100;
        }
      } else {
        if (isCashIn) {
          totalCashIn = Math.round((totalCashIn + m.amount) * 100) / 100;
        } else {
          totalCashOut = Math.round((totalCashOut + m.amount) * 100) / 100;
        }
      }
    }

    const closingBalance = Math.round((openingBalance + totalCashIn - totalCashOut) * 100) / 100;

    return {
      openingBalance,
      totalCashIn,
      totalCashOut,
      closingBalance,
    };
  }
}
