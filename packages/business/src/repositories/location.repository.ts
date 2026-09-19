import { PrismaClient } from '@prisma/client';
import { InventoryLocation, LocationCreateDTO, LocationUpdateDTO } from '@rs-inventory/types';

export class LocationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string): Promise<InventoryLocation | null> {
    const record = await this.prisma.inventoryLocation.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stockBalances: true,
            stockMovements: true,
          },
        },
      },
    });
    return record as unknown as InventoryLocation | null;
  }

  public async findByName(companyId: string, name: string): Promise<InventoryLocation | null> {
    const record = await this.prisma.inventoryLocation.findUnique({
      where: {
        companyId_name: {
          companyId,
          name: name.trim(),
        },
      },
    });
    return record as unknown as InventoryLocation | null;
  }

  public async findByCode(companyId: string, code: string): Promise<InventoryLocation | null> {
    const record = await this.prisma.inventoryLocation.findUnique({
      where: {
        companyId_code: {
          companyId,
          code: code.trim().toUpperCase(),
        },
      },
    });
    return record as unknown as InventoryLocation | null;
  }

  public async findAll(companyId: string, includeInactive: boolean = false): Promise<InventoryLocation[]> {
    const records = await this.prisma.inventoryLocation.findMany({
      where: {
        companyId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        _count: {
          select: {
            stockBalances: true,
            stockMovements: true,
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    return records as unknown as InventoryLocation[];
  }

  public async getDefault(companyId: string): Promise<InventoryLocation> {
    let loc = await this.prisma.inventoryLocation.findFirst({
      where: { companyId, isDefault: true, isActive: true },
    });

    if (!loc) {
      loc = await this.prisma.inventoryLocation.findFirst({
        where: { companyId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!loc) {
      return this.ensureDefaultLocation(companyId);
    }

    return loc as unknown as InventoryLocation;
  }

  public async ensureDefaultLocation(companyId: string): Promise<InventoryLocation> {
    const existing = await this.prisma.inventoryLocation.findFirst({
      where: { companyId, isDefault: true },
    });
    if (existing) {
      return existing as unknown as InventoryLocation;
    }

    // Check if a MAIN location exists by code
    const byCode = await this.prisma.inventoryLocation.findUnique({
      where: {
        companyId_code: {
          companyId,
          code: 'MAIN',
        },
      },
    });

    if (byCode) {
      const updated = await this.prisma.inventoryLocation.update({
        where: { id: byCode.id },
        data: { isDefault: true, isActive: true },
      });
      return updated as unknown as InventoryLocation;
    }

    const created = await this.prisma.inventoryLocation.create({
      data: {
        companyId,
        name: 'Main Store',
        code: 'MAIN',
        description: 'Primary store and main stock holding location',
        locationType: 'STORE',
        isDefault: true,
        isActive: true,
      },
    });
    return created as unknown as InventoryLocation;
  }

  public async create(companyId: string, data: LocationCreateDTO): Promise<InventoryLocation> {
    const isDefault = Boolean(data.isDefault);

    return this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.inventoryLocation.updateMany({
          where: { companyId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const record = await tx.inventoryLocation.create({
        data: {
          companyId,
          name: data.name.trim(),
          code: data.code.trim().toUpperCase(),
          description: data.address?.trim() || null,
          locationType: data.type || 'STORE',
          isDefault,
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
      });

      return record as unknown as InventoryLocation;
    });
  }

  public async update(id: string, data: LocationUpdateDTO): Promise<InventoryLocation> {
    const existing = await this.prisma.inventoryLocation.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Location with ID ${id} not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault === true) {
        await tx.inventoryLocation.updateMany({
          where: { companyId: existing.companyId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      const record = await tx.inventoryLocation.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.code !== undefined ? { code: data.code.trim().toUpperCase() } : {}),
          ...(data.type !== undefined ? { locationType: data.type } : {}),
          ...(data.address !== undefined ? { description: data.address?.trim() || null } : {}),
          ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
      });

      return record as unknown as InventoryLocation;
    });
  }

  public async toggleActive(id: string): Promise<InventoryLocation> {
    const existing = await this.prisma.inventoryLocation.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Location with ID ${id} not found.`);
    }

    if (existing.isDefault && existing.isActive) {
      throw new Error('Cannot deactivate the default storage location.');
    }

    const updated = await this.prisma.inventoryLocation.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
    return updated as unknown as InventoryLocation;
  }
}
