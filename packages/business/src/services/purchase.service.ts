import { Prisma, PrismaClient } from '@prisma/client';
import {
  PaginatedResult,
  Purchase,
  PurchaseCalculationInput,
  PurchaseCalculationResult,
  PurchaseDashboardKPIs,
  PurchaseDraftCreateDTO,
  PurchaseDraftUpdateDTO,
  PurchaseFilterDTO,
  PurchaseSummaryDTO,
} from '@rs-inventory/types';
import { BusinessRuleError, NotFoundError, ValidationError } from '../errors/app.error.js';
import { LocationRepository } from '../repositories/location.repository.js';
import { PurchaseRepository } from '../repositories/purchase.repository.js';
import { SupplierRepository } from '../repositories/supplier.repository.js';
import { AuditService } from './audit.service.js';
import { PurchaseCalculationService } from './purchase-calculation.service.js';
import { SequenceService } from './sequence.service.js';
import { StockService } from './stock.service.js';

export class PurchaseService {
  private repo: PurchaseRepository;
  private supplierRepo: SupplierRepository;
  private locationRepo: LocationRepository;
  private stockService: StockService;
  private sequenceService: SequenceService;
  private auditService: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new PurchaseRepository(prisma);
    this.supplierRepo = new SupplierRepository(prisma);
    this.locationRepo = new LocationRepository(prisma);
    this.stockService = new StockService(prisma);
    this.sequenceService = new SequenceService(prisma);
    this.auditService = new AuditService(prisma);
  }

  public async getPurchases(
    companyId: string,
    filters?: PurchaseFilterDTO,
  ): Promise<PaginatedResult<Purchase>> {
    return this.repo.findMany(companyId, filters);
  }

  public async getPurchaseById(companyId: string, id: string): Promise<Purchase | null> {
    return this.repo.findById(id, companyId);
  }

  public async getSummary(companyId: string): Promise<PurchaseSummaryDTO> {
    return this.repo.getSummary(companyId);
  }

  public async getKPIs(companyId: string): Promise<PurchaseDashboardKPIs> {
    return this.repo.getKPIs(companyId);
  }

  public async calculate(
    companyId: string,
    input: PurchaseCalculationInput,
  ): Promise<PurchaseCalculationResult> {
    let companyState = input.companyState;
    if (!companyState) {
      const company = await this.prisma.company.findUnique({ where: { id: companyId } });
      companyState = company?.state || null;
    }

    return PurchaseCalculationService.calculateInvoice({
      ...input,
      companyState,
    });
  }

  public async createPurchase(
    companyId: string,
    dto: PurchaseDraftCreateDTO,
    userId?: string,
  ): Promise<Purchase> {
    return this.createDraft(companyId, dto, userId);
  }

  public async createDraft(
    companyId: string,
    dto: PurchaseDraftCreateDTO,
    userId?: string,
  ): Promise<Purchase> {
    // 1. Validate Supplier
    if (!dto.supplierId) {
      throw new ValidationError('Supplier is required for creating a purchase.');
    }
    const supplier = await this.supplierRepo.findById(dto.supplierId, companyId);
    if (!supplier) {
      throw new NotFoundError('Selected supplier does not exist.');
    }
    if (!supplier.isActive) {
      throw new BusinessRuleError('Cannot create purchase for an inactive supplier.');
    }

    // 2. Validate Items
    if (!dto.items || dto.items.length === 0) {
      throw new ValidationError('At least one product item is required in the purchase.');
    }

    // 3. Resolve Location
    let locationId = dto.locationId;
    if (!locationId) {
      const defaultLoc = await this.locationRepo.getDefault(companyId);
      locationId = defaultLoc.id;
    }
    const location = await this.locationRepo.findById(locationId);
    if (!location || location.companyId !== companyId) {
      throw new BusinessRuleError('Invalid storage location selected.');
    }

    // 4. Validate Products & build snapshots
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const companyState = company?.state || null;

    const calculationInputItems = [];
    const productSnapshots: {
      productId: string;
      name: string;
      sku: string | null;
      barcode: string | null;
      unitName: string | null;
    }[] = [];

    for (const item of dto.items) {
      if (!item.productId) {
        throw new ValidationError('Each line item must have a valid productId.');
      }
      if (item.quantity <= 0) {
        throw new ValidationError('Item quantity must be greater than zero.');
      }
      if (item.purchaseRate < 0) {
        throw new ValidationError('Item purchase rate cannot be negative.');
      }

      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        include: { unit: true },
      });

      if (!product || product.companyId !== companyId) {
        throw new BusinessRuleError(`Product with ID ${item.productId} does not exist.`);
      }
      if (!product.isActive) {
        throw new BusinessRuleError(`Product "${product.name}" is inactive.`);
      }

      // Check unit decimals
      if (product.unit && !product.unit.allowDecimals && !Number.isInteger(item.quantity)) {
        throw new ValidationError(
          `Unit "${product.unit.shortCode}" does not allow decimal quantities (${item.quantity}).`,
        );
      }

      productSnapshots.push({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        unitName: product.unit?.name || null,
      });

      calculationInputItems.push({
        productId: product.id,
        quantity: item.quantity,
        freeQuantity: item.freeQuantity || 0,
        purchaseRate: item.purchaseRate,
        discountPercentage: item.discountPercentage,
        discountAmount: item.discountAmount,
        taxRate: item.taxRate !== undefined ? item.taxRate : product.taxRate,
      });
    }

    // 5. Run Calculation Engine
    const calculation = PurchaseCalculationService.calculateInvoice({
      supplierState: supplier.state,
      companyState,
      invoiceDiscount: dto.invoiceDiscount,
      additionalCharges: dto.additionalCharges,
      roundOff: dto.roundOff,
      items: calculationInputItems,
    });

    // 6. Generate Purchase Number & Save
    const purchaseNumber = await this.sequenceService.getNextNumber(companyId, 'PUR', 6);

    const purchaseItemsData: Prisma.PurchaseItemUncheckedCreateWithoutPurchaseInput[] =
      calculation.items.map((calcItem, idx) => {
        const snap = productSnapshots[idx];
        return {
          productId: calcItem.productId!,
          productNameSnapshot: snap?.name || '',
          skuSnapshot: snap?.sku || null,
          barcodeSnapshot: snap?.barcode || null,
          unitNameSnapshot: snap?.unitName || null,
          quantity: calcItem.quantity,
          freeQuantity: calcItem.freeQuantity,
          purchaseRate: calcItem.purchaseRate,
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
        };
      });

    const purchase = await this.repo.create(
      {
        companyId,
        supplierId: supplier.id,
        purchaseNumber,
        supplierInvoiceNumber: dto.supplierInvoiceNumber?.trim() || null,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        locationId,
        status: 'DRAFT',
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
        internalReference: dto.internalReference?.trim() || null,
        createdBy: userId || null,
      },
      purchaseItemsData,
    );

    await this.auditService.log({
      companyId,
      userId: userId || null,
      action: 'PURCHASE_DRAFT_CREATED',
      module: 'PURCHASE',
      referenceId: purchase.id,
      newValue: JSON.stringify({
        purchaseNumber: purchase.purchaseNumber,
        grandTotal: purchase.grandTotal,
      }),
    });

    return purchase;
  }

  public async updateDraft(
    companyId: string,
    id: string,
    dto: PurchaseDraftUpdateDTO,
    userId?: string,
  ): Promise<Purchase> {
    const existing = await this.repo.findById(id, companyId);
    if (!existing) {
      throw new NotFoundError('Purchase not found.');
    }
    if (existing.status !== 'DRAFT') {
      throw new BusinessRuleError('Only draft purchases can be edited.');
    }

    const supplierId = dto.supplierId || existing.supplierId;
    const supplier = await this.supplierRepo.findById(supplierId, companyId);
    if (!supplier) {
      throw new NotFoundError('Supplier not found.');
    }

    const locationId = dto.locationId !== undefined ? dto.locationId : existing.locationId;
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const companyState = company?.state || null;

    let purchaseItemsData: Prisma.PurchaseItemUncheckedCreateWithoutPurchaseInput[] | undefined;
    let calculationResult: PurchaseCalculationResult | undefined;

    if (dto.items && dto.items.length > 0) {
      const calculationInputItems = [];
      const productSnapshots: {
        productId: string;
        name: string;
        sku: string | null;
        barcode: string | null;
        unitName: string | null;
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
          throw new BusinessRuleError(`Product with ID ${item.productId} does not exist.`);
        }

        if (product.unit && !product.unit.allowDecimals && !Number.isInteger(item.quantity)) {
          throw new ValidationError(
            `Unit "${product.unit.shortCode}" does not allow decimal quantities (${item.quantity}).`,
          );
        }

        productSnapshots.push({
          productId: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          unitName: product.unit?.name || null,
        });

        calculationInputItems.push({
          productId: product.id,
          quantity: item.quantity,
          freeQuantity: item.freeQuantity || 0,
          purchaseRate: item.purchaseRate,
          discountPercentage: item.discountPercentage,
          discountAmount: item.discountAmount,
          taxRate: item.taxRate !== undefined ? item.taxRate : product.taxRate,
        });
      }

      calculationResult = PurchaseCalculationService.calculateInvoice({
        supplierState: supplier.state,
        companyState,
        invoiceDiscount: dto.invoiceDiscount !== undefined ? dto.invoiceDiscount : existing.invoiceDiscount,
        additionalCharges:
          dto.additionalCharges !== undefined ? dto.additionalCharges : existing.additionalCharges,
        roundOff: dto.roundOff !== undefined ? dto.roundOff : existing.roundOff,
        items: calculationInputItems,
      });

      purchaseItemsData = calculationResult.items.map((calcItem, idx) => {
        const snap = productSnapshots[idx];
        return {
          productId: calcItem.productId!,
          productNameSnapshot: snap?.name || '',
          skuSnapshot: snap?.sku || null,
          barcodeSnapshot: snap?.barcode || null,
          unitNameSnapshot: snap?.unitName || null,
          quantity: calcItem.quantity,
          freeQuantity: calcItem.freeQuantity,
          purchaseRate: calcItem.purchaseRate,
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
        };
      });
    }

    const updated = await this.repo.update(
      id,
      {
        ...(dto.supplierId && { supplierId: dto.supplierId }),
        ...(dto.supplierInvoiceNumber !== undefined && {
          supplierInvoiceNumber: dto.supplierInvoiceNumber?.trim() || null,
        }),
        ...(dto.purchaseDate && { purchaseDate: new Date(dto.purchaseDate) }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
        ...(locationId !== undefined && { locationId }),
        ...(calculationResult && {
          subtotal: calculationResult.subtotal,
          lineDiscountTotal: calculationResult.lineDiscountTotal,
          invoiceDiscount: calculationResult.invoiceDiscount,
          taxableAmount: calculationResult.taxableAmount,
          cgstAmount: calculationResult.cgstAmount,
          sgstAmount: calculationResult.sgstAmount,
          igstAmount: calculationResult.igstAmount,
          cessAmount: calculationResult.cessAmount,
          otherTaxAmount: calculationResult.otherTaxAmount,
          additionalCharges: calculationResult.additionalCharges,
          roundOff: calculationResult.roundOff,
          grandTotal: calculationResult.grandTotal,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
        ...(dto.internalReference !== undefined && {
          internalReference: dto.internalReference?.trim() || null,
        }),
        updatedBy: userId || null,
      },
      purchaseItemsData,
    );

    await this.auditService.log({
      companyId,
      userId: userId || null,
      action: 'PURCHASE_DRAFT_UPDATED',
      module: 'PURCHASE',
      referenceId: updated.id,
    });

    return updated;
  }

  public async postPurchase(companyId: string, id: string, userId?: string): Promise<Purchase> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch & lock purchase
      const purchase = await tx.purchase.findUnique({
        where: { id },
        include: {
          supplier: true,
          location: true,
          items: true,
        },
      });

      if (!purchase || purchase.companyId !== companyId) {
        throw new NotFoundError('Purchase record not found.');
      }

      if (purchase.status === 'POSTED') {
        throw new BusinessRuleError('This purchase has already been posted.');
      }

      if (purchase.status === 'CANCELLED') {
        throw new BusinessRuleError('Cancelled purchases cannot be posted.');
      }

      if (!purchase.items || purchase.items.length === 0) {
        throw new BusinessRuleError('Cannot post a purchase with no items.');
      }

      if (!purchase.supplier.isActive) {
        throw new BusinessRuleError('Cannot post purchase: Supplier is inactive.');
      }

      // 2. Resolve storage location
      let locationId = purchase.locationId;
      if (!locationId) {
        const defaultLoc = await tx.inventoryLocation.findFirst({
          where: { companyId, isDefault: true },
        });
        if (!defaultLoc) {
          throw new BusinessRuleError('No default storage location found.');
        }
        locationId = defaultLoc.id;
      }

      // 3. Mark Purchase as POSTED
      const posted = await tx.purchase.update({
        where: { id },
        data: {
          status: 'POSTED',
          locationId,
          postedBy: userId || null,
          postedAt: new Date(),
          updatedBy: userId || null,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          supplier: true,
        },
      });

      // 4. Create authoritative Stock Movements via Step 4 StockService
      for (const item of purchase.items) {
        const totalQtyReceived = item.quantity + (item.freeQuantity || 0);

        await this.stockService.recordMovement({
          companyId,
          productId: item.productId,
          locationId,
          movementType: 'PURCHASE_RECEIPT',
          quantity: totalQtyReceived,
          unitCost: item.purchaseRate,
          referenceType: 'PURCHASE',
          referenceId: purchase.id,
          referenceNumber: purchase.purchaseNumber,
          notes: `Purchase Receipt: ${purchase.purchaseNumber}${
            purchase.supplierInvoiceNumber ? ` (Vendor Inv: ${purchase.supplierInvoiceNumber})` : ''
          }`,
          userId,
          tx,
        });
      }

      // 5. Update Supplier Account Balance & Create Ledger Entry
      const supplier = await tx.supplier.findUnique({
        where: { id: purchase.supplierId },
      });

      const previousBalance = supplier ? supplier.currentBalance : 0;
      const newBalance = PurchaseCalculationService.round(
        previousBalance + purchase.grandTotal,
        2,
      );

      await tx.supplier.update({
        where: { id: purchase.supplierId },
        data: { currentBalance: newBalance },
      });

      await tx.supplierLedger.create({
        data: {
          companyId,
          supplierId: purchase.supplierId,
          entryDate: purchase.purchaseDate,
          transactionType: 'PURCHASE',
          referenceType: 'PURCHASE',
          referenceId: purchase.id,
          referenceNumber: purchase.purchaseNumber,
          debitAmount: 0,
          creditAmount: purchase.grandTotal,
          runningBalance: newBalance,
          description: `Purchase #${purchase.purchaseNumber}${
            purchase.supplierInvoiceNumber ? ` (Inv: ${purchase.supplierInvoiceNumber})` : ''
          }`,
          createdBy: userId || null,
        },
      });

      // 6. Audit Log
      await this.auditService.log(
        {
          companyId,
          userId: userId || null,
          action: 'PURCHASE_POSTED',
          module: 'PURCHASE',
          referenceId: purchase.id,
          newValue: JSON.stringify({
            purchaseNumber: purchase.purchaseNumber,
            grandTotal: purchase.grandTotal,
            newSupplierBalance: newBalance,
          }),
        },
        tx,
      );

      return posted as unknown as Purchase;
    });
  }

  public async cancelPurchase(
    companyId: string,
    id: string,
    reason?: string,
    userId?: string,
  ): Promise<Purchase> {
    const existing = await this.repo.findById(id, companyId);
    if (!existing) {
      throw new NotFoundError('Purchase not found.');
    }

    if (existing.status === 'POSTED') {
      throw new BusinessRuleError(
        'Posted purchases cannot be directly cancelled. Please use Purchase Return to reverse stock and credit.',
      );
    }

    if (existing.status === 'CANCELLED') {
      throw new BusinessRuleError('Purchase is already cancelled.');
    }

    const updated = await this.repo.update(id, {
      status: 'CANCELLED',
      notes: reason ? `${existing.notes ? existing.notes + ' | ' : ''}Cancelled: ${reason}` : existing.notes,
      updatedBy: userId || null,
    });

    await this.auditService.log({
      companyId,
      userId: userId || null,
      action: 'PURCHASE_CANCELLED',
      module: 'PURCHASE',
      referenceId: id,
      newValue: JSON.stringify({ reason }),
    });

    return updated;
  }
}
