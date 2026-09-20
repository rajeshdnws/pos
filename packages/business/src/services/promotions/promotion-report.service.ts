import { PrismaClient } from '@prisma/client';
import {
  PromotionsKPIsDTO,
  CouponRedemptionDTO,
  CouponIssuanceDTO,
  PaginatedResult,
} from '@rs-inventory/types';

export class PromotionReportService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Calculates high-level dashboard KPIs for promotions & coupons.
   */
  async getPromotionsKPIs(companyId: string): Promise<PromotionsKPIsDTO> {
    const now = new Date();

    const [
      activeCampaignsCount,
      scheduledCampaignsCount,
      totalCouponsIssued,
      couponsRedeemed,
      expiredCouponsCount,
      allCoupons,
      redemptionsAgg,
    ] = await Promise.all([
      this.prisma.promotionCampaign.count({
        where: { companyId, status: 'ACTIVE' },
      }),
      this.prisma.promotionCampaign.count({
        where: { companyId, status: 'SCHEDULED' },
      }),
      this.prisma.couponIssuance.count({
        where: { companyId },
      }),
      this.prisma.couponRedemption.count({
        where: { companyId },
      }),
      this.prisma.coupon.count({
        where: {
          companyId,
          validUntil: { lt: now },
          status: { not: 'CANCELLED' },
        },
      }),
      this.prisma.coupon.findMany({
        where: {
          companyId,
          status: 'ACTIVE',
          validUntil: { gte: now },
        },
        select: {
          maximumRedemptions: true,
          currentRedemptionsCount: true,
        },
      }),
      this.prisma.couponRedemption.aggregate({
        where: { companyId },
        _sum: {
          discountAmount: true,
          billAmountAfterDiscount: true,
        },
      }),
    ]);

    let couponsRemainingUnused = 0;
    for (const c of allCoupons) {
      const remaining = Math.max(0, c.maximumRedemptions - c.currentRedemptionsCount);
      couponsRemainingUnused += remaining;
    }

    const totalDiscountRedeemed = redemptionsAgg._sum.discountAmount || 0;
    const totalAttributedSales = redemptionsAgg._sum.billAmountAfterDiscount || 0;

    const baseForRate = totalCouponsIssued > 0 ? totalCouponsIssued : couponsRedeemed;
    const redemptionRate = baseForRate > 0 ? (couponsRedeemed / baseForRate) * 100 : 0;

    return {
      activeCampaignsCount,
      scheduledCampaignsCount,
      totalCouponsIssued,
      couponsRedeemed,
      couponsExpired: expiredCouponsCount,
      couponsRemainingUnused,
      totalDiscountRedeemed: Math.round(totalDiscountRedeemed * 100) / 100,
      redemptionRate: Math.round(redemptionRate * 10) / 10,
      totalAttributedSales: Math.round(totalAttributedSales * 100) / 100,
    };
  }

  /**
   * Detailed Coupon Issuance Report.
   */
  async getIssuanceReport(
    companyId: string,
    filters?: {
      couponId?: string;
      customerId?: string;
      fromDate?: string;
      toDate?: string;
      deliveryChannel?: string;
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
    if (filters?.deliveryChannel && filters.deliveryChannel !== 'ALL') {
      where.deliveryChannel = filters.deliveryChannel;
    }
    if (filters?.fromDate || filters?.toDate) {
      where.issuedAt = {};
      if (filters.fromDate) where.issuedAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.issuedAt.lte = new Date(filters.toDate);
    }

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
          issuingSalesInvoice: { select: { id: true, invoiceNumber: true } },
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
        deliveryChannel: i.deliveryChannel as any,
        deliveryStatus: i.deliveryStatus as any,
        deliveryFailureReason: i.deliveryFailureReason,
        createdAt: i.issuedAt,
        updatedAt: i.issuedAt,
        coupon: i.coupon as any,
        customer: i.customer as any,
      })),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Detailed Coupon Redemption Report.
   */
  async getRedemptionReport(
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
        coupon: r.coupon as any,
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
   * Promotional Campaign Performance Report.
   */
  async getCampaignPerformanceReport(
    companyId: string,
    filters?: { fromDate?: string; toDate?: string }
  ): Promise<Array<{
    campaignId: string;
    campaignName: string;
    campaignType: string;
    status: string;
    startAt: Date;
    endAt: Date;
    totalRecipients: number;
    messagesSent: number;
    messagesFailed: number;
    couponCode?: string;
    couponRedemptionsCount: number;
    totalDiscountGiven: number;
    totalAttributedSales: number;
  }>> {
    const where: any = { companyId };
    if (filters?.fromDate || filters?.toDate) {
      where.startAt = {};
      if (filters.fromDate) where.startAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.startAt.lte = new Date(filters.toDate);
    }

    const campaigns = await this.prisma.promotionCampaign.findMany({
      where,
      include: {
        coupon: {
          include: {
            redemptions: {
              select: {
                discountAmount: true,
                billAmountAfterDiscount: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns.map((camp) => {
      let couponRedemptionsCount = 0;
      let totalDiscountGiven = 0;
      let totalAttributedSales = 0;

      if (camp.coupon) {
        couponRedemptionsCount = camp.coupon.redemptions.length;
        for (const r of camp.coupon.redemptions) {
          totalDiscountGiven += r.discountAmount;
          totalAttributedSales += r.billAmountAfterDiscount;
        }
      }

      return {
        campaignId: camp.id,
        campaignName: camp.name,
        campaignType: camp.campaignType,
        status: camp.status,
        startAt: camp.startAt,
        endAt: camp.endAt,
        totalRecipients: camp.totalRecipients,
        messagesSent: camp.messagesSent,
        messagesFailed: camp.messagesFailed,
        couponCode: camp.coupon?.code,
        couponRedemptionsCount,
        totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
        totalAttributedSales: Math.round(totalAttributedSales * 100) / 100,
      };
    });
  }

  /**
   * Next-Bill Coupon Analytics Report.
   * Tracks issuance vs redemption specifically for coupons marked as NEXT_ELIGIBLE_PURCHASE.
   */
  async getNextBillCouponReport(
    companyId: string,
    filters?: { fromDate?: string; toDate?: string }
  ): Promise<{
    totalIssued: number;
    totalRedeemed: number;
    conversionRate: number;
    totalDiscountAmount: number;
    totalRepeatSalesAmount: number;
    items: Array<{
      couponCode: string;
      customerName: string;
      issuedAt: Date;
      validUntil: Date;
      isRedeemed: boolean;
      redeemedAt?: Date;
      discountAmount?: number;
      repeatBillAmount?: number;
    }>;
  }> {
    const where: any = {
      companyId,
      applicabilityMode: 'NEXT_ELIGIBLE_PURCHASE',
    };

    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
    }

    const coupons = await this.prisma.coupon.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        issuances: { take: 1, orderBy: { issuedAt: 'desc' } },
        redemptions: { take: 1, orderBy: { redeemedAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalIssued = coupons.length;
    let totalRedeemed = 0;
    let totalDiscountAmount = 0;
    let totalRepeatSalesAmount = 0;

    const items = coupons.map((c) => {
      const redemption = c.redemptions[0];
      const isRedeemed = !!redemption;
      if (isRedeemed) {
        totalRedeemed++;
        totalDiscountAmount += redemption.discountAmount;
        totalRepeatSalesAmount += redemption.billAmountAfterDiscount;
      }

      return {
        couponCode: c.code,
        customerName: c.customer?.name || 'Walk-in Customer',
        issuedAt: c.createdAt,
        validUntil: c.validUntil,
        isRedeemed,
        redeemedAt: redemption?.redeemedAt,
        discountAmount: redemption?.discountAmount,
        repeatBillAmount: redemption?.billAmountAfterDiscount,
      };
    });

    const conversionRate = totalIssued > 0 ? (totalRedeemed / totalIssued) * 100 : 0;

    return {
      totalIssued,
      totalRedeemed,
      conversionRate: Math.round(conversionRate * 10) / 10,
      totalDiscountAmount: Math.round(totalDiscountAmount * 100) / 100,
      totalRepeatSalesAmount: Math.round(totalRepeatSalesAmount * 100) / 100,
      items,
    };
  }
}
