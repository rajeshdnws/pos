import { PrismaClient } from '@prisma/client';
import {
  PaginatedResult,
  PurchasePayment,
  PurchasePaymentCreateDTO,
  PurchasePaymentFilterDTO,
  PurchasePaymentReverseDTO,
  PurchasePaymentStatus,
} from '@rs-inventory/types';
import { BusinessRuleError, NotFoundError, ValidationError } from '../errors/app.error.js';
import { PurchasePaymentRepository } from '../repositories/purchase-payment.repository.js';
import { SupplierRepository } from '../repositories/supplier.repository.js';
import { AuditService } from './audit.service.js';
import { PurchaseCalculationService } from './purchase-calculation.service.js';
import { SequenceService } from './sequence.service.js';

export class PurchasePaymentService {
  private repo: PurchasePaymentRepository;
  private supplierRepo: SupplierRepository;
  private sequenceService: SequenceService;
  private auditService: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new PurchasePaymentRepository(prisma);
    this.supplierRepo = new SupplierRepository(prisma);
    this.sequenceService = new SequenceService(prisma);
    this.auditService = new AuditService(prisma);
  }

  public async getPayments(
    companyId: string,
    filters?: PurchasePaymentFilterDTO,
  ): Promise<PaginatedResult<PurchasePayment>> {
    return this.repo.findMany(companyId, filters);
  }

  public async getPaymentById(companyId: string, id: string): Promise<PurchasePayment | null> {
    return this.repo.findById(id, companyId);
  }

  public async recordPayment(
    companyId: string,
    dto: PurchasePaymentCreateDTO,
    userId?: string,
  ): Promise<PurchasePayment> {
    return this.createPayment(companyId, dto, userId);
  }

  public async createPayment(
    companyId: string,
    dto: PurchasePaymentCreateDTO,
    userId?: string,
  ): Promise<PurchasePayment> {
    const amount = PurchaseCalculationService.round(dto.amount, 2);
    if (amount <= 0) {
      throw new ValidationError('Payment amount must be greater than zero.');
    }

    if (!dto.supplierId) {
      throw new ValidationError('Supplier ID is required.');
    }

    const supplier = await this.supplierRepo.findById(dto.supplierId, companyId);
    if (!supplier) {
      throw new NotFoundError('Supplier not found.');
    }

    return this.prisma.$transaction(async (tx) => {
      let purchase = null;
      if (dto.purchaseId) {
        purchase = await tx.purchase.findUnique({
          where: { id: dto.purchaseId },
        });

        if (!purchase || purchase.companyId !== companyId) {
          throw new NotFoundError('Purchase record not found.');
        }

        if (purchase.status !== 'POSTED') {
          throw new BusinessRuleError('Payments can only be recorded against POSTED purchases.');
        }

        if (purchase.supplierId !== supplier.id) {
          throw new BusinessRuleError('Purchase does not belong to the selected supplier.');
        }

        const effectiveTotal = PurchaseCalculationService.round(
          purchase.grandTotal - purchase.amountReturned,
          2,
        );
        const outstanding = PurchaseCalculationService.round(
          effectiveTotal - purchase.amountPaid,
          2,
        );

        if (amount > outstanding + 0.01) {
          throw new BusinessRuleError(
            `Payment amount (₹${amount}) exceeds remaining outstanding balance (₹${outstanding}) for purchase ${purchase.purchaseNumber}.`,
          );
        }
      }

      // 1. Generate Payment Number
      const paymentNumber = await this.sequenceService.getNextNumber(companyId, 'PAY', 6, tx);

      // 2. Create Payment Record
      const payment = await this.repo.create(
        {
          companyId,
          supplierId: supplier.id,
          purchaseId: dto.purchaseId || null,
          paymentNumber,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          amount,
          paymentMode: dto.paymentMode || 'BANK_TRANSFER',
          referenceNo: dto.referenceNo?.trim() || null,
          status: 'POSTED',
          notes: dto.notes?.trim() || null,
          createdBy: userId || null,
        },
        tx,
      );

      // 3. Update Purchase amountPaid & paymentStatus if linked
      if (purchase) {
        const newPaid = PurchaseCalculationService.round(purchase.amountPaid + amount, 2);
        const effectiveTotal = PurchaseCalculationService.round(
          purchase.grandTotal - purchase.amountReturned,
          2,
        );

        let newPaymentStatus: PurchasePaymentStatus = 'UNPAID';
        if (newPaid >= effectiveTotal - 0.01) {
          newPaymentStatus = 'PAID';
        } else if (newPaid > 0) {
          newPaymentStatus = 'PARTIALLY_PAID';
        }

        await tx.purchase.update({
          where: { id: purchase.id },
          data: {
            amountPaid: newPaid,
            paymentStatus: newPaymentStatus,
            updatedBy: userId || null,
          },
        });
      }

      // Record Cash Register movement if paymentMode is CASH
      if ((dto.paymentMode || 'BANK_TRANSFER') === 'CASH') {
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
              movementType: 'SUPPLIER_CASH_PAYMENT',
              amount,
              movementDate: payment.paymentDate,
              referenceType: 'SUPPLIER_PAYMENT',
              referenceId: payment.id,
              referenceNumber: paymentNumber,
              description: purchase
                ? `Supplier cash payment for ${purchase.purchaseNumber} to ${supplier.name}`
                : `Supplier cash payment ${paymentNumber} to ${supplier.name}`,
              createdBy: userId || null,
            },
          });
        }
      }

      // 4. Update Supplier Balance
      const currentBalance = supplier.currentBalance;
      const newSupplierBalance = PurchaseCalculationService.round(currentBalance - amount, 2);

      await tx.supplier.update({
        where: { id: supplier.id },
        data: { currentBalance: newSupplierBalance },
      });

      // 5. Record Supplier Ledger Entry
      await tx.supplierLedger.create({
        data: {
          companyId,
          supplierId: supplier.id,
          entryDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          transactionType: 'PAYMENT',
          referenceType: 'PAYMENT',
          referenceId: payment.id,
          referenceNumber: payment.paymentNumber,
          debitAmount: amount,
          creditAmount: 0,
          runningBalance: newSupplierBalance,
          description: `Payment Made #${payment.paymentNumber}${
            purchase ? ` (for Purchase #${purchase.purchaseNumber})` : ''
          }${dto.paymentMode ? ` via ${dto.paymentMode}` : ''}`,
          createdBy: userId || null,
        },
      });

      // 6. Audit Log
      await this.auditService.log(
        {
          companyId,
          userId: userId || null,
          action: 'PURCHASE_PAYMENT_CREATED',
          module: 'PURCHASE',
          referenceId: payment.id,
          newValue: JSON.stringify({
            paymentNumber: payment.paymentNumber,
            amount: payment.amount,
            supplierId: supplier.id,
            purchaseId: dto.purchaseId,
          }),
        },
        tx,
      );

      return payment;
    });
  }

  public async reversePayment(
    companyId: string,
    dto: PurchasePaymentReverseDTO,
    userId?: string,
  ): Promise<PurchasePayment> {
    if (!dto.reversalReason || dto.reversalReason.trim().length === 0) {
      throw new ValidationError('A reason is mandatory to reverse a payment.');
    }

    const existing = await this.repo.findById(dto.paymentId, companyId);
    if (!existing) {
      throw new NotFoundError('Payment record not found.');
    }

    if (existing.status === 'REVERSED') {
      throw new BusinessRuleError('This payment has already been reversed.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Mark Payment as REVERSED
      const updated = await this.repo.update(
        existing.id,
        {
          status: 'REVERSED',
          reversedAt: new Date(),
          reversedBy: userId || null,
          reversalReason: dto.reversalReason.trim(),
        },
        tx,
      );

      // 2. Adjust Purchase if linked
      if (existing.purchaseId) {
        const purchase = await tx.purchase.findUnique({
          where: { id: existing.purchaseId },
        });

        if (purchase) {
          const newPaid = Math.max(
            0,
            PurchaseCalculationService.round(purchase.amountPaid - existing.amount, 2),
          );
          const effectiveTotal = PurchaseCalculationService.round(
            purchase.grandTotal - purchase.amountReturned,
            2,
          );

          let newPaymentStatus: PurchasePaymentStatus = 'UNPAID';
          if (newPaid >= effectiveTotal - 0.01) {
            newPaymentStatus = 'PAID';
          } else if (newPaid > 0) {
            newPaymentStatus = 'PARTIALLY_PAID';
          }

          await tx.purchase.update({
            where: { id: purchase.id },
            data: {
              amountPaid: newPaid,
              paymentStatus: newPaymentStatus,
              updatedBy: userId || null,
            },
          });
        }
      }

      // 3. Re-adjust Supplier Balance
      const supplier = await tx.supplier.findUnique({
        where: { id: existing.supplierId },
      });

      const currentBalance = supplier ? supplier.currentBalance : 0;
      const newSupplierBalance = PurchaseCalculationService.round(
        currentBalance + existing.amount,
        2,
      );

      await tx.supplier.update({
        where: { id: existing.supplierId },
        data: { currentBalance: newSupplierBalance },
      });

      // 4. Create Supplier Ledger Entry for Reversal
      await tx.supplierLedger.create({
        data: {
          companyId,
          supplierId: existing.supplierId,
          entryDate: new Date(),
          transactionType: 'PAYMENT_REVERSAL',
          referenceType: 'PAYMENT',
          referenceId: existing.id,
          referenceNumber: existing.paymentNumber,
          debitAmount: 0,
          creditAmount: existing.amount,
          runningBalance: newSupplierBalance,
          description: `Reversal of Payment #${existing.paymentNumber}: ${dto.reversalReason.trim()}`,
          createdBy: userId || null,
        },
      });

      // 5. Audit Log
      await this.auditService.log(
        {
          companyId,
          userId: userId || null,
          action: 'PURCHASE_PAYMENT_REVERSED',
          module: 'PURCHASE',
          referenceId: existing.id,
          newValue: JSON.stringify({
            paymentNumber: existing.paymentNumber,
            amount: existing.amount,
            reversalReason: dto.reversalReason,
          }),
        },
        tx,
      );

      return updated;
    });
  }
}
