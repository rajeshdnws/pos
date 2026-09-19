import { Prisma, PrismaClient } from '@prisma/client';
import {
  PaginatedResult,
  PurchasePaymentStatus,
  PurchaseReturn,
  PurchaseReturnCreateDTO,
  PurchaseReturnFilterDTO,
} from '@rs-inventory/types';
import { BusinessRuleError, NotFoundError, ValidationError } from '../errors/app.error.js';
import { PurchaseReturnRepository } from '../repositories/purchase-return.repository.js';
import { AuditService } from './audit.service.js';
import { PurchaseCalculationService } from './purchase-calculation.service.js';
import { SequenceService } from './sequence.service.js';
import { StockService } from './stock.service.js';

export class PurchaseReturnService {
  private repo: PurchaseReturnRepository;
  private stockService: StockService;
  private sequenceService: SequenceService;
  private auditService: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new PurchaseReturnRepository(prisma);
    this.stockService = new StockService(prisma);
    this.sequenceService = new SequenceService(prisma);
    this.auditService = new AuditService(prisma);
  }

  public async getReturns(
    companyId: string,
    filters?: PurchaseReturnFilterDTO,
  ): Promise<PaginatedResult<PurchaseReturn>> {
    return this.repo.findMany(companyId, filters);
  }

  public async getReturnById(companyId: string, id: string): Promise<PurchaseReturn | null> {
    return this.repo.findById(id, companyId);
  }

  public async createReturn(
    companyId: string,
    dto: PurchaseReturnCreateDTO,
    userId?: string,
  ): Promise<PurchaseReturn> {
    if (!dto.purchaseId) {
      throw new ValidationError('Original Purchase ID is required for a return.');
    }
    if (!dto.items || dto.items.length === 0) {
      throw new ValidationError('At least one return line item is required.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch & Validate Original Purchase
      const purchase = await tx.purchase.findUnique({
        where: { id: dto.purchaseId },
        include: {
          items: true,
          supplier: true,
          location: true,
          purchaseReturns: {
            where: { status: 'POSTED' },
            include: { items: true },
          },
        },
      });

      if (!purchase || purchase.companyId !== companyId) {
        throw new NotFoundError('Purchase record not found.');
      }

      if (purchase.status !== 'POSTED') {
        throw new BusinessRuleError('Returns can only be created against POSTED purchase invoices.');
      }

      const locationId = dto.locationId || purchase.locationId;
      if (!locationId) {
        throw new BusinessRuleError('Valid inventory storage location is required.');
      }

      // 2. Validate Eligible Quantities for Each Item
      const returnItemsData: Prisma.PurchaseReturnItemUncheckedCreateWithoutPurchaseReturnInput[] =
        [];
      let subtotal = 0;
      let taxableAmount = 0;
      let cgstAmount = 0;
      let sgstAmount = 0;
      let igstAmount = 0;
      let grandTotal = 0;

      for (const itemDto of dto.items) {
        if (itemDto.quantity <= 0) {
          throw new ValidationError('Return quantity must be greater than 0.');
        }

        // Find matching original purchase item
        const origItem = purchase.items.find(
          (pi) => pi.id === itemDto.purchaseItemId || pi.productId === itemDto.productId,
        );

        if (!origItem) {
          throw new BusinessRuleError(
            `Product ${itemDto.productId} was not found on original purchase ${purchase.purchaseNumber}.`,
          );
        }

        // Calculate already returned quantity for this product/item
        let alreadyReturnedQty = 0;
        for (const prevReturn of purchase.purchaseReturns) {
          for (const prevItem of prevReturn.items) {
            if (
              (prevItem.purchaseItemId && prevItem.purchaseItemId === origItem.id) ||
              prevItem.productId === origItem.productId
            ) {
              alreadyReturnedQty += prevItem.quantity;
            }
          }
        }

        const maxEligible = PurchaseCalculationService.round(
          origItem.quantity - alreadyReturnedQty,
          4,
        );
        if (itemDto.quantity > maxEligible + 0.0001) {
          throw new BusinessRuleError(
            `Requested return quantity (${itemDto.quantity}) exceeds remaining returnable quantity (${maxEligible}) for "${origItem.productNameSnapshot}".`,
          );
        }

        // Determine return rate & taxes from original item
        const returnRate =
          itemDto.returnRate !== undefined ? itemDto.returnRate : origItem.purchaseRate;
        const lineGross = PurchaseCalculationService.round(itemDto.quantity * returnRate, 2);

        // Compute proportional discount if any
        let lineDiscount = 0;
        if (origItem.quantity > 0 && origItem.discountAmount > 0) {
          lineDiscount = PurchaseCalculationService.round(
            (origItem.discountAmount / origItem.quantity) * itemDto.quantity,
            2,
          );
        }

        const lineTaxable = PurchaseCalculationService.round(lineGross - lineDiscount, 2);
        const lineTax =
          origItem.taxableAmount > 0
            ? PurchaseCalculationService.round(
                (origItem.taxAmount / origItem.taxableAmount) * lineTaxable,
                2,
              )
            : 0;

        const lineTotal = PurchaseCalculationService.round(lineTaxable + lineTax, 2);

        subtotal += lineGross;
        taxableAmount += lineTaxable;

        if (origItem.cgstAmount > 0) {
          cgstAmount += PurchaseCalculationService.round(lineTax / 2, 2);
          sgstAmount += PurchaseCalculationService.round(lineTax / 2, 2);
        } else if (origItem.igstAmount > 0) {
          igstAmount += lineTax;
        }

        grandTotal += lineTotal;

        returnItemsData.push({
          purchaseItemId: origItem.id,
          productId: origItem.productId,
          productNameSnapshot: origItem.productNameSnapshot,
          quantity: itemDto.quantity,
          returnRate,
          discountAmount: lineDiscount,
          taxRate: origItem.taxRate,
          taxAmount: lineTax,
          lineTotal,
          reason: itemDto.reason || dto.reason || null,
        });
      }

      subtotal = PurchaseCalculationService.round(subtotal, 2);
      taxableAmount = PurchaseCalculationService.round(taxableAmount, 2);
      cgstAmount = PurchaseCalculationService.round(cgstAmount, 2);
      sgstAmount = PurchaseCalculationService.round(sgstAmount, 2);
      igstAmount = PurchaseCalculationService.round(igstAmount, 2);
      grandTotal = PurchaseCalculationService.round(grandTotal, 2);

      // 3. Generate Return Number
      const returnNumber = await this.sequenceService.getNextNumber(companyId, 'PR', 6, tx);

      // 4. Create Purchase Return Record
      const purchaseReturn = await this.repo.create(
        {
          companyId,
          supplierId: purchase.supplierId,
          purchaseId: purchase.id,
          returnNumber,
          returnDate: dto.returnDate ? new Date(dto.returnDate) : new Date(),
          locationId,
          status: 'POSTED',
          subtotal,
          discountAmount: 0,
          taxableAmount,
          cgstAmount,
          sgstAmount,
          igstAmount,
          cessAmount: 0,
          otherTaxAmount: 0,
          grandTotal,
          reason: dto.reason?.trim() || null,
          notes: dto.notes?.trim() || null,
          createdBy: userId || null,
          postedBy: userId || null,
          postedAt: new Date(),
        },
        returnItemsData,
        tx,
      );

      // 5. Issue Stock Movement via StockService (-qty)
      for (const item of returnItemsData) {
        await this.stockService.recordMovement({
          companyId,
          productId: item.productId,
          locationId,
          movementType: 'PURCHASE_RETURN',
          quantity: -Number(item.quantity || 0), // Negative quantity decreases stock
          unitCost: item.returnRate,
          referenceType: 'PURCHASE_RETURN',
          referenceId: purchaseReturn.id,
          referenceNumber: purchaseReturn.returnNumber,
          notes: `Purchase Return: ${purchaseReturn.returnNumber} (Original Pur #${purchase.purchaseNumber})`,
          userId,
          tx,
        });
      }

      // 6. Update Supplier Payable Balance (Supplier Credit)
      const supplier = await tx.supplier.findUnique({
        where: { id: purchase.supplierId },
      });
      const previousBalance = supplier ? supplier.currentBalance : 0;
      const newSupplierBalance = PurchaseCalculationService.round(
        previousBalance - grandTotal,
        2,
      );

      await tx.supplier.update({
        where: { id: purchase.supplierId },
        data: { currentBalance: newSupplierBalance },
      });

      // 7. Create Supplier Ledger Entry (Debit / Credit Note against Supplier)
      await tx.supplierLedger.create({
        data: {
          companyId,
          supplierId: purchase.supplierId,
          entryDate: dto.returnDate ? new Date(dto.returnDate) : new Date(),
          transactionType: 'PURCHASE_RETURN',
          referenceType: 'RETURN',
          referenceId: purchaseReturn.id,
          referenceNumber: purchaseReturn.returnNumber,
          debitAmount: grandTotal,
          creditAmount: 0,
          runningBalance: newSupplierBalance,
          description: `Purchase Return #${purchaseReturn.returnNumber} (for Purchase #${purchase.purchaseNumber})${
            dto.reason ? ` - ${dto.reason}` : ''
          }`,
          createdBy: userId || null,
        },
      });

      // 8. Update Purchase amountReturned and re-evaluate paymentStatus
      const newAmountReturned = PurchaseCalculationService.round(
        purchase.amountReturned + grandTotal,
        2,
      );
      const effectiveTotal = Math.max(
        0,
        PurchaseCalculationService.round(purchase.grandTotal - newAmountReturned, 2),
      );

      let newPaymentStatus: PurchasePaymentStatus = 'UNPAID';
      if (purchase.amountPaid >= effectiveTotal - 0.01) {
        newPaymentStatus = 'PAID';
      } else if (purchase.amountPaid > 0) {
        newPaymentStatus = 'PARTIALLY_PAID';
      }

      await tx.purchase.update({
        where: { id: purchase.id },
        data: {
          amountReturned: newAmountReturned,
          paymentStatus: newPaymentStatus,
          updatedBy: userId || null,
        },
      });

      // 9. Audit Log
      await this.auditService.log(
        {
          companyId,
          userId: userId || null,
          action: 'PURCHASE_RETURN_POSTED',
          module: 'PURCHASE',
          referenceId: purchaseReturn.id,
          newValue: JSON.stringify({
            returnNumber: purchaseReturn.returnNumber,
            purchaseNumber: purchase.purchaseNumber,
            grandTotal,
          }),
        },
        tx,
      );

      return purchaseReturn;
    });
  }
}
