import { PrismaClient } from '@prisma/client';
import {
  PaginatedResult,
  SalesPayment,
  SalesPaymentCreateDTO,
  SalesPaymentFilterDTO,
} from '@rs-inventory/types';
import { BusinessRuleError, NotFoundError, ValidationError } from '../errors/app.error.js';
import { CustomerLedgerRepository } from '../repositories/customer-ledger.repository.js';
import { SalesPaymentRepository } from '../repositories/sales-payment.repository.js';
import { AuditService } from './audit.service.js';
import { SalesCalculationService } from './sales-calculation.service.js';
import { SequenceService } from './sequence.service.js';

export class SalesPaymentService {
  private repo: SalesPaymentRepository;
  private ledgerRepo: CustomerLedgerRepository;
  private sequenceService: SequenceService;
  private auditService: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new SalesPaymentRepository(prisma);
    this.ledgerRepo = new CustomerLedgerRepository(prisma);
    this.sequenceService = new SequenceService(prisma);
    this.auditService = new AuditService(prisma);
  }

  public async listPayments(
    companyId: string,
    filters: SalesPaymentFilterDTO = {},
  ): Promise<PaginatedResult<SalesPayment>> {
    return this.repo.findMany(companyId, filters);
  }

  /**
   * Create a standalone payment (outside of sale posting flow).
   * Useful for recording payments against credit invoices.
   */
  public async createPayment(
    companyId: string,
    dto: SalesPaymentCreateDTO,
    userId?: string,
  ): Promise<SalesPayment> {
    if (!dto.amount || dto.amount <= 0) {
      throw new ValidationError('Payment amount must be greater than zero.');
    }

    const payAmt = SalesCalculationService.round(dto.amount, 2);

    return this.prisma.$transaction(async (tx) => {
      // Validate invoice if provided
      let invoice: {
        id: string;
        companyId: string;
        invoiceNumber: string;
        grandTotal: number;
        amountPaid: number;
        paymentStatus: string;
      } | null = null;

      if (dto.salesInvoiceId) {
        const found = await tx.salesInvoice.findUnique({
          where: { id: dto.salesInvoiceId },
          select: { id: true, invoiceNumber: true, grandTotal: true, amountPaid: true, paymentStatus: true, companyId: true },
        });
        if (!found || found.companyId !== companyId) {
          throw new NotFoundError('Sales invoice not found.');
        }
        invoice = found;
        if (invoice.paymentStatus === 'PAID') {
          throw new BusinessRuleError('This invoice is already fully paid.');
        }
      }

      // Validate customer if provided
      if (dto.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: dto.customerId }, select: { companyId: true } });
        if (!customer || customer.companyId !== companyId) {
          throw new NotFoundError('Customer not found.');
        }
      }

      const paymentNumber = await this.sequenceService.getNextNumber(companyId, 'SPAY', 6, tx);

      const payment = await this.repo.create(
        {
          companyId,
          customerId: dto.customerId || null,
          salesInvoiceId: dto.salesInvoiceId || null,
          paymentNumber,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          amount: payAmt,
          paymentMode: dto.paymentMode || 'CASH',
          referenceNo: dto.referenceNo || null,
          status: 'POSTED',
          notes: dto.notes?.trim() || null,
          createdBy: userId || null,
        },
        tx,
      );

      // Update invoice amountPaid and paymentStatus
      if (invoice) {
        const newAmountPaid = SalesCalculationService.round(
          (invoice.amountPaid || 0) + payAmt,
          2,
        );
        const newPaymentStatus =
          newAmountPaid >= invoice.grandTotal
            ? 'PAID'
            : newAmountPaid > 0
            ? 'PARTIALLY_PAID'
            : 'UNPAID';

        await tx.salesInvoice.update({
          where: { id: invoice.id },
          data: { amountPaid: newAmountPaid, paymentStatus: newPaymentStatus },
        });
      }

      // Record Cash Register movement if paymentMode is CASH
      if ((dto.paymentMode || 'CASH') === 'CASH') {
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
              movementType: 'CUSTOMER_PAYMENT',
              amount: payAmt,
              movementDate: payment.paymentDate,
              referenceType: 'PAYMENT',
              referenceId: payment.id,
              referenceNumber: paymentNumber,
              description: invoice
                ? `Customer payment for ${invoice.invoiceNumber}`
                : `Customer cash payment ${paymentNumber}`,
              createdBy: userId || null,
            },
          });
        }
      }

      // Customer ledger entry
      if (dto.customerId) {
        const prevBal = await this.ledgerRepo.getLatestRunningBalance(dto.customerId, tx);
        await this.ledgerRepo.recordEntry(
          {
            companyId,
            customerId: dto.customerId,
            transactionType: 'PAYMENT',
            referenceType: 'PAYMENT',
            referenceId: payment.id,
            referenceNumber: paymentNumber,
            debitAmount: 0,
            creditAmount: payAmt,
            runningBalance: SalesCalculationService.round(prevBal - payAmt, 2),
            description: invoice
              ? `Payment for ${invoice.invoiceNumber} via ${dto.paymentMode}`
              : `Payment via ${dto.paymentMode}`,
            createdBy: userId || null,
          },
          tx,
        );
        await tx.customer.update({
          where: { id: dto.customerId },
          data: { currentBalance: { decrement: payAmt } },
        });
      }

      await this.auditService.log(
        {
          companyId,
          userId: userId || null,
          action: 'SALES_PAYMENT_CREATED',
          module: 'SALES',
          referenceId: payment.id,
          newValue: JSON.stringify({ paymentNumber, amount: payAmt, paymentMode: dto.paymentMode }),
        },
        tx,
      );

      return payment;
    });
  }

  /**
   * Reverse a posted payment. Creates a reversal ledger entry and marks the payment reversed.
   */
  public async reversePayment(
    companyId: string,
    paymentId: string,
    reason: string,
    userId?: string,
  ): Promise<SalesPayment> {
    if (!reason?.trim()) {
      throw new ValidationError('Reversal reason is required.');
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.salesPayment.findUnique({
        where: { id: paymentId },
        select: { id: true, companyId: true, amount: true, paymentNumber: true, status: true, customerId: true, salesInvoiceId: true },
      });
      if (!payment || payment.companyId !== companyId) {
        throw new NotFoundError('Payment not found.');
      }
      if (payment.status === 'REVERSED') {
        throw new BusinessRuleError('This payment has already been reversed.');
      }

      // Mark reversed
      const reversed = await tx.salesPayment.update({
        where: { id: paymentId },
        data: {
          status: 'REVERSED',
          reversedAt: new Date(),
          reversedBy: userId || null,
          reversalReason: reason.trim(),
        },
      });

      // Update invoice amountPaid
      if (payment.salesInvoiceId) {
        const invoice = await tx.salesInvoice.findUnique({
          where: { id: payment.salesInvoiceId },
          select: { amountPaid: true, grandTotal: true },
        });
        if (invoice) {
          const newAmountPaid = Math.max(
            0,
            SalesCalculationService.round(invoice.amountPaid - payment.amount, 2),
          );
          const newPaymentStatus =
            newAmountPaid >= invoice.grandTotal
              ? 'PAID'
              : newAmountPaid > 0
              ? 'PARTIALLY_PAID'
              : 'UNPAID';
          await tx.salesInvoice.update({
            where: { id: payment.salesInvoiceId },
            data: { amountPaid: newAmountPaid, paymentStatus: newPaymentStatus },
          });
        }
      }

      // Customer ledger reversal entry
      if (payment.customerId) {
        const prevBal = await this.ledgerRepo.getLatestRunningBalance(payment.customerId, tx);
        await this.ledgerRepo.recordEntry(
          {
            companyId,
            customerId: payment.customerId,
            transactionType: 'PAYMENT_REVERSAL',
            referenceType: 'PAYMENT',
            referenceId: paymentId,
            referenceNumber: payment.paymentNumber,
            debitAmount: payment.amount, // Reversal: debit = increase receivable
            creditAmount: 0,
            runningBalance: SalesCalculationService.round(prevBal + payment.amount, 2),
            description: `Payment Reversal: ${payment.paymentNumber} — ${reason}`,
            createdBy: userId || null,
          },
          tx,
        );
        await tx.customer.update({
          where: { id: payment.customerId },
          data: { currentBalance: { increment: payment.amount } },
        });
      }

      await this.auditService.log(
        {
          companyId,
          userId: userId || null,
          action: 'SALES_PAYMENT_REVERSED',
          module: 'SALES',
          referenceId: paymentId,
          newValue: JSON.stringify({ reason }),
        },
        tx,
      );

      return reversed as unknown as SalesPayment;
    });
  }
}
