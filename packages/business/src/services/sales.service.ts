import { Prisma, PrismaClient } from '@prisma/client';
import {
  PaginatedResult,
  POSProductSearchFilterDTO,
  POSProductSearchResult,
  SalesCalculationInput,
  SalesCalculationResult,
  SalesDashboardKPIs,
  SalesFilterDTO,
  SalesInvoice,
  SalesInvoiceCreateDTO,
  SalesInvoiceUpdateDTO,
  SalesPostDTO,
  SalesSummaryDTO,
} from '@rs-inventory/types';
import { BusinessRuleError, NotFoundError, ValidationError } from '../errors/app.error.js';
import { CustomerLedgerRepository } from '../repositories/customer-ledger.repository.js';
import { SalesInvoiceRepository } from '../repositories/sales-invoice.repository.js';
import { LocationRepository } from '../repositories/location.repository.js';
import { AuditService } from './audit.service.js';
import { SalesCalculationService } from './sales-calculation.service.js';
import { SequenceService } from './sequence.service.js';
import { StockService } from './stock.service.js';

export class SalesService {
  private repo: SalesInvoiceRepository;
  private ledgerRepo: CustomerLedgerRepository;
  private locationRepo: LocationRepository;
  private stockService: StockService;
  private sequenceService: SequenceService;
  private auditService: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new SalesInvoiceRepository(prisma);
    this.ledgerRepo = new CustomerLedgerRepository(prisma);
    this.locationRepo = new LocationRepository(prisma);
    this.stockService = new StockService(prisma);
    this.sequenceService = new SequenceService(prisma);
    this.auditService = new AuditService(prisma);
  }

  // ─── Queries ─────────────────────────────────────────────────────────────

  public async listSales(
    companyId: string,
    filters: SalesFilterDTO = {},
  ): Promise<PaginatedResult<SalesInvoice>> {
    return this.repo.findMany(companyId, filters);
  }

  public async getSale(companyId: string, id: string): Promise<SalesInvoice> {
    const inv = await this.repo.findById(id, companyId);
    if (!inv) throw new NotFoundError('Sales invoice not found.');
    return inv;
  }

  public async getSummary(companyId: string): Promise<SalesSummaryDTO> {
    return this.repo.getSummary(companyId);
  }

  public async getKPIs(companyId: string): Promise<SalesDashboardKPIs> {
    return this.repo.getKPIs(companyId);
  }

  // ─── POS Product Search ───────────────────────────────────────────────────

  public async searchPOSProducts(
    companyId: string,
    filters: POSProductSearchFilterDTO,
  ): Promise<POSProductSearchResult[]> {
    const query = filters.query?.trim();
    if (!query) return [];

    // Resolve the location
    let locationId = filters.locationId;
    if (!locationId) {
      const defaultLoc = await this.locationRepo.getDefault(companyId);
      locationId = defaultLoc.id;
    }

    const location = await this.prisma.inventoryLocation.findUnique({
      where: { id: locationId },
      select: { id: true, name: true },
    });

    const where: Prisma.ProductWhereInput = {
      companyId,
      isActive: true,
    };

    if (filters.exactBarcode) {
      where.barcode = query;
    } else {
      where.OR = [
        { name: { contains: query } },
        { shortName: { contains: query } },
        { sku: { contains: query } },
        { barcode: { contains: query } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      take: 20,
      include: {
        unit: { select: { name: true, shortCode: true, allowDecimals: true } },
        stockBalances: {
          where: { locationId },
          select: { quantity: true },
        },
      },
      orderBy: [{ name: 'asc' }],
    });

    return products.map((p) => ({
      productId: p.id,
      name: p.name,
      shortName: p.shortName,
      sku: p.sku,
      barcode: p.barcode,
      hsnCode: p.hsnCode,
      sellingPrice: p.sellingPrice,
      mrp: p.mrp,
      taxRate: p.taxRate,
      unitName: p.unit?.name || null,
      unitShortCode: p.unit?.shortCode || null,
      allowDecimals: p.unit?.allowDecimals ?? true,
      availableStock: p.stockBalances[0]?.quantity ?? 0,
      locationId: locationId!,
      locationName: location?.name || '',
      isActive: p.isActive,
      trackStock: p.trackStock,
    }));
  }

  // ─── Calculation ──────────────────────────────────────────────────────────

  public async calculate(
    companyId: string,
    input: SalesCalculationInput,
  ): Promise<SalesCalculationResult> {
    // Resolve company state if not provided
    if (!input.companyState) {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { state: true },
      });
      input = { ...input, companyState: company?.state || null };
    }
    return SalesCalculationService.calculateInvoice(input);
  }

  // ─── Draft CRUD ───────────────────────────────────────────────────────────

  public async createDraft(
    companyId: string,
    dto: SalesInvoiceCreateDTO,
    userId?: string,
  ): Promise<SalesInvoice> {
    if (!dto.items || dto.items.length === 0) {
      throw new ValidationError('Sales invoice must have at least one item.');
    }

    // Validate/resolve items
    const { itemsData, calculation, customerSnap, company } =
      await this._buildInvoiceData(companyId, dto, userId);

    // Generate invoice number
    const invoiceNumber = await this.sequenceService.getNextNumber(
      companyId,
      company.invoicePrefix || 'INV',
    );

    // Resolve location
    const locationId = await this._resolveLocationId(companyId, dto.locationId);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await this.repo.create(
        {
          companyId,
          customerId: dto.customerId || null,
          invoiceNumber,
          invoiceType: dto.invoiceType || 'RETAIL',
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          locationId,
          status: 'DRAFT',
          ...customerSnap,
          subtotal: calculation.subtotal,
          lineDiscountTotal: calculation.lineDiscountTotal,
          invoiceDiscount: calculation.invoiceDiscount,
          taxableAmount: calculation.taxableAmount,
          cgstAmount: calculation.cgstAmount,
          sgstAmount: calculation.sgstAmount,
          igstAmount: calculation.igstAmount,
          cessAmount: calculation.cessAmount,
          otherTaxAmount: calculation.otherTaxAmount,
          additionalCharges: calculation.additionalCharges,
          roundOff: calculation.roundOff,
          grandTotal: calculation.grandTotal,
          amountPaid: 0,
          amountReturned: 0,
          paymentStatus: 'UNPAID',
          notes: dto.notes?.trim() || null,
          createdBy: userId || null,
        },
        itemsData,
        tx,
      );

      await this.auditService.log(
        {
          companyId,
          userId: userId || null,
          action: 'SALES_DRAFT_CREATED',
          module: 'SALES',
          referenceId: invoice.id,
          newValue: JSON.stringify({ invoiceNumber, grandTotal: calculation.grandTotal }),
        },
        tx,
      );

      return invoice;
    });
  }

  public async updateDraft(
    companyId: string,
    id: string,
    dto: SalesInvoiceUpdateDTO,
    userId?: string,
  ): Promise<SalesInvoice> {
    const existing = await this.repo.findById(id, companyId);
    if (!existing) throw new NotFoundError('Sales invoice not found.');
    if (existing.status !== 'DRAFT') {
      throw new BusinessRuleError('Only draft invoices can be edited.');
    }

    let itemsData: Prisma.SalesInvoiceItemUncheckedCreateWithoutSalesInvoiceInput[] | undefined;
    let calculation: SalesCalculationResult | undefined;
    let customerSnap: Record<string, string | null> = {};

    if (dto.items && dto.items.length > 0) {
      const buildResult = await this._buildInvoiceData(companyId, dto as SalesInvoiceCreateDTO, userId);
      itemsData = buildResult.itemsData;
      calculation = buildResult.calculation;
      customerSnap = buildResult.customerSnap;
    }

    const updated = await this.repo.update(
      id,
      {
        ...(dto.customerId !== undefined && { customerId: dto.customerId || null }),
        ...(dto.invoiceType !== undefined && { invoiceType: dto.invoiceType }),
        ...(dto.invoiceDate !== undefined && { invoiceDate: new Date(dto.invoiceDate) }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.locationId !== undefined && { locationId: dto.locationId }),
        ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
        ...(calculation && {
          ...customerSnap,
          subtotal: calculation.subtotal,
          lineDiscountTotal: calculation.lineDiscountTotal,
          invoiceDiscount: calculation.invoiceDiscount,
          taxableAmount: calculation.taxableAmount,
          cgstAmount: calculation.cgstAmount,
          sgstAmount: calculation.sgstAmount,
          igstAmount: calculation.igstAmount,
          cessAmount: calculation.cessAmount,
          otherTaxAmount: calculation.otherTaxAmount,
          additionalCharges: calculation.additionalCharges,
          roundOff: calculation.roundOff,
          grandTotal: calculation.grandTotal,
        }),
        updatedBy: userId || null,
      },
      itemsData,
    );

    await this.auditService.log({
      companyId,
      userId: userId || null,
      action: 'SALES_DRAFT_UPDATED',
      module: 'SALES',
      referenceId: id,
    });

    return updated;
  }

  public async cancelDraft(
    companyId: string,
    id: string,
    reason?: string,
    userId?: string,
  ): Promise<SalesInvoice> {
    const existing = await this.repo.findById(id, companyId);
    if (!existing) throw new NotFoundError('Sales invoice not found.');
    if (existing.status !== 'DRAFT') {
      throw new BusinessRuleError('Only draft invoices can be cancelled.');
    }

    const updated = await this.repo.update(id, {
      status: 'CANCELLED',
      notes: reason?.trim() || existing.notes || null,
      updatedBy: userId || null,
    });

    await this.auditService.log({
      companyId,
      userId: userId || null,
      action: 'SALES_CANCELLED',
      module: 'SALES',
      referenceId: id,
    });

    return updated;
  }

  // ─── Post Sale (Atomic) ────────────────────────────────────────────────────

  /**
   * Atomic sale posting:
   * 1. Validate draft state
   * 2. Recalculate totals authoritatively
   * 3. Validate stock per item
   * 4. Mark invoice POSTED
   * 5. Create stock SALE movements (negative qty)
   * 6. Create CustomerLedger SALE entry (if customer)
   * 7. Create SalesPayment record(s) and CustomerLedger PAYMENT entries
   * 8. Update paymentStatus on invoice
   * 9. Write audit log
   */
  public async postSale(
    companyId: string,
    id: string,
    dto: SalesPostDTO,
    userId?: string,
  ): Promise<SalesInvoice> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch & lock draft
      const invoice = await tx.salesInvoice.findUnique({
        where: { id },
        include: {
          items: true,
          customer: { select: { id: true, name: true, currentBalance: true, creditLimit: true, state: true } },
          location: true,
        },
      });

      if (!invoice || invoice.companyId !== companyId) {
        throw new NotFoundError('Sales invoice not found.');
      }
      if (invoice.status === 'POSTED') {
        throw new BusinessRuleError('This invoice has already been posted.');
      }
      if (invoice.status === 'CANCELLED') {
        throw new BusinessRuleError('Cancelled invoices cannot be posted.');
      }
      if (!invoice.items || invoice.items.length === 0) {
        throw new BusinessRuleError('Cannot post an invoice with no items.');
      }

      // 2. Resolve location
      let locationId = invoice.locationId;
      if (!locationId) {
        const defaultLoc = await tx.inventoryLocation.findFirst({
          where: { companyId, isDefault: true },
        });
        if (!defaultLoc) throw new BusinessRuleError('No default inventory location found.');
        locationId = defaultLoc.id;
      }

      // 3. Validate payments total
      const totalPayments = SalesCalculationService.round(
        (dto.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0),
        2,
      );

      // 3b. Validate Negative Stock Policy
      const negativeStockSetting = await tx.setting.findUnique({
        where: { companyId_key: { companyId, key: 'allowNegativeStock' } },
      });
      const allowNegative = negativeStockSetting?.value === 'true';

      if (!allowNegative) {
        for (const item of invoice.items) {
          const prod = await tx.product.findUnique({
            where: { id: item.productId },
            select: { id: true, name: true, trackStock: true, productType: true, currentStock: true },
          });
          if (prod && prod.trackStock && prod.productType === 'PHYSICAL') {
            if (prod.currentStock < item.quantity) {
              throw new BusinessRuleError(
                `Insufficient stock for product '${prod.name}'. Available: ${prod.currentStock}, required: ${item.quantity}. Negative stock is disabled in settings.`,
              );
            }
          }
        }
      }

      // 4. Mark invoice POSTED
      const posted = await tx.salesInvoice.update({
        where: { id },
        data: {
          status: 'POSTED',
          locationId,
          amountPaid: totalPayments,
          paymentStatus: totalPayments <= 0
            ? 'UNPAID'
            : totalPayments >= invoice.grandTotal
            ? 'PAID'
            : 'PARTIALLY_PAID',
          postedBy: userId || null,
          postedAt: new Date(),
          updatedBy: userId || null,
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, trackStock: true, productType: true } },
            },
          },
          customer: { select: { id: true, name: true, customerCode: true } },
          location: { select: { id: true, name: true } },
          salesPayments: true,
          salesReturns: { select: { id: true } },
        },
      });

      // 5. Record stock SALE movements (negative qty)
      for (const item of posted.items) {
        const product = item.product;
        if (!product || !product.trackStock || product.productType !== 'PHYSICAL') continue;

        await this.stockService.recordMovement({
          companyId,
          productId: item.productId,
          locationId: locationId!,
          movementType: 'SALE',
          quantity: -item.quantity,
          unitCost: item.unitCostSnapshot || 0,
          referenceType: 'SALE',
          referenceId: invoice.id,
          referenceNumber: invoice.invoiceNumber,
          notes: `Sale: ${invoice.invoiceNumber}`,
          userId,
          tx,
        });
      }

      // 6. Customer ledger SALE entry
      if (posted.customerId) {
        const prevBalance = await this.ledgerRepo.getLatestRunningBalance(posted.customerId, tx);
        await this.ledgerRepo.recordEntry(
          {
            companyId,
            customerId: posted.customerId,
            transactionType: 'SALE',
            referenceType: 'SALE',
            referenceId: invoice.id,
            referenceNumber: invoice.invoiceNumber,
            debitAmount: SalesCalculationService.round(invoice.grandTotal, 2),
            creditAmount: 0,
            runningBalance: SalesCalculationService.round(prevBalance + invoice.grandTotal, 2),
            description: `Sale Invoice: ${invoice.invoiceNumber}`,
            createdBy: userId || null,
          },
          tx,
        );
        // Update customer current balance
        await tx.customer.update({
          where: { id: posted.customerId },
          data: { currentBalance: { increment: invoice.grandTotal } },
        });
      }

      // 7. Create payment records + ledger entries
      for (let i = 0; i < (dto.payments || []).length; i++) {
        const p = dto.payments[i];
        if (!p.amount || p.amount <= 0) continue;

        const payAmt = SalesCalculationService.round(p.amount, 2);
        const pNumber = await this.sequenceService.getNextNumber(companyId, 'PAY', 6, tx);

        await tx.salesPayment.create({
          data: {
            companyId,
            customerId: posted.customerId || null,
            salesInvoiceId: id,
            paymentNumber: pNumber,
            paymentDate: p.paymentDate ? new Date(p.paymentDate) : new Date(),
            amount: payAmt,
            paymentMode: p.paymentMode || 'CASH',
            referenceNo: p.referenceNo || null,
            status: 'POSTED',
            notes: p.notes?.trim() || null,
            createdBy: userId || null,
          },
        });

        // Record Cash Register movement if paymentMode is CASH
        if ((p.paymentMode || 'CASH') === 'CASH') {
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
                movementType: 'CASH_SALE',
                amount: payAmt,
                movementDate: p.paymentDate ? new Date(p.paymentDate) : new Date(),
                referenceType: 'SALE',
                referenceId: id,
                referenceNumber: invoice.invoiceNumber,
                description: `Cash Sale ${invoice.invoiceNumber}`,
                createdBy: userId || null,
              },
            });
          }
        }

        // Customer ledger PAYMENT entry
        if (posted.customerId) {
          const prevBal = await this.ledgerRepo.getLatestRunningBalance(posted.customerId, tx);
          await this.ledgerRepo.recordEntry(
            {
              companyId,
              customerId: posted.customerId,
              transactionType: 'PAYMENT',
              referenceType: 'PAYMENT',
              referenceId: id,
              referenceNumber: pNumber,
              debitAmount: 0,
              creditAmount: payAmt,
              runningBalance: SalesCalculationService.round(prevBal - payAmt, 2),
              description: `Payment for ${invoice.invoiceNumber} via ${p.paymentMode}`,
              createdBy: userId || null,
            },
            tx,
          );
          // Update customer current balance
          await tx.customer.update({
            where: { id: posted.customerId },
            data: { currentBalance: { decrement: payAmt } },
          });
        }
      }

      // 8. Audit log
      await this.auditService.log(
        {
          companyId,
          userId: userId || null,
          action: 'SALES_POSTED',
          module: 'SALES',
          referenceId: id,
          newValue: JSON.stringify({
            invoiceNumber: invoice.invoiceNumber,
            grandTotal: invoice.grandTotal,
            amountPaid: totalPayments,
          }),
        },
        tx,
      );

      return posted as unknown as SalesInvoice;
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async _resolveLocationId(
    companyId: string,
    locationId?: string | null,
  ): Promise<string | null> {
    if (locationId) return locationId;
    try {
      const defaultLoc = await this.locationRepo.getDefault(companyId);
      return defaultLoc.id;
    } catch {
      return null;
    }
  }

  private async _buildInvoiceData(
    companyId: string,
    dto: SalesInvoiceCreateDTO,
    _userId?: string,
  ): Promise<{
    itemsData: Prisma.SalesInvoiceItemUncheckedCreateWithoutSalesInvoiceInput[];
    calculation: SalesCalculationResult;
    customerSnap: Record<string, string | null>;
    company: { invoicePrefix: string; state: string | null };
  }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { invoicePrefix: true, state: true },
    });
    if (!company) throw new NotFoundError('Company not found.');

    // Resolve customer snapshot
    let customerSnap: Record<string, string | null> = {
      customerNameSnapshot: null,
      customerPhoneSnapshot: null,
      customerAddressSnapshot: null,
      customerGstinSnapshot: null,
    };
    let customerState: string | null = null;

    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
        select: { name: true, phone: true, addressLine1: true, gstin: true, state: true, companyId: true },
      });
      if (!customer || customer.companyId !== companyId) {
        throw new NotFoundError(`Customer not found.`);
      }
      customerSnap = {
        customerNameSnapshot: customer.name,
        customerPhoneSnapshot: customer.phone || null,
        customerAddressSnapshot: customer.addressLine1 || null,
        customerGstinSnapshot: customer.gstin || null,
      };
      customerState = customer.state || null;
    }

    // Build calculation items and validate products
    const calculationItems: Parameters<typeof SalesCalculationService.calculateInvoice>[0]['items'] = [];
    const productSnapshots: {
      productId: string;
      name: string;
      sku: string | null;
      barcode: string | null;
      hsnCode: string | null;
      unitName: string | null;
      sellingPrice: number;
      purchasePrice: number;
    }[] = [];

    for (const item of dto.items) {
      if (item.quantity <= 0) {
        throw new ValidationError('Item quantity must be greater than zero.');
      }

      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        include: { unit: true },
      });

      if (!product || product.companyId !== companyId) {
        throw new BusinessRuleError(`Product ${item.productId} not found.`);
      }
      if (!product.isActive) {
        throw new BusinessRuleError(`Product "${product.name}" is inactive.`);
      }
      if (product.unit && !product.unit.allowDecimals && !Number.isInteger(item.quantity)) {
        throw new ValidationError(
          `Unit "${product.unit.shortCode}" does not allow decimal quantities.`,
        );
      }

      // Use provided rate or product's selling price
      const sellingRate =
        item.sellingRate !== undefined
          ? item.sellingRate
          : (item.unitPrice !== undefined ? item.unitPrice : product.sellingPrice);

      productSnapshots.push({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        hsnCode: product.hsnCode,
        unitName: product.unit?.name || null,
        sellingPrice: sellingRate,
        purchasePrice: product.purchasePrice,
      });

      calculationItems.push({
        productId: product.id,
        quantity: item.quantity,
        sellingRate,
        discountPercentage: item.discountPercentage,
        discountAmount: item.discountAmount,
        taxRate: item.taxRate !== undefined ? item.taxRate : product.taxRate,
      });
    }

    const calculation = SalesCalculationService.calculateInvoice({
      isInterstate: dto.isInterstate,
      companyState: company.state || null,
      customerState,
      invoiceDiscount: dto.invoiceDiscount,
      additionalCharges: dto.additionalCharges,
      roundOff: dto.roundOff,
      items: calculationItems,
    });

    const itemsData: Prisma.SalesInvoiceItemUncheckedCreateWithoutSalesInvoiceInput[] =
      calculation.items.map((calcItem, idx) => {
        const snap = productSnapshots[idx];
        return {
          companyId,
          productId: calcItem.productId!,
          productNameSnapshot: snap.name,
          skuSnapshot: snap.sku || null,
          barcodeSnapshot: snap.barcode || null,
          unitNameSnapshot: snap.unitName || null,
          hsnCodeSnapshot: snap.hsnCode || null,
          quantity: calcItem.quantity,
          sellingRate: calcItem.sellingRate,
          discountPercentage: calcItem.discountPercentage,
          discountAmount: calcItem.discountAmount,
          taxableAmount: calcItem.taxableAmount,
          taxRate: calcItem.taxRate,
          cgstRate: calcItem.cgstRate,
          sgstRate: calcItem.sgstRate,
          igstRate: calcItem.igstRate,
          cessRate: calcItem.cessRate,
          cgstAmount: calcItem.cgstAmount,
          sgstAmount: calcItem.sgstAmount,
          igstAmount: calcItem.igstAmount,
          cessAmount: calcItem.cessAmount,
          taxAmount: calcItem.taxAmount,
          lineTotal: calcItem.lineTotal,
          unitCostSnapshot: snap.purchasePrice,
        };
      });

    return { itemsData, calculation, customerSnap, company };
  }
}
