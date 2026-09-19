import { Prisma, PrismaClient } from '@prisma/client';

export class SequenceService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Generates next sequence number for a given prefix and table in a transaction-safe manner.
   * e.g. prefix = 'PUR', padLength = 6 -> 'PUR-000001'
   */
  public async getNextNumber(
    companyId: string,
    prefix: string,
    padLength: number = 6,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const client = tx || this.prisma;
    const settingKey = `seq_${prefix.toLowerCase()}`;

    // 1. Fetch or initialize sequence setting for this company
    const setting = await client.setting.findUnique({
      where: {
        companyId_key: {
          companyId,
          key: settingKey,
        },
      },
    });

    let currentVal = 0;
    if (setting) {
      currentVal = parseInt(setting.value, 10) || 0;
    } else {
      // Find highest existing in database if sequence counter not yet seeded
      currentVal = await this.findHighestInTable(client, companyId, prefix);
    }

    const nextVal = currentVal + 1;

    // Save updated sequence
    await client.setting.upsert({
      where: {
        companyId_key: {
          companyId,
          key: settingKey,
        },
      },
      create: {
        companyId,
        key: settingKey,
        value: String(nextVal),
        type: 'NUMBER',
      },
      update: {
        value: String(nextVal),
      },
    });

    const formattedNumber = `${prefix}-${String(nextVal).padStart(padLength, '0')}`;
    return formattedNumber;
  }

  private async findHighestInTable(
    client: Prisma.TransactionClient | PrismaClient,
    companyId: string,
    prefix: string,
  ): Promise<number> {
    try {
      if (prefix === 'PUR') {
        const lastPurchase = await client.purchase.findFirst({
          where: { companyId },
          orderBy: { createdAt: 'desc' },
          select: { purchaseNumber: true },
        });
        if (lastPurchase?.purchaseNumber) {
          const match = lastPurchase.purchaseNumber.match(/\d+$/);
          if (match) return parseInt(match[0], 10);
        }
      } else if (prefix === 'PAY') {
        const lastPayment = await client.paymentMade.findFirst({
          where: { companyId },
          orderBy: { createdAt: 'desc' },
          select: { paymentNumber: true },
        });
        if (lastPayment?.paymentNumber) {
          const match = lastPayment.paymentNumber.match(/\d+$/);
          if (match) return parseInt(match[0], 10);
        }
      } else if (prefix === 'PR') {
        const lastReturn = await client.purchaseReturn.findFirst({
          where: { companyId },
          orderBy: { createdAt: 'desc' },
          select: { returnNumber: true },
        });
        if (lastReturn?.returnNumber) {
          const match = lastReturn.returnNumber.match(/\d+$/);
          if (match) return parseInt(match[0], 10);
        }
      } else if (prefix === 'SUP') {
        const lastSupplier = await client.supplier.findFirst({
          where: { companyId },
          orderBy: { createdAt: 'desc' },
          select: { supplierCode: true },
        });
        if (lastSupplier?.supplierCode) {
          const match = lastSupplier.supplierCode.match(/\d+$/);
          if (match) return parseInt(match[0], 10);
        }
      } else if (prefix === 'CUST') {
        const lastCustomer = await client.customer.findFirst({
          where: { companyId },
          orderBy: { createdAt: 'desc' },
          select: { customerCode: true },
        });
        if (lastCustomer?.customerCode) {
          const match = lastCustomer.customerCode.match(/\d+$/);
          if (match) return parseInt(match[0], 10);
        }
      } else if (prefix === 'SPAY') {
        const last = await client.salesPayment.findFirst({
          where: { companyId },
          orderBy: { createdAt: 'desc' },
          select: { paymentNumber: true },
        });
        if (last?.paymentNumber) {
          const match = last.paymentNumber.match(/\d+$/);
          if (match) return parseInt(match[0], 10);
        }
      } else if (prefix === 'SR') {
        const last = await client.salesReturn.findFirst({
          where: { companyId },
          orderBy: { createdAt: 'desc' },
          select: { returnNumber: true },
        });
        if (last?.returnNumber) {
          const match = last.returnNumber.match(/\d+$/);
          if (match) return parseInt(match[0], 10);
        }
      } else if (prefix === 'EXP') {
        const last = await client.expense.findFirst({
          where: { companyId },
          orderBy: { createdAt: 'desc' },
          select: { expenseNumber: true },
        });
        if (last?.expenseNumber) {
          const match = last.expenseNumber.match(/\d+$/);
          if (match) return parseInt(match[0], 10);
        }
      } else if (prefix === 'REG') {
        const last = await client.cashRegister.findFirst({
          where: { companyId },
          orderBy: { createdAt: 'desc' },
          select: { registerCode: true },
        });
        if (last?.registerCode) {
          const match = last.registerCode.match(/\d+$/);
          if (match) return parseInt(match[0], 10);
        }
      } else if (prefix === 'SES') {
        const last = await client.cashRegisterSession.findFirst({
          where: { companyId },
          orderBy: { createdAt: 'desc' },
          select: { sessionNumber: true },
        });
        if (last?.sessionNumber) {
          const match = last.sessionNumber.match(/\d+$/);
          if (match) return parseInt(match[0], 10);
        }
      } else if (prefix === 'MOV') {
        const last = await client.cashMovement.findFirst({
          where: { companyId },
          orderBy: { createdAt: 'desc' },
          select: { movementNumber: true },
        });
        if (last?.movementNumber) {
          const match = last.movementNumber.match(/\d+$/);
          if (match) return parseInt(match[0], 10);
        }
      } else if (prefix === 'CLS') {
        const last = await client.dayEndClosing.findFirst({
          where: { companyId },
          orderBy: { createdAt: 'desc' },
          select: { closingNumber: true },
        });
        if (last?.closingNumber) {
          const match = last.closingNumber.match(/\d+$/);
          if (match) return parseInt(match[0], 10);
        }
      } else {
        // For INV or any custom company invoice prefix: look in salesInvoices
        const last = await client.salesInvoice.findFirst({
          where: { companyId, invoiceNumber: { startsWith: prefix } },
          orderBy: { createdAt: 'desc' },
          select: { invoiceNumber: true },
        });
        if (last?.invoiceNumber) {
          const match = last.invoiceNumber.match(/\d+$/);
          if (match) return parseInt(match[0], 10);
        }
      }
    } catch {
      // Fallback
    }
    return 0;
  }
}
