import { PrismaClient } from '@prisma/client';
import {
  Customer,
  CustomerCreateDTO,
  CustomerFilterDTO,
  CustomerStatementDTO,
  CustomerUpdateDTO,
  PaginatedResult,
} from '@rs-inventory/types';
import { BusinessRuleError, NotFoundError, ValidationError } from '../errors/app.error.js';
import { CustomerLedgerRepository } from '../repositories/customer-ledger.repository.js';
import { CustomerRepository } from '../repositories/customer.repository.js';
import { AuditService } from './audit.service.js';
import { SalesCalculationService } from './sales-calculation.service.js';

/** Validates GSTIN format: 2-digit state code + 10-char PAN + 1Z + 1 check digit */
function isValidGstin(gstin: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.toUpperCase());
}

export class CustomerService {
  private repo: CustomerRepository;
  private ledgerRepo: CustomerLedgerRepository;
  private auditService: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new CustomerRepository(prisma);
    this.ledgerRepo = new CustomerLedgerRepository(prisma);
    this.auditService = new AuditService(prisma);
  }

  public async listCustomers(
    companyId: string,
    filters: CustomerFilterDTO = {},
  ): Promise<PaginatedResult<Customer>> {
    return this.repo.findMany(companyId, filters);
  }

  public async getCustomer(companyId: string, id: string): Promise<Customer> {
    const customer = await this.repo.findById(id, companyId);
    if (!customer) throw new NotFoundError('Customer not found.');
    return customer;
  }

  public async generateCode(companyId: string): Promise<string> {
    return this.repo.generateCode(companyId);
  }

  public async createCustomer(
    companyId: string,
    dto: CustomerCreateDTO,
    userId?: string,
  ): Promise<Customer> {
    if (!dto.name?.trim()) throw new ValidationError('Customer name is required.');

    // GSTIN validation
    if (dto.gstin?.trim()) {
      if (!isValidGstin(dto.gstin.trim())) {
        throw new ValidationError('Invalid GSTIN format.');
      }
    }

    // Auto-generate code if not provided
    let customerCode = dto.customerCode?.trim();
    if (!customerCode) {
      customerCode = await this.repo.generateCode(companyId);
    } else {
      // Check uniqueness
      const existing = await this.repo.findByCode(companyId, customerCode);
      if (existing) {
        throw new BusinessRuleError(`Customer code "${customerCode}" is already in use.`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const customer = await this.repo.create(
        {
          companyId,
          customerCode,
          name: dto.name.trim(),
          contactPerson: dto.contactPerson?.trim() || null,
          phone: dto.phone?.trim() || null,
          alternatePhone: dto.alternatePhone?.trim() || null,
          email: dto.email?.trim() || null,
          customerType: dto.customerType || 'INDIVIDUAL',
          addressLine1: dto.addressLine1?.trim() || null,
          addressLine2: dto.addressLine2?.trim() || null,
          city: dto.city?.trim() || null,
          state: dto.state?.trim() || null,
          pinCode: dto.pinCode?.trim() || null,
          country: dto.country?.trim() || 'India',
          gstin: dto.gstin?.trim() || null,
          registrationType: dto.registrationType || null,
          openingBalance: dto.openingBalance || 0,
          openingBalanceType: dto.openingBalanceType || 'RECEIVABLE',
          openingBalanceDate: dto.openingBalanceDate ? new Date(dto.openingBalanceDate) : null,
          creditLimit: dto.creditLimit || 0,
          creditPeriodDays: dto.creditPeriodDays || 0,
          notes: dto.notes?.trim() || null,
          currentBalance: dto.openingBalance || 0,
          isActive: dto.isActive !== false,
          createdBy: userId || null,
        },
        tx,
      );

      // Create opening balance ledger entry if non-zero
      const openingBalance = dto.openingBalance || 0;
      if (openingBalance !== 0) {
        const prevBalance = 0;
        const isReceivable =
          !dto.openingBalanceType || dto.openingBalanceType === 'RECEIVABLE';

        // RECEIVABLE: customer owes us (debit increases balance due to us)
        // ADVANCE: customer has paid in advance (credit decreases balance)
        await this.ledgerRepo.recordEntry(
          {
            companyId,
            customerId: customer.id,
            entryDate: dto.openingBalanceDate
              ? new Date(dto.openingBalanceDate)
              : new Date(),
            transactionType: 'OPENING_BALANCE',
            referenceType: 'OPENING',
            referenceId: customer.id,
            debitAmount: isReceivable ? Math.abs(openingBalance) : 0,
            creditAmount: isReceivable ? 0 : Math.abs(openingBalance),
            runningBalance: isReceivable
              ? SalesCalculationService.round(prevBalance + Math.abs(openingBalance), 2)
              : SalesCalculationService.round(prevBalance - Math.abs(openingBalance), 2),
            description: `Opening balance for ${customer.name}`,
            createdBy: userId || null,
          },
          tx,
        );
      }

      await this.auditService.log(
        {
          companyId,
          userId: userId || null,
          action: 'CUSTOMER_CREATED',
          module: 'CUSTOMERS',
          referenceId: customer.id,
          newValue: JSON.stringify({ customerCode: customer.customerCode, name: customer.name }),
        },
        tx,
      );

      return customer;
    });
  }

  public async updateCustomer(
    companyId: string,
    id: string,
    dto: CustomerUpdateDTO,
    userId?: string,
  ): Promise<Customer> {
    const existing = await this.repo.findById(id, companyId);
    if (!existing) throw new NotFoundError('Customer not found.');

    // GSTIN validation
    if (dto.gstin?.trim()) {
      if (!isValidGstin(dto.gstin.trim())) {
        throw new ValidationError('Invalid GSTIN format.');
      }
    }

    // Code uniqueness check
    if (dto.customerCode && dto.customerCode !== existing.customerCode) {
      const byCode = await this.repo.findByCode(companyId, dto.customerCode);
      if (byCode && byCode.id !== id) {
        throw new BusinessRuleError(`Customer code "${dto.customerCode}" is already in use.`);
      }
    }

    const updated = await this.repo.update(id, {
      ...(dto.customerCode !== undefined && { customerCode: dto.customerCode }),
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.contactPerson !== undefined && { contactPerson: dto.contactPerson?.trim() || null }),
      ...(dto.phone !== undefined && { phone: dto.phone?.trim() || null }),
      ...(dto.alternatePhone !== undefined && { alternatePhone: dto.alternatePhone?.trim() || null }),
      ...(dto.email !== undefined && { email: dto.email?.trim() || null }),
      ...(dto.customerType !== undefined && { customerType: dto.customerType }),
      ...(dto.addressLine1 !== undefined && { addressLine1: dto.addressLine1?.trim() || null }),
      ...(dto.addressLine2 !== undefined && { addressLine2: dto.addressLine2?.trim() || null }),
      ...(dto.city !== undefined && { city: dto.city?.trim() || null }),
      ...(dto.state !== undefined && { state: dto.state?.trim() || null }),
      ...(dto.pinCode !== undefined && { pinCode: dto.pinCode?.trim() || null }),
      ...(dto.country !== undefined && { country: dto.country.trim() }),
      ...(dto.gstin !== undefined && { gstin: dto.gstin?.trim() || null }),
      ...(dto.registrationType !== undefined && { registrationType: dto.registrationType }),
      ...(dto.creditLimit !== undefined && { creditLimit: dto.creditLimit }),
      ...(dto.creditPeriodDays !== undefined && { creditPeriodDays: dto.creditPeriodDays }),
      ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      updatedBy: userId || null,
    });

    await this.auditService.log({
      companyId,
      userId: userId || null,
      action: 'CUSTOMER_UPDATED',
      module: 'CUSTOMERS',
      referenceId: id,
    });

    return updated;
  }

  public async toggleActive(
    companyId: string,
    id: string,
    userId?: string,
  ): Promise<Customer> {
    const existing = await this.repo.findById(id, companyId);
    if (!existing) throw new NotFoundError('Customer not found.');

    const updated = await this.repo.update(id, {
      isActive: !existing.isActive,
      updatedBy: userId || null,
    });

    await this.auditService.log({
      companyId,
      userId: userId || null,
      action: updated.isActive ? 'CUSTOMER_ACTIVATED' : 'CUSTOMER_DEACTIVATED',
      module: 'CUSTOMERS',
      referenceId: id,
    });

    return updated;
  }

  public async getStatement(
    companyId: string,
    customerId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<CustomerStatementDTO> {
    const customer = await this.repo.findById(customerId, companyId);
    if (!customer) throw new NotFoundError('Customer not found.');

    const entries = await this.ledgerRepo.getStatementEntries(
      companyId,
      customerId,
      startDate,
      endDate,
    );

    let openingBalance = 0;
    if (startDate) {
      const priorEntries = await this.prisma.customerLedger.findMany({
        where: {
          companyId,
          customerId,
          entryDate: { lt: new Date(startDate) },
        },
        orderBy: { entryDate: 'asc' },
      });

      let balance = 0;
      for (const entry of priorEntries) {
        balance += entry.debitAmount - entry.creditAmount;
      }
      openingBalance = SalesCalculationService.round(balance, 2);
    }

    let totalDebit = 0;
    let totalCredit = 0;
    for (const entry of entries) {
      totalDebit += entry.debitAmount;
      totalCredit += entry.creditAmount;
    }

    totalDebit = SalesCalculationService.round(totalDebit, 2);
    totalCredit = SalesCalculationService.round(totalCredit, 2);
    const closingBalance = SalesCalculationService.round(
      openingBalance + totalDebit - totalCredit,
      2,
    );

    return {
      customer,
      openingBalance,
      totalDebit,
      totalCredit,
      closingBalance,
      entries,
    };
  }
}
