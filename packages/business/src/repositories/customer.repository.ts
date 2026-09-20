import { Prisma, PrismaClient } from '@prisma/client';
import { Customer, CustomerFilterDTO, PaginatedResult } from '@rs-inventory/types';

export class CustomerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findMany(
    companyId: string,
    filters: CustomerFilterDTO = {},
  ): Promise<PaginatedResult<Customer>> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.CustomerWhereInput = { companyId };

    // Active/inactive filter
    if (filters.status === 'active') {
      where.isActive = true;
    } else if (filters.status === 'inactive') {
      where.isActive = false;
    } else if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Customer type filter
    if (filters.customerType) {
      if (filters.customerType === 'BUSINESS' || filters.customerType === 'CORPORATE') {
        where.customerType = { in: ['BUSINESS', 'CORPORATE'] };
      } else {
        where.customerType = filters.customerType;
      }
    }

    // City/state filter
    if (filters.city) {
      where.city = { contains: filters.city };
    }
    if (filters.state) {
      where.state = filters.state;
    }

    // Text search across name, phone, code, email, gstin, city, contact person
    if (filters.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { name: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
        { customerCode: { contains: q } },
        { gstin: { contains: q } },
        { city: { contains: q } },
        { contactPerson: { contains: q } },
      ];
    }

    // Sorting
    const sortBy = filters.sortBy || 'name';
    const sortOrder = filters.sortOrder || 'asc';
    const orderBy: Prisma.CustomerOrderByWithRelationInput = { [sortBy]: sortOrder };

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          _count: {
            select: { salesInvoices: true, salesPayments: true },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;
    return {
      items: items as unknown as Customer[],
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  public async findById(id: string, companyId: string): Promise<Customer | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { salesInvoices: true, salesPayments: true },
        },
      },
    });
    if (!customer || customer.companyId !== companyId) return null;
    return customer as unknown as Customer;
  }

  public async findByCode(companyId: string, code: string): Promise<Customer | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { companyId_customerCode: { companyId, customerCode: code } },
    });
    return customer as unknown as Customer | null;
  }

  public async findByPhone(companyId: string, phone: string): Promise<Customer | null> {
    const customer = await this.prisma.customer.findFirst({
      where: { companyId, phone },
    });
    return customer as unknown as Customer | null;
  }

  public async create(
    data: Prisma.CustomerUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Customer> {
    const client = tx || this.prisma;
    const customer = await client.customer.create({ data });
    return customer as unknown as Customer;
  }

  public async update(
    id: string,
    data: Prisma.CustomerUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Customer> {
    const client = tx || this.prisma;
    const customer = await client.customer.update({ where: { id }, data });
    return customer as unknown as Customer;
  }

  public async updateBalance(
    id: string,
    balanceDelta: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx || this.prisma;
    await client.customer.update({
      where: { id },
      data: { currentBalance: { increment: balanceDelta } },
    });
  }

  /**
   * Generate the next customer code in format CUST-NNNN.
   * Finds the highest existing code or falls back to the DB max.
   */
  public async generateCode(companyId: string): Promise<string> {
    const latest = await this.prisma.customer.findFirst({
      where: { companyId, customerCode: { startsWith: 'CUST-' } },
      orderBy: { customerCode: 'desc' },
      select: { customerCode: true },
    });

    let nextNum = 1;
    if (latest?.customerCode) {
      const match = latest.customerCode.match(/CUST-(\d+)$/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    // Also check highest numeric ID in case codes were entered manually
    const countFallback = await this.prisma.customer.count({ where: { companyId } });
    nextNum = Math.max(nextNum, countFallback + 1);

    return `CUST-${String(nextNum).padStart(4, '0')}`;
  }
}
