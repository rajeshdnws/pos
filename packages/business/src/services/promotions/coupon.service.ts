import { PrismaClient } from '@prisma/client';
import {
  CouponDTO,
  CouponCreateDTO,
  NextBillCouponCreateDTO,
  CouponValidationInputDTO,
  CouponValidationResultDTO,
  CouponRedemptionDTO,
  CouponIssuanceDTO,
  PaginatedResult,
  CouponStatus,
  CouponDeliveryChannel,
} from '@rs-inventory/types';
import { BusinessRuleError, NotFoundError, ValidationError } from '../../errors/app.error.js';
import { AuditService } from '../audit.service.js';

export class CouponService {
  private auditService: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.auditService = new AuditService(prisma);
  }

  /**
   * Generates a random uppercase coupon code (Static utility).
   */
  static generateCouponCode(prefix: string = 'PROMO'): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    for (let i = 0; i < 8; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix.trim().toUpperCase()}-${suffix}`;
  }

  public redeemCouponInTransaction = this.redeemCoupon.bind(this);

  /**
   * Generates a random uppercase coupon code.
   * Ensures uniqueness per company in the database.
   */
  async generateCode(companyId: string, prefix: string = 'PROMO'): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit ambiguous characters (I, 1, O, 0)
    let attempts = 0;
    while (attempts < 20) {
      let suffix = '';
      for (let i = 0; i < 6; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const code = `${prefix.trim().toUpperCase()}-${suffix}`;
      const existing = await this.prisma.coupon.findUnique({
        where: {
          companyId_code: {
            companyId,
            code,
          },
        },
      });
      if (!existing) {
        return code;
      }
      attempts++;
    }
    return `${prefix.trim().toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  }

  /**
   * Create a standard promotional coupon.
   */
  async createCoupon(companyId: string, dto: CouponCreateDTO, userId?: string): Promise<CouponDTO> {
    if (!dto.name || !dto.name.trim()) {
      throw new ValidationError('Coupon name is required');
    }
    if (dto.discountValue <= 0) {
      throw new ValidationError('Discount value must be greater than zero');
    }
    if (dto.discountType === 'PERCENTAGE' && dto.discountValue > 100) {
      throw new ValidationError('Percentage discount cannot exceed 100%');
    }

    const code = dto.code && dto.code.trim()
      ? dto.code.trim().toUpperCase()
      : await this.generateCode(companyId, 'SAVE');

    // Check duplicate code
    const existing = await this.prisma.coupon.findUnique({
      where: {
        companyId_code: {
          companyId,
          code,
        },
      },
    });
    if (existing) {
      throw new BusinessRuleError(`Coupon code "${code}" already exists for this company`);
    }

    const validFrom = new Date(dto.validFrom);
    const validUntil = new Date(dto.validUntil);
    if (isNaN(validFrom.getTime()) || isNaN(validUntil.getTime())) {
      throw new ValidationError('Invalid validity dates provided');
    }
    if (validUntil <= validFrom) {
      throw new ValidationError('Valid until date must be after valid from date');
    }

    const coupon = await this.prisma.coupon.create({
      data: {
        companyId,
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minimumPurchase: dto.minimumPurchase ?? 0,
        maximumDiscount: dto.maximumDiscount ?? null,
        validFrom,
        validUntil,
        applicabilityMode: dto.applicabilityMode || 'ANY_ELIGIBLE_PURCHASE',
        customerId: dto.customerId || null,
        campaignId: dto.campaignId || null,
        applicableProductIds: dto.applicableProductIds ? JSON.stringify(dto.applicableProductIds) : null,
        applicableCategoryIds: dto.applicableCategoryIds ? JSON.stringify(dto.applicableCategoryIds) : null,
        excludedProductIds: dto.excludedProductIds ? JSON.stringify(dto.excludedProductIds) : null,
        maximumRedemptions: dto.maximumRedemptions ?? 100,
        maximumRedemptionsPerCustomer: dto.maximumRedemptionsPerCustomer ?? 1,
        status: 'ACTIVE',
        createdBy: userId || null,
      },
      include: {
        customer: { select: { id: true, name: true, customerCode: true } },
        campaigns: { select: { id: true, name: true }, take: 1 },
      },
    });

    await this.auditService.log({
      companyId,
      userId: userId || null,
      module: 'PROMOTIONS',
      referenceId: coupon.id,
      action: 'CREATE',
      newValue: { code: coupon.code, name: coupon.name, discountValue: coupon.discountValue },
    });

    return this.mapToDTO(coupon);
  }

  /**
   * Update an existing coupon.
   */
  async updateCoupon(
    companyId: string,
    id: string,
    dto: Partial<CouponCreateDTO> & { status?: CouponStatus },
    userId?: string
  ): Promise<CouponDTO> {
    const existing = await this.prisma.coupon.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      throw new NotFoundError(`Coupon with ID "${id}" not found`);
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.description !== undefined) updateData.description = dto.description?.trim() || null;
    if (dto.discountType !== undefined) updateData.discountType = dto.discountType;
    if (dto.discountValue !== undefined) {
      if (dto.discountValue <= 0) throw new ValidationError('Discount value must be greater than zero');
      if ((dto.discountType || existing.discountType) === 'PERCENTAGE' && dto.discountValue > 100) {
        throw new ValidationError('Percentage discount cannot exceed 100%');
      }
      updateData.discountValue = dto.discountValue;
    }
    if (dto.minimumPurchase !== undefined) updateData.minimumPurchase = dto.minimumPurchase;
    if (dto.maximumDiscount !== undefined) updateData.maximumDiscount = dto.maximumDiscount;
    if (dto.validFrom !== undefined) updateData.validFrom = new Date(dto.validFrom);
    if (dto.validUntil !== undefined) updateData.validUntil = new Date(dto.validUntil);
    if (dto.applicabilityMode !== undefined) updateData.applicabilityMode = dto.applicabilityMode;
    if (dto.applicableProductIds !== undefined) {
      updateData.applicableProductIds = dto.applicableProductIds ? JSON.stringify(dto.applicableProductIds) : null;
    }
    if (dto.applicableCategoryIds !== undefined) {
      updateData.applicableCategoryIds = dto.applicableCategoryIds ? JSON.stringify(dto.applicableCategoryIds) : null;
    }
    if (dto.excludedProductIds !== undefined) {
      updateData.excludedProductIds = dto.excludedProductIds ? JSON.stringify(dto.excludedProductIds) : null;
    }
    if (dto.maximumRedemptions !== undefined) updateData.maximumRedemptions = dto.maximumRedemptions;
    if (dto.maximumRedemptionsPerCustomer !== undefined) {
      updateData.maximumRedemptionsPerCustomer = dto.maximumRedemptionsPerCustomer;
    }
    if (dto.status !== undefined) updateData.status = dto.status;

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true, customerCode: true } },
        campaigns: { select: { id: true, name: true }, take: 1 },
      },
    });

    await this.auditService.log({
      companyId,
      userId: userId || null,
      module: 'PROMOTIONS',
      referenceId: id,
      action: 'UPDATE',
      oldValue: { name: existing.name, status: existing.status },
      newValue: { name: updated.name, status: updated.status },
    });

    return this.mapToDTO(updated);
  }

  /**
   * Cancel/deactivate a coupon.
   */
  async cancelCoupon(companyId: string, id: string, reason?: string, userId?: string): Promise<CouponDTO> {
    const existing = await this.prisma.coupon.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      throw new NotFoundError(`Coupon with ID "${id}" not found`);
    }

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        customer: { select: { id: true, name: true, customerCode: true } },
        campaigns: { select: { id: true, name: true }, take: 1 },
      },
    });

    await this.auditService.log({
      companyId,
      userId: userId || null,
      module: 'PROMOTIONS',
      referenceId: id,
      action: 'CANCEL',
      newValue: { reason, status: 'CANCELLED' },
    });

    return this.mapToDTO(updated);
  }

  /**
   * Retrieve coupon by ID.
   */
  async getCouponById(companyId: string, id: string): Promise<CouponDTO | null> {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id, companyId },
      include: {
        customer: { select: { id: true, name: true, customerCode: true } },
        campaigns: { select: { id: true, name: true }, take: 1 },
      },
    });
    return coupon ? this.mapToDTO(coupon) : null;
  }

  /**
   * Retrieve coupon by Code.
   */
  async getCouponByCode(companyId: string, code: string): Promise<CouponDTO | null> {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        companyId,
        code: code.trim().toUpperCase(),
      },
      include: {
        customer: { select: { id: true, name: true, customerCode: true } },
        campaigns: { select: { id: true, name: true }, take: 1 },
      },
    });
    return coupon ? this.mapToDTO(coupon) : null;
  }

  /**
   * Issue a coupon for the customer's NEXT bill.
   * Crucial requirement: Valid only on future bills, NOT redeemable on the current issuing bill!
   */
  async issueNextBillCoupon(
    companyId: string,
    dto: NextBillCouponCreateDTO,
    userId?: string
  ): Promise<CouponDTO> {
    if (!dto.customerId) {
      throw new ValidationError('A registered customer must be selected to issue a next-bill coupon');
    }
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, companyId },
    });
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    if (dto.discountValue <= 0) {
      throw new ValidationError('Discount value must be greater than zero');
    }
    if (dto.discountType === 'PERCENTAGE' && dto.discountValue > 100) {
      throw new ValidationError('Percentage discount cannot exceed 100%');
    }
    const validityDays = dto.validityDays > 0 ? dto.validityDays : 30;

    const now = new Date();
    const validFrom = now;
    const validUntil = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

    const code = await this.generateCode(companyId, 'NEXT');
    const name = `Next Bill ${dto.discountType === 'PERCENTAGE' ? `${dto.discountValue}% OFF` : `₹${dto.discountValue} OFF`}`;

    const coupon = await this.prisma.coupon.create({
      data: {
        companyId,
        code,
        name,
        description: `Issued for customer ${customer.name} on invoice ${dto.issuingSalesInvoiceId || 'N/A'}. Valid for ${validityDays} days.`,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minimumPurchase: dto.minimumPurchase ?? 0,
        maximumDiscount: dto.maximumDiscount ?? null,
        validFrom,
        validUntil,
        applicabilityMode: 'NEXT_ELIGIBLE_PURCHASE',
        customerId: dto.customerId,
        applicableProductIds: dto.applicableProductIds ? JSON.stringify(dto.applicableProductIds) : null,
        applicableCategoryIds: dto.applicableCategoryIds ? JSON.stringify(dto.applicableCategoryIds) : null,
        maximumRedemptions: 1,
        maximumRedemptionsPerCustomer: 1,
        status: 'ACTIVE',
        createdBy: userId || null,
      },
      include: {
        customer: { select: { id: true, name: true, customerCode: true } },
      },
    });

    // Safely check if issuingSalesInvoiceId exists in sales_invoices to avoid foreign key violations
    let validInvoiceId: string | null = null;
    if (dto.issuingSalesInvoiceId) {
      const inv = await this.prisma.salesInvoice.findUnique({
        where: { id: dto.issuingSalesInvoiceId },
        select: { id: true },
      });
      if (inv) validInvoiceId = inv.id;
    }

    // Record issuance
    await this.prisma.couponIssuance.create({
      data: {
        companyId,
        couponId: coupon.id,
        customerId: dto.customerId,
        issuingSalesInvoiceId: validInvoiceId,
        issuedBy: userId || null,
        deliveryChannel: dto.deliveryChannel || 'MANUAL',
        deliveryStatus: dto.deliveryChannel && dto.deliveryChannel !== 'MANUAL' ? 'PENDING' : 'NOT_REQUESTED',
      },
    });

    await this.auditService.log({
      companyId,
      userId: userId || null,
      module: 'PROMOTIONS',
      referenceId: coupon.id,
      action: 'ISSUE_NEXT_BILL',
      newValue: {
        code: coupon.code,
        customerId: dto.customerId,
        issuingSalesInvoiceId: dto.issuingSalesInvoiceId,
        discountValue: coupon.discountValue,
      },
    });

    return this.mapToDTO(coupon);
  }

  /**
   * Validate a coupon against an active billing cart.
   * Guarantees all business rules:
   * - Status is ACTIVE
   * - Current time is between validFrom and validUntil
   * - Total redemption count < maximumRedemptions
   * - Customer matches if customer-specific
   * - Customer redemption limit not exceeded
   * - Minimum purchase subtotal met
   * - Cannot be redeemed on the same invoice that issued it (for NEXT_ELIGIBLE_PURCHASE)
   * - Item/category restrictions
   * - Proper discount calculation with maximumDiscount cap
   */
  async validateCoupon(
    companyId: string,
    input: CouponValidationInputDTO,
    currentSalesInvoiceId?: string
  ): Promise<CouponValidationResultDTO> {
    const rawCode = (input.code || '').trim().toUpperCase();
    if (!rawCode) {
      return {
        isValid: false,
        discountAmount: 0,
        message: 'Coupon code cannot be empty',
        code: '',
      };
    }

    const coupon = await this.prisma.coupon.findFirst({
      where: {
        companyId,
        code: rawCode,
      },
      include: {
        customer: { select: { id: true, name: true, customerCode: true } },
        issuances: {
          select: { issuingSalesInvoiceId: true },
        },
      },
    });

    if (!coupon) {
      return {
        isValid: false,
        discountAmount: 0,
        message: `Coupon code "${rawCode}" not found`,
        code: rawCode,
      };
    }

    const couponDto = this.mapToDTO(coupon);

    // 1. Status Check
    if (coupon.status !== 'ACTIVE') {
      return {
        isValid: false,
        coupon: couponDto,
        discountAmount: 0,
        message: `Coupon "${rawCode}" is ${coupon.status.toLowerCase()}`,
        code: rawCode,
      };
    }

    // 2. Date Validity Check
    const now = new Date();
    if (now < coupon.validFrom) {
      return {
        isValid: false,
        coupon: couponDto,
        discountAmount: 0,
        message: `Coupon is not valid until ${coupon.validFrom.toLocaleDateString()}`,
        code: rawCode,
      };
    }
    if (now > coupon.validUntil) {
      return {
        isValid: false,
        coupon: couponDto,
        discountAmount: 0,
        message: `Coupon expired on ${coupon.validUntil.toLocaleDateString()}`,
        code: rawCode,
      };
    }

    // 3. Overall Redemption Limit
    if (coupon.maximumRedemptions > 0 && coupon.currentRedemptionsCount >= coupon.maximumRedemptions) {
      return {
        isValid: false,
        coupon: couponDto,
        discountAmount: 0,
        message: 'Coupon has reached its maximum global redemptions limit',
        code: rawCode,
      };
    }

    // 4. Customer Eligibility Check
    if (coupon.customerId) {
      if (!input.customerId) {
        return {
          isValid: false,
          coupon: couponDto,
          discountAmount: 0,
          message: 'This coupon is exclusively assigned to a specific registered customer',
          code: rawCode,
        };
      }
      if (input.customerId !== coupon.customerId) {
        return {
          isValid: false,
          coupon: couponDto,
          discountAmount: 0,
          message: 'This coupon is not valid for the selected customer',
          code: rawCode,
        };
      }
    }

    // 5. Per-Customer Redemption Count Check
    if (input.customerId && coupon.maximumRedemptionsPerCustomer > 0) {
      const customerRedemptions = await this.prisma.couponRedemption.count({
        where: {
          companyId,
          couponId: coupon.id,
          customerId: input.customerId,
        },
      });
      if (customerRedemptions >= coupon.maximumRedemptionsPerCustomer) {
        return {
          isValid: false,
          coupon: couponDto,
          discountAmount: 0,
          message: `You have already redeemed this coupon the maximum allowed times (${coupon.maximumRedemptionsPerCustomer})`,
          code: rawCode,
        };
      }
    }

    // 6. Applicability Mode & Self-Redemption Check (Crucial for NEXT_ELIGIBLE_PURCHASE)
    if (coupon.applicabilityMode === 'NEXT_ELIGIBLE_PURCHASE' && currentSalesInvoiceId) {
      const isIssuedOnCurrentInvoice = coupon.issuances.some(
        (iss) => iss.issuingSalesInvoiceId === currentSalesInvoiceId
      );
      if (isIssuedOnCurrentInvoice) {
        return {
          isValid: false,
          coupon: couponDto,
          discountAmount: 0,
          message: 'This coupon was issued on the current bill and is only valid on future purchases.',
          code: rawCode,
        };
      }
    }

    // 7. Minimum Purchase Subtotal Check
    if (coupon.minimumPurchase > 0 && input.subtotal < coupon.minimumPurchase) {
      return {
        isValid: false,
        coupon: couponDto,
        discountAmount: 0,
        message: `Minimum purchase of ₹${coupon.minimumPurchase.toFixed(2)} required. Current cart: ₹${input.subtotal.toFixed(2)}`,
        code: rawCode,
      };
    }

    // 8. Item & Category Filtering
    let applicableProductIds: string[] | null = null;
    let applicableCategoryIds: string[] | null = null;
    let excludedProductIds: string[] | null = null;
    try {
      if (coupon.applicableProductIds) applicableProductIds = JSON.parse(coupon.applicableProductIds);
      if (coupon.applicableCategoryIds) applicableCategoryIds = JSON.parse(coupon.applicableCategoryIds);
      if (coupon.excludedProductIds) excludedProductIds = JSON.parse(coupon.excludedProductIds);
    } catch {
      // ignore parse errors
    }

    let eligibleSubtotal = input.subtotal;
    if (
      (applicableProductIds && applicableProductIds.length > 0) ||
      (applicableCategoryIds && applicableCategoryIds.length > 0) ||
      (excludedProductIds && excludedProductIds.length > 0)
    ) {
      eligibleSubtotal = 0;
      for (const item of input.items || []) {
        if (excludedProductIds && excludedProductIds.includes(item.productId)) {
          continue;
        }
        const matchProduct = !applicableProductIds || applicableProductIds.length === 0 || applicableProductIds.includes(item.productId);
        const matchCategory = !applicableCategoryIds || applicableCategoryIds.length === 0 || (item.categoryId && applicableCategoryIds.includes(item.categoryId));

        if (matchProduct && matchCategory) {
          eligibleSubtotal += item.sellingRate * item.quantity;
        }
      }

      if (eligibleSubtotal <= 0) {
        return {
          isValid: false,
          coupon: couponDto,
          discountAmount: 0,
          message: 'Cart does not contain any qualifying products or categories for this coupon',
          code: rawCode,
        };
      }
    }

    // 9. Calculate Discount Amount
    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = (eligibleSubtotal * coupon.discountValue) / 100;
      if (coupon.maximumDiscount && coupon.maximumDiscount > 0) {
        discount = Math.min(discount, coupon.maximumDiscount);
      }
    } else {
      // FIXED_AMOUNT
      discount = Math.min(coupon.discountValue, eligibleSubtotal);
    }

    // Ensure discount does not exceed cart subtotal
    discount = Math.min(discount, input.subtotal);
    const finalDiscount = Math.round(discount * 100) / 100;

    return {
      isValid: true,
      coupon: couponDto,
      discountAmount: finalDiscount,
      message: `Coupon applied: ₹${finalDiscount.toFixed(2)} discount`,
      code: rawCode,
    };
  }

  /**
   * Redeem a coupon within an active database transaction.
   * Atomically records the redemption and increments the counter.
   */
  async redeemCoupon(
    tx: any,
    companyId: string,
    couponId: string,
    customerId: string | null | undefined,
    salesInvoiceId: string,
    billAmountBeforeDiscount: number,
    billAmountAfterDiscount: number,
    cashierId?: string
  ): Promise<CouponRedemptionDTO> {
    const discountAmount = Math.max(0, billAmountBeforeDiscount - billAmountAfterDiscount);

    // Atomically increment redemption count on the coupon
    await tx.coupon.update({
      where: { id: couponId },
      data: {
        currentRedemptionsCount: { increment: 1 },
      },
    });

    // Create redemption record
    const redemption = await tx.couponRedemption.create({
      data: {
        companyId,
        couponId,
        customerId: customerId || null,
        salesInvoiceId,
        discountAmount,
        billAmountBeforeDiscount,
        billAmountAfterDiscount,
        redeemedBy: cashierId || null,
        redeemedAt: new Date(),
      },
      include: {
        coupon: true,
        customer: { select: { id: true, name: true, customerCode: true } },
        salesInvoice: { select: { id: true, invoiceNumber: true } },
      },
    });

    return {
      id: redemption.id,
      companyId: redemption.companyId,
      couponId: redemption.couponId,
      customerId: redemption.customerId,
      salesInvoiceId: redemption.salesInvoiceId,
      discountAmount: redemption.discountAmount,
      billAmountBeforeDiscount: redemption.billAmountBeforeDiscount,
      billAmountAfterDiscount: redemption.billAmountAfterDiscount,
      redeemedBy: redemption.redeemedBy,
      redeemedAt: redemption.redeemedAt,
      createdAt: redemption.redeemedAt,
      updatedAt: redemption.redeemedAt,
      coupon: this.mapToDTO(redemption.coupon),
      customer: redemption.customer as any,
      salesInvoice: redemption.salesInvoice,
    };
  }

  /**
   * Issue an existing coupon to a customer.
   */
  async issueCoupon(
    companyId: string,
    dto: {
      couponId: string;
      customerId?: string;
      issuingSalesInvoiceId?: string;
      deliveryChannel?: CouponDeliveryChannel;
    },
    userId?: string
  ): Promise<CouponIssuanceDTO> {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id: dto.couponId, companyId },
    });
    if (!coupon) {
      throw new NotFoundError('Coupon not found');
    }

    const issuance = await this.prisma.couponIssuance.create({
      data: {
        companyId,
        couponId: dto.couponId,
        customerId: dto.customerId || null,
        issuingSalesInvoiceId: dto.issuingSalesInvoiceId || null,
        issuedBy: userId || null,
        deliveryChannel: dto.deliveryChannel || 'MANUAL',
        deliveryStatus: dto.deliveryChannel && dto.deliveryChannel !== 'MANUAL' ? 'PENDING' : 'NOT_REQUESTED',
      },
      include: {
        coupon: true,
        customer: { select: { id: true, name: true, customerCode: true } },
      },
    });

    return {
      id: issuance.id,
      companyId: issuance.companyId,
      couponId: issuance.couponId,
      customerId: issuance.customerId,
      issuingSalesInvoiceId: issuance.issuingSalesInvoiceId,
      issuedBy: issuance.issuedBy,
      issuedAt: issuance.issuedAt,
      deliveryChannel: issuance.deliveryChannel as CouponDeliveryChannel,
      deliveryStatus: issuance.deliveryStatus as any,
      deliveryFailureReason: issuance.deliveryFailureReason,
      createdAt: issuance.issuedAt,
      updatedAt: issuance.issuedAt,
      coupon: this.mapToDTO(issuance.coupon),
      customer: issuance.customer as any,
    };
  }

  /**
   * List coupons with pagination and filtering.
   */
  async listCoupons(
    companyId: string,
    filters?: {
      search?: string;
      status?: string;
      customerId?: string;
      applicabilityMode?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedResult<CouponDTO>> {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.max(1, Math.min(100, filters?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (filters?.search) {
      where.OR = [
        { code: { contains: filters.search.trim().toUpperCase() } },
        { name: { contains: filters.search.trim() } },
      ];
    }
    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }
    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters?.applicabilityMode) {
      where.applicabilityMode = filters.applicabilityMode;
    }

    const [total, items] = await Promise.all([
      this.prisma.coupon.count({ where }),
      this.prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, customerCode: true } },
          campaigns: { select: { id: true, name: true }, take: 1 },
        },
      }),
    ]);

    return {
      items: items.map((c) => this.mapToDTO(c)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List redemptions with filtering.
   */
  async listRedemptions(
    companyId: string,
    filters?: {
      couponId?: string;
      customerId?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedResult<CouponRedemptionDTO>> {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.max(1, Math.min(100, filters?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (filters?.couponId) where.couponId = filters.couponId;
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.fromDate || filters?.toDate) {
      where.redeemedAt = {};
      if (filters.fromDate) where.redeemedAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.redeemedAt.lte = new Date(filters.toDate);
    }

    const [total, items] = await Promise.all([
      this.prisma.couponRedemption.count({ where }),
      this.prisma.couponRedemption.findMany({
        where,
        skip,
        take: limit,
        orderBy: { redeemedAt: 'desc' },
        include: {
          coupon: true,
          customer: { select: { id: true, name: true, customerCode: true } },
          salesInvoice: { select: { id: true, invoiceNumber: true } },
        },
      }),
    ]);

    return {
      items: items.map((r) => ({
        id: r.id,
        companyId: r.companyId,
        couponId: r.couponId,
        customerId: r.customerId,
        salesInvoiceId: r.salesInvoiceId,
        discountAmount: r.discountAmount,
        billAmountBeforeDiscount: r.billAmountBeforeDiscount,
        billAmountAfterDiscount: r.billAmountAfterDiscount,
        redeemedBy: r.redeemedBy,
        redeemedAt: r.redeemedAt,
        createdAt: r.redeemedAt,
        updatedAt: r.redeemedAt,
        coupon: this.mapToDTO(r.coupon),
        customer: r.customer as any,
        salesInvoice: r.salesInvoice,
      })),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List issuances with filtering.
   */
  async listIssuances(
    companyId: string,
    filters?: {
      couponId?: string;
      customerId?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedResult<CouponIssuanceDTO>> {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.max(1, Math.min(100, filters?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (filters?.couponId) where.couponId = filters.couponId;
    if (filters?.customerId) where.customerId = filters.customerId;

    const [total, items] = await Promise.all([
      this.prisma.couponIssuance.count({ where }),
      this.prisma.couponIssuance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issuedAt: 'desc' },
        include: {
          coupon: true,
          customer: { select: { id: true, name: true, customerCode: true } },
        },
      }),
    ]);

    return {
      items: items.map((i) => ({
        id: i.id,
        companyId: i.companyId,
        couponId: i.couponId,
        customerId: i.customerId,
        issuingSalesInvoiceId: i.issuingSalesInvoiceId,
        issuedBy: i.issuedBy,
        issuedAt: i.issuedAt,
        deliveryChannel: i.deliveryChannel as CouponDeliveryChannel,
        deliveryStatus: i.deliveryStatus as any,
        deliveryFailureReason: i.deliveryFailureReason,
        createdAt: i.issuedAt,
        updatedAt: i.issuedAt,
        coupon: this.mapToDTO(i.coupon),
        customer: i.customer as any,
      })),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private mapToDTO(coupon: any): CouponDTO {
    let applicableProductIds: string[] | null = null;
    let applicableCategoryIds: string[] | null = null;
    let excludedProductIds: string[] | null = null;

    try {
      if (coupon.applicableProductIds) applicableProductIds = JSON.parse(coupon.applicableProductIds);
      if (coupon.applicableCategoryIds) applicableCategoryIds = JSON.parse(coupon.applicableCategoryIds);
      if (coupon.excludedProductIds) excludedProductIds = JSON.parse(coupon.excludedProductIds);
    } catch {
      // ignore
    }

    return {
      id: coupon.id,
      companyId: coupon.companyId,
      code: coupon.code,
      name: coupon.name,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minimumPurchase: coupon.minimumPurchase,
      maximumDiscount: coupon.maximumDiscount,
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
      applicabilityMode: coupon.applicabilityMode,
      customerId: coupon.customerId,
      campaignId: coupon.campaignId,
      applicableProductIds,
      applicableCategoryIds,
      excludedProductIds,
      maximumRedemptions: coupon.maximumRedemptions,
      maximumRedemptionsPerCustomer: coupon.maximumRedemptionsPerCustomer,
      currentRedemptionsCount: coupon.currentRedemptionsCount,
      status: coupon.status,
      createdBy: coupon.createdBy,
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
      customer: coupon.customer || null,
      campaign: coupon.campaigns && coupon.campaigns.length > 0 ? coupon.campaigns[0] : null,
    };
  }
}
