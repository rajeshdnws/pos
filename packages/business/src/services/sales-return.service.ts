import { PrismaClient } from '@prisma/client';
import {
  PaginatedResult,
  SalesReturn,
  SalesReturnCreateDTO,
  SalesReturnFilterDTO,
} from '@rs-inventory/types';
import { BusinessRuleError, NotFoundError, ValidationError } from '../errors/app.error.js';
import { CustomerLedgerRepository } from '../repositories/customer-ledger.repository.js';
import { SalesReturnRepository } from '../repositories/sales-return.repository.js';
import { LocationRepository } from '../repositories/location.repository.js';
import { AuditService } from './audit.service.js';
import { SalesCalculationService } from './sales-calculation.service.js';
import { SequenceService } from './sequence.service.js';
import { StockService } from './stock.service.js';
import { LoyaltyReturnService } from './loyalty/loyalty-return.service.js';

export class SalesReturnService {
  private repo: SalesReturnRepository;
  private ledgerRepo: CustomerLedgerRepository;
  private locationRepo: LocationRepository;
  private stockService: StockService;
  private sequenceService: SequenceService;
  private auditService: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new SalesReturnRepository(prisma);
    this.ledgerRepo = new CustomerLedgerRepository(prisma);
    this.locationRepo = new LocationRepository(prisma);
    this.stockService = new StockService(prisma);
    this.sequenceService = new SequenceService(prisma);
    this.auditService = new AuditService(prisma);
  }

  public async listReturns(
    companyId: string,
    filters: SalesReturnFilterDTO = {},
  ): Promise<PaginatedResult<SalesReturn>> {
    return this.repo.findMany(companyId, filters);
  }

  public async getReturn(companyId: string, id: string): Promise<SalesReturn> {
    const ret = await this.repo.findById(id, companyId);
    if (!ret) throw new NotFoundError('Sales return not found.');
    return ret;
  }

  /**
   * Create and immediately post a sales return (atomic).
   * 1. Validate original invoice is POSTED
   * 2. Lookup historical prices from original invoice items
   * 3. Validate quantities (cannot return more than sold - already returned)
   * 4. Calculate return totals using original invoice rates
   * 5. Create SalesReturn record
   * 6. For RESELLABLE items: record SALES_RETURN stock movement (positive qty)
   * 7. Update originalSalesInvoice.amountReturned
   * 8. Customer ledger SALES_RETURN entry (credit = reduces receivable)
   * 9. Audit log
   */
  public async createReturn(
    companyId: string,
    dto: SalesReturnCreateDTO,
    userId?: string,
  ): Promise<SalesReturn> {
    if (!dto.items || dto.items.length === 0) {
      throw new ValidationError('Return must have at least one item.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch original invoice
      const originalInvoice = await tx.salesInvoice.findUnique({
        where: { id: dto.originalSalesInvoiceId },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, trackStock: true, productType: true, taxRate: true } },
            },
          },
          customer: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
        },
      });

      if (!originalInvoice || originalInvoice.companyId !== companyId) {
        throw new NotFoundError('Original sales invoice not found.');
      }
      if (originalInvoice.status !== 'POSTED') {
        throw new BusinessRuleError('Returns can only be created against posted invoices.');
      }

      // 2. Resolve return location (use original invoice location as default)
      let locationId = dto.locationId;
      if (!locationId) {
        locationId = originalInvoice.locationId;
      }
      if (!locationId) {
        try {
          const defaultLoc = await this.locationRepo.getDefault(companyId);
          locationId = defaultLoc.id;
        } catch {
          locationId = null;
        }
      }

      // 3. Build return items — validate and pull rates from original invoice
      const returnItems: {
        originalSalesInvoiceItemId?: string;
        productId: string;
        productNameSnapshot: string;
        quantity: number;
        returnRate: number;
        discountAmount: number;
        taxRate: number;
        taxAmount: number;
        lineTotal: number;
        restockCondition: string;
        reason?: string;
        companyId: string;
      }[] = [];

      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;
      let grandTotal = 0;

      for (const retItem of dto.items) {
        if (retItem.quantity <= 0) {
          throw new ValidationError('Return quantity must be greater than zero.');
        }

        // Find the original invoice item for this product
        const origItem = originalInvoice.items.find(
          (i) =>
            i.id === retItem.originalSalesInvoiceItemId ||
            i.productId === retItem.productId,
        );

        if (!origItem) {
          throw new BusinessRuleError(
            `Product ${retItem.productId} was not found in the original invoice.`,
          );
        }

        // Check already-returned quantity
        const alreadyReturned =
          await this.repo.getTotalReturnedQuantityForInvoiceItem(origItem.id);

        const remainingReturnable = SalesCalculationService.round(
          origItem.quantity - alreadyReturned,
          4,
        );

        if (retItem.quantity > remainingReturnable) {
          throw new BusinessRuleError(
            `Return quantity ${retItem.quantity} for "${origItem.productNameSnapshot}" exceeds returnable quantity ${remainingReturnable}.`,
          );
        }

        // Calculate return line at original invoice rate (pro-rata)
        const returnRate = origItem.sellingRate;
        const grossReturnAmt = SalesCalculationService.round(retItem.quantity * returnRate, 2);
        const discountPerUnitTotal =
          origItem.quantity > 0
            ? SalesCalculationService.round(
                (origItem.discountAmount / origItem.quantity) * retItem.quantity,
                2,
              )
            : 0;
        const returnTaxableAmt = SalesCalculationService.round(
          grossReturnAmt - discountPerUnitTotal,
          2,
        );
        const returnTaxAmt = SalesCalculationService.round(
          (returnTaxableAmt * origItem.taxRate) / 100,
          2,
        );
        const returnLineTotal = SalesCalculationService.round(
          returnTaxableAmt + returnTaxAmt,
          2,
        );

        subtotal = SalesCalculationService.round(subtotal + grossReturnAmt, 2);
        totalDiscount = SalesCalculationService.round(totalDiscount + discountPerUnitTotal, 2);
        totalTax = SalesCalculationService.round(totalTax + returnTaxAmt, 2);
        grandTotal = SalesCalculationService.round(grandTotal + returnLineTotal, 2);

        returnItems.push({
          companyId,
          originalSalesInvoiceItemId: origItem.id,
          productId: retItem.productId,
          productNameSnapshot: origItem.productNameSnapshot,
          quantity: retItem.quantity,
          returnRate,
          discountAmount: discountPerUnitTotal,
          taxRate: origItem.taxRate,
          taxAmount: returnTaxAmt,
          lineTotal: returnLineTotal,
          restockCondition: retItem.restockCondition || 'RESELLABLE',
          reason: retItem.reason || dto.reason || undefined,
        });
      }

      const returnNumber = await this.sequenceService.getNextNumber(companyId, 'SR', 6, tx);

      // 4. Create the return
      const salesReturn = await this.repo.create(
        {
          companyId,
          returnNumber,
          originalSalesInvoiceId: dto.originalSalesInvoiceId,
          customerId: originalInvoice.customerId || null,
          returnDate: dto.returnDate ? new Date(dto.returnDate) : new Date(),
          locationId: locationId || null,
          status: 'POSTED',
          subtotal,
          discountAmount: totalDiscount,
          taxableAmount: SalesCalculationService.round(subtotal - totalDiscount, 2),
          cgstAmount: 0, // Simplified — could split further if needed
          sgstAmount: 0,
          igstAmount: 0,
          cessAmount: 0,
          otherTaxAmount: 0,
          grandTotal,
          refundAmount: grandTotal,
          creditAmount: 0,
          reason: dto.reason?.trim() || null,
          notes: dto.notes?.trim() || null,
          postedBy: userId || null,
          postedAt: new Date(),
          createdBy: userId || null,
        },
        returnItems,
        tx,
      );

      // 5. Stock movements for RESELLABLE items
      for (const retItem of returnItems) {
        if (retItem.restockCondition !== 'RESELLABLE') continue;

        const origItem = originalInvoice.items.find((i) => i.productId === retItem.productId);
        if (!origItem?.product || !origItem.product.trackStock || origItem.product.productType !== 'PHYSICAL') {
          continue;
        }

        await this.stockService.recordMovement({
          companyId,
          productId: retItem.productId,
          locationId: locationId!,
          movementType: 'SALES_RETURN',
          quantity: retItem.quantity, // positive = stock incoming
          unitCost: retItem.returnRate,
          referenceType: 'SALES_RETURN',
          referenceId: salesReturn.id,
          referenceNumber: returnNumber,
          notes: `Sales Return: ${returnNumber}`,
          userId,
          tx,
        });
      }

      // 6. Update original invoice amountReturned
      const newAmountReturned = SalesCalculationService.round(
        (originalInvoice.amountReturned || 0) + grandTotal,
        2,
      );
      await tx.salesInvoice.update({
        where: { id: dto.originalSalesInvoiceId },
        data: { amountReturned: newAmountReturned },
      });

      // 6b. Handle Loyalty Points Reversal & Restoration (Step 12)
      const loyaltyReturnService = new LoyaltyReturnService(this.prisma);
      const loyaltyResult = await loyaltyReturnService.handleSalesReturn(
        companyId,
        salesReturn.id,
        dto.originalSalesInvoiceId,
        grandTotal,
        userId,
        tx,
      );
      (salesReturn as any).pointsReversed = loyaltyResult.pointsReversed;
      (salesReturn as any).pointsRestored = loyaltyResult.pointsRestored;

      // Record Cash Register movement if refund is paid in cash
      if (dto.refundMode === 'CASH' && grandTotal > 0) {
        const activeSession = await tx.cashRegisterSession.findFirst({
          where: { companyId, status: 'OPEN' },
          orderBy: { openedAt: 'desc' },
        });
        if (activeSession) {
          const movNumber = await this.sequenceService.getNextNumber(companyId, 'MOV', 6, tx);
          await tx.cashMovement.create({
            data: {
              companyId,
              cashRegisterId: activeSession.cashRegisterId,
              cashRegisterSessionId: activeSession.id,
              movementNumber: movNumber,
              movementType: 'CASH_REFUND',
              amount: grandTotal,
              movementDate: salesReturn.returnDate,
              referenceType: 'REFUND',
              referenceId: salesReturn.id,
              referenceNumber: returnNumber,
              description: `Cash refund for Sales Return ${returnNumber} (${originalInvoice.invoiceNumber})`,
              createdBy: userId || null,
            },
          });
        }
      }

      // 7. Customer ledger SALES_RETURN entry (credit = reduces receivable)
      if (originalInvoice.customerId) {
        const prevBal = await this.ledgerRepo.getLatestRunningBalance(
          originalInvoice.customerId,
          tx,
        );
        await this.ledgerRepo.recordEntry(
          {
            companyId,
            customerId: originalInvoice.customerId,
            transactionType: 'SALES_RETURN',
            referenceType: 'SALES_RETURN',
            referenceId: salesReturn.id,
            referenceNumber: returnNumber,
            debitAmount: 0,
            creditAmount: grandTotal,
            runningBalance: SalesCalculationService.round(prevBal - grandTotal, 2),
            description: `Sales Return ${returnNumber} against ${originalInvoice.invoiceNumber}`,
            createdBy: userId || null,
          },
          tx,
        );
        await tx.customer.update({
          where: { id: originalInvoice.customerId },
          data: { currentBalance: { decrement: grandTotal } },
        });
      }

      // 8. Audit log
      await this.auditService.log(
        {
          companyId,
          userId: userId || null,
          action: 'SALES_RETURN_CREATED',
          module: 'SALES',
          referenceId: salesReturn.id,
          newValue: JSON.stringify({
            returnNumber,
            grandTotal,
            originalInvoice: originalInvoice.invoiceNumber,
          }),
        },
        tx,
      );

      return salesReturn;
    });
  }
}
