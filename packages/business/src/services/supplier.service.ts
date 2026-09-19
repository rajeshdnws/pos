import { PrismaClient } from '@prisma/client';
import {
  PaginatedResult,
  Supplier,
  SupplierCreateDTO,
  SupplierFilterDTO,
  SupplierUpdateDTO,
} from '@rs-inventory/types';
import { BusinessRuleError, ConflictError, ValidationError } from '../errors/app.error.js';
import { SupplierLedgerRepository } from '../repositories/supplier-ledger.repository.js';
import { SupplierRepository } from '../repositories/supplier.repository.js';
import { AuditService } from './audit.service.js';
import { PurchaseCalculationService } from './purchase-calculation.service.js';
import { SequenceService } from './sequence.service.js';

export class SupplierService {
  private repo: SupplierRepository;
  private ledgerRepo: SupplierLedgerRepository;
  private sequenceService: SequenceService;
  private auditService: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new SupplierRepository(prisma);
    this.ledgerRepo = new SupplierLedgerRepository(prisma);
    this.sequenceService = new SequenceService(prisma);
    this.auditService = new AuditService(prisma);
  }

  public async getSuppliers(
    companyId: string,
    filters?: SupplierFilterDTO,
  ): Promise<PaginatedResult<Supplier>> {
    return this.repo.findMany(companyId, filters);
  }

  public async getSupplierById(companyId: string, id: string): Promise<Supplier | null> {
    return this.repo.findById(id, companyId);
  }

  public async generateSupplierCode(companyId: string): Promise<string> {
    return this.sequenceService.getNextNumber(companyId, 'SUP', 3);
  }

  public async createSupplier(
    companyId: string,
    dto: SupplierCreateDTO,
    userId?: string,
  ): Promise<Supplier> {
    // 1. Validation
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Supplier name is required.');
    }

    let supplierCode = dto.supplierCode?.trim();
    if (!supplierCode) {
      supplierCode = await this.generateSupplierCode(companyId);
    }

    // Check code uniqueness within company
    const existing = await this.repo.findByCode(companyId, supplierCode);
    if (existing) {
      throw new ConflictError(
        `Supplier with code "${supplierCode}" already exists in this company.`,
      );
    }

    // GSTIN format validation (Offline regex check)
    if (dto.gstin && dto.gstin.trim().length > 0) {
      const gstinTrimmed = dto.gstin.trim().toUpperCase();
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(gstinTrimmed)) {
        throw new ValidationError(
          `Invalid Indian GSTIN format: "${dto.gstin}". GSTIN must be 15 alphanumeric characters (e.g. 27ABCDE1234F1Z5).`,
        );
      }
    }

    const openingBalance = PurchaseCalculationService.round(dto.openingBalance || 0, 2);
    const openingBalanceType = dto.openingBalanceType || 'PAYABLE';
    let currentBalance = 0;

    if (openingBalance > 0) {
      currentBalance = openingBalanceType === 'PAYABLE' ? openingBalance : -openingBalance;
    }

    return this.prisma.$transaction(async (tx) => {
      const created = await this.repo.create(
        {
          companyId,
          supplierCode,
          name: dto.name.trim(),
          contactPerson: dto.contactPerson?.trim() || null,
          phone: dto.phone?.trim() || null,
          alternatePhone: dto.alternatePhone?.trim() || null,
          email: dto.email?.trim() || null,
          website: dto.website?.trim() || null,
          addressLine1: dto.addressLine1?.trim() || null,
          addressLine2: dto.addressLine2?.trim() || null,
          city: dto.city?.trim() || null,
          state: dto.state?.trim() || null,
          pinCode: dto.pinCode?.trim() || null,
          country: dto.country?.trim() || 'India',
          gstin: dto.gstin?.trim()?.toUpperCase() || null,
          pan: dto.pan?.trim()?.toUpperCase() || null,
          registrationType: dto.registrationType || 'UNREGISTERED',
          openingBalance,
          openingBalanceType,
          openingBalanceDate: dto.openingBalanceDate ? new Date(dto.openingBalanceDate) : new Date(),
          creditLimit: PurchaseCalculationService.round(dto.creditLimit || 0, 2),
          creditPeriodDays: dto.creditPeriodDays || 0,
          notes: dto.notes?.trim() || null,
          currentBalance,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
          createdBy: userId || null,
        },
        tx,
      );

      // Record Opening Balance in Supplier Ledger if balance != 0
      if (openingBalance > 0) {
        const isPayable = openingBalanceType === 'PAYABLE';
        await this.ledgerRepo.recordEntry(
          {
            companyId,
            supplierId: created.id,
            entryDate: dto.openingBalanceDate ? new Date(dto.openingBalanceDate) : new Date(),
            transactionType: 'OPENING_BALANCE',
            referenceType: 'OPENING',
            referenceNumber: 'OPENING',
            debitAmount: isPayable ? 0 : openingBalance,
            creditAmount: isPayable ? openingBalance : 0,
            runningBalance: currentBalance,
            description: `Opening Balance (${openingBalanceType})`,
            createdBy: userId || null,
          },
          tx,
        );
      }

      await this.auditService.log(
        {
          companyId,
          userId: userId || null,
          action: 'SUPPLIER_CREATED',
          module: 'SUPPLIERS',
          referenceId: created.id,
          newValue: JSON.stringify({
            supplierCode: created.supplierCode,
            name: created.name,
            currentBalance: created.currentBalance,
          }),
        },
        tx,
      );

      return created;
    });
  }

  public async updateSupplier(
    companyId: string,
    id: string,
    dto: SupplierUpdateDTO,
    userId?: string,
  ): Promise<Supplier> {
    const existing = await this.repo.findById(id, companyId);
    if (!existing) {
      throw new BusinessRuleError('Supplier not found.');
    }

    if (dto.name !== undefined && dto.name.trim().length === 0) {
      throw new ValidationError('Supplier name cannot be empty.');
    }

    if (dto.supplierCode && dto.supplierCode.trim() !== existing.supplierCode) {
      const codeCheck = await this.repo.findByCode(companyId, dto.supplierCode.trim());
      if (codeCheck && codeCheck.id !== id) {
        throw new ConflictError(
          `Supplier code "${dto.supplierCode}" is already in use by another supplier.`,
        );
      }
    }

    if (dto.gstin && dto.gstin.trim().length > 0) {
      const gstinTrimmed = dto.gstin.trim().toUpperCase();
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(gstinTrimmed)) {
        throw new ValidationError(
          `Invalid Indian GSTIN format: "${dto.gstin}". GSTIN must be 15 alphanumeric characters.`,
        );
      }
    }

    const updated = await this.repo.update(id, {
      ...(dto.supplierCode && { supplierCode: dto.supplierCode.trim() }),
      ...(dto.name && { name: dto.name.trim() }),
      ...(dto.contactPerson !== undefined && { contactPerson: dto.contactPerson?.trim() || null }),
      ...(dto.phone !== undefined && { phone: dto.phone?.trim() || null }),
      ...(dto.alternatePhone !== undefined && { alternatePhone: dto.alternatePhone?.trim() || null }),
      ...(dto.email !== undefined && { email: dto.email?.trim() || null }),
      ...(dto.website !== undefined && { website: dto.website?.trim() || null }),
      ...(dto.addressLine1 !== undefined && { addressLine1: dto.addressLine1?.trim() || null }),
      ...(dto.addressLine2 !== undefined && { addressLine2: dto.addressLine2?.trim() || null }),
      ...(dto.city !== undefined && { city: dto.city?.trim() || null }),
      ...(dto.state !== undefined && { state: dto.state?.trim() || null }),
      ...(dto.pinCode !== undefined && { pinCode: dto.pinCode?.trim() || null }),
      ...(dto.country !== undefined && { country: dto.country?.trim() || 'India' }),
      ...(dto.gstin !== undefined && { gstin: dto.gstin?.trim()?.toUpperCase() || null }),
      ...(dto.pan !== undefined && { pan: dto.pan?.trim()?.toUpperCase() || null }),
      ...(dto.registrationType && { registrationType: dto.registrationType }),
      ...(dto.creditLimit !== undefined && {
        creditLimit: PurchaseCalculationService.round(dto.creditLimit, 2),
      }),
      ...(dto.creditPeriodDays !== undefined && { creditPeriodDays: dto.creditPeriodDays }),
      ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      updatedBy: userId || null,
    });

    await this.auditService.log({
      companyId,
      userId: userId || null,
      action: 'SUPPLIER_UPDATED',
      module: 'SUPPLIERS',
      referenceId: updated.id,
      oldValue: JSON.stringify({ name: existing.name, supplierCode: existing.supplierCode }),
      newValue: JSON.stringify({ name: updated.name, supplierCode: updated.supplierCode }),
    });

    return updated;
  }

  public async toggleSupplierActive(
    companyId: string,
    id: string,
    userId?: string,
  ): Promise<Supplier> {
    const existing = await this.repo.findById(id, companyId);
    if (!existing) {
      throw new BusinessRuleError('Supplier not found.');
    }

    const updated = await this.repo.update(id, {
      isActive: !existing.isActive,
      updatedBy: userId || null,
    });

    await this.auditService.log({
      companyId,
      userId: userId || null,
      action: updated.isActive ? 'SUPPLIER_ACTIVATED' : 'SUPPLIER_DEACTIVATED',
      module: 'SUPPLIERS',
      referenceId: updated.id,
    });

    return updated;
  }

  public async deleteSupplier(
    companyId: string,
    id: string,
    userId?: string,
  ): Promise<boolean> {
    const existing = await this.repo.findById(id, companyId);
    if (!existing) {
      throw new BusinessRuleError('Supplier not found.');
    }

    const hasTx = await this.repo.hasTransactions(id);
    if (hasTx) {
      throw new BusinessRuleError(
        'Cannot delete supplier because related purchases or payments exist. Deactivate the supplier instead.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.supplierLedger.deleteMany({ where: { supplierId: id } });
      await this.repo.delete(id, tx);
      await this.auditService.log(
        {
          companyId,
          userId: userId || null,
          action: 'SUPPLIER_DELETED',
          module: 'SUPPLIERS',
          referenceId: id,
          oldValue: JSON.stringify({ name: existing.name, supplierCode: existing.supplierCode }),
        },
        tx,
      );
      return true;
    });
  }
}

