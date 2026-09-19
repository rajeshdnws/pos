import { Prisma, PrismaClient } from '@prisma/client';
import { PaginatedResult, Supplier, SupplierFilterDTO } from '@rs-inventory/types';

export class SupplierRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string, companyId?: string): Promise<Supplier | null> {
    const where: Prisma.SupplierWhereInput = { id };
    if (companyId) {
      where.companyId = companyId;
    }

    const supplier = await this.prisma.supplier.findFirst({
      where,
      include: {
        _count: {
          select: {
            purchases: true,
            payments: true,
          },
        },
      },
    });

    return supplier as unknown as Supplier | null;
  }

  public async findByCode(companyId: string, supplierCode: string): Promise<Supplier | null> {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        companyId,
        supplierCode: { equals: supplierCode },
      },
    });

    return supplier as unknown as Supplier | null;
  }

  public async findMany(
    companyId: string,
    filters?: SupplierFilterDTO,
  ): Promise<PaginatedResult<Supplier>> {
    const page = Math.max(1, filters?.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters?.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.SupplierWhereInput = { companyId };

    if (filters?.status === 'active' || filters?.isActive === true) {
      where.isActive = true;
    } else if (filters?.status === 'inactive' || filters?.isActive === false) {
      where.isActive = false;
    }

    if (filters?.city) {
      where.city = { contains: filters.city };
    }

    if (filters?.state) {
      where.state = { contains: filters.state };
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const q = filters.search.trim();
      where.OR = [
        { name: { contains: q } },
        { supplierCode: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
        { gstin: { contains: q } },
        { contactPerson: { contains: q } },
      ];
    }

    const orderBy: Prisma.SupplierOrderByWithRelationInput = {};
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder || 'desc';

    if (sortBy === 'name') orderBy.name = sortOrder;
    else if (sortBy === 'supplierCode') orderBy.supplierCode = sortOrder;
    else if (sortBy === 'currentBalance') orderBy.currentBalance = sortOrder;
    else if (sortBy === 'city') orderBy.city = sortOrder;
    else orderBy.createdAt = sortOrder;

    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          _count: {
            select: {
              purchases: true,
              payments: true,
            },
          },
        },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      items: items as unknown as Supplier[],
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  public async create(data: Prisma.SupplierUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<Supplier> {
    const client = tx || this.prisma;
    const record = await client.supplier.create({
      data,
    });
    return record as unknown as Supplier;
  }

  public async update(
    id: string,
    data: Prisma.SupplierUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Supplier> {
    const client = tx || this.prisma;
    const record = await client.supplier.update({
      where: { id },
      data,
    });
    return record as unknown as Supplier;
  }

  public async updateBalance(
    id: string,
    newBalance: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Supplier> {
    const client = tx || this.prisma;
    const record = await client.supplier.update({
      where: { id },
      data: { currentBalance: newBalance },
    });
    return record as unknown as Supplier;
  }

  public async hasTransactions(supplierId: string): Promise<boolean> {
    const [purchasesCount, paymentsCount] = await Promise.all([
      this.prisma.purchase.count({ where: { supplierId } }),
      this.prisma.paymentMade.count({ where: { supplierId } }),
    ]);

    return purchasesCount > 0 || paymentsCount > 0;
  }

  public async delete(id: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const client = tx || this.prisma;
    await client.supplier.delete({ where: { id } });
    return true;
  }
}

