import { Prisma, PrismaClient } from '@prisma/client';
import { CashRegister, CashRegisterCreateDTO, CashRegisterUpdateDTO } from '@rs-inventory/types';

export class CashRegisterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string): Promise<CashRegister | null> {
    const record = await this.prisma.cashRegister.findUnique({
      where: { id },
    });
    return record as unknown as CashRegister | null;
  }

  public async findByCode(companyId: string, registerCode: string): Promise<CashRegister | null> {
    const record = await this.prisma.cashRegister.findUnique({
      where: {
        companyId_registerCode: {
          companyId,
          registerCode: registerCode.trim(),
        },
      },
    });
    return record as unknown as CashRegister | null;
  }

  public async getDefault(companyId: string): Promise<CashRegister> {
    let register = await this.prisma.cashRegister.findFirst({
      where: { companyId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!register) {
      // Auto-create default 'Main Counter'
      register = await this.prisma.cashRegister.create({
        data: {
          companyId,
          registerCode: 'REG-MAIN',
          name: 'Main Counter',
          isActive: true,
        },
      });
    }

    return register as unknown as CashRegister;
  }

  public async findAll(companyId: string, includeInactive: boolean = false): Promise<CashRegister[]> {
    const records = await this.prisma.cashRegister.findMany({
      where: {
        companyId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { name: 'asc' },
    });
    return records as unknown as CashRegister[];
  }

  public async create(
    companyId: string,
    data: CashRegisterCreateDTO,
    tx?: Prisma.TransactionClient,
  ): Promise<CashRegister> {
    const client = tx || this.prisma;
    const record = await client.cashRegister.create({
      data: {
        companyId,
        registerCode: data.registerCode?.trim() || 'REG-MAIN',
        name: data.name.trim(),
        locationId: data.locationId || null,
        isActive: true,
      },
    });
    return record as unknown as CashRegister;
  }

  public async update(
    id: string,
    data: CashRegisterUpdateDTO,
    tx?: Prisma.TransactionClient,
  ): Promise<CashRegister> {
    const client = tx || this.prisma;
    const updateData: Prisma.CashRegisterUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.locationId !== undefined) updateData.locationId = data.locationId || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const record = await client.cashRegister.update({
      where: { id },
      data: updateData,
    });
    return record as unknown as CashRegister;
  }
}
