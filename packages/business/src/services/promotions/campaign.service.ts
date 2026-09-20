import { PrismaClient } from '@prisma/client';
import {
  PromotionCampaignDTO,
  PromotionCampaignCreateDTO,
  PromotionCampaignUpdateDTO,
  CampaignStatus,
  CommunicationChannel,
  PaginatedResult,
} from '@rs-inventory/types';
import { BusinessRuleError, NotFoundError, ValidationError } from '../../errors/app.error.js';
import { AuditService } from '../audit.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { TemplateService } from '../communication/template.service.js';

export class CampaignService {
  private auditService: AuditService;
  private communicationService: CommunicationService;
  private templateService: TemplateService;

  constructor(private readonly prisma: PrismaClient) {
    this.auditService = new AuditService(prisma);
    this.communicationService = new CommunicationService(prisma);
    this.templateService = new TemplateService(prisma);
  }

  /**
   * Create a promotional campaign.
   */
  async createCampaign(
    companyId: string,
    dto: PromotionCampaignCreateDTO,
    userId?: string
  ): Promise<PromotionCampaignDTO> {
    if (!dto.name || !dto.name.trim()) {
      throw new ValidationError('Campaign name is required');
    }
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
      throw new ValidationError('Valid start and end dates are required');
    }
    if (endAt <= startAt) {
      throw new ValidationError('Campaign end date must be after start date');
    }

    // Check duplicate name
    const existing = await this.prisma.promotionCampaign.findUnique({
      where: {
        companyId_name: {
          companyId,
          name: dto.name.trim(),
        },
      },
    });
    if (existing) {
      throw new BusinessRuleError(`Campaign with name "${dto.name}" already exists`);
    }

    const campaign = await this.prisma.promotionCampaign.create({
      data: {
        companyId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        campaignType: dto.campaignType || 'GENERAL',
        status: 'DRAFT',
        startAt,
        endAt,
        targetCustomerGroup: dto.targetCustomerGroup || 'ALL',
        channels: JSON.stringify(dto.channels || ['SMS', 'WHATSAPP']),
        templateId: dto.templateId || null,
        couponId: dto.couponId || null,
        createdBy: userId || null,
      },
      include: {
        template: true,
        coupon: true,
      },
    });

    await this.auditService.log({
      companyId,
      userId: userId || null,
      module: 'PROMOTIONS',
      referenceId: campaign.id,
      action: 'CAMPAIGN_CREATE',
      newValue: { name: campaign.name, campaignType: campaign.campaignType },
    });

    return this.mapToDTO(campaign);
  }

  /**
   * Update an existing campaign.
   */
  async updateCampaign(
    companyId: string,
    id: string,
    dto: PromotionCampaignUpdateDTO,
    userId?: string
  ): Promise<PromotionCampaignDTO> {
    const existing = await this.prisma.promotionCampaign.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      throw new NotFoundError(`Campaign with ID "${id}" not found`);
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.description !== undefined) updateData.description = dto.description?.trim() || null;
    if (dto.campaignType !== undefined) updateData.campaignType = dto.campaignType;
    if (dto.startAt !== undefined) updateData.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) updateData.endAt = new Date(dto.endAt);
    if (dto.targetCustomerGroup !== undefined) updateData.targetCustomerGroup = dto.targetCustomerGroup;
    if (dto.channels !== undefined) updateData.channels = JSON.stringify(dto.channels);
    if (dto.templateId !== undefined) updateData.templateId = dto.templateId || null;
    if (dto.couponId !== undefined) updateData.couponId = dto.couponId || null;
    if (dto.status !== undefined) updateData.status = dto.status;

    const updated = await this.prisma.promotionCampaign.update({
      where: { id },
      data: updateData,
      include: {
        template: true,
        coupon: true,
      },
    });

    await this.auditService.log({
      companyId,
      userId: userId || null,
      module: 'PROMOTIONS',
      referenceId: id,
      action: 'CAMPAIGN_UPDATE',
      oldValue: { name: existing.name, status: existing.status },
      newValue: { name: updated.name, status: updated.status },
    });

    return this.mapToDTO(updated);
  }

  /**
   * Change status with transition validation.
   */
  async changeCampaignStatus(
    companyId: string,
    id: string,
    status: CampaignStatus,
    userId?: string
  ): Promise<PromotionCampaignDTO> {
    const existing = await this.prisma.promotionCampaign.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      throw new NotFoundError(`Campaign with ID "${id}" not found`);
    }

    // State machine check
    const currentStatus = existing.status as CampaignStatus;
    if (currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED') {
      throw new BusinessRuleError(`Cannot transition from terminal status ${currentStatus}`);
    }

    const updated = await this.prisma.promotionCampaign.update({
      where: { id },
      data: { status },
      include: {
        template: true,
        coupon: true,
      },
    });

    await this.auditService.log({
      companyId,
      userId: userId || null,
      module: 'PROMOTIONS',
      referenceId: id,
      action: 'CAMPAIGN_STATUS_CHANGE',
      oldValue: { status: currentStatus },
      newValue: { status },
    });

    return this.mapToDTO(updated);
  }

  /**
   * Get campaign by ID.
   */
  async getCampaignById(companyId: string, id: string): Promise<PromotionCampaignDTO | null> {
    const campaign = await this.prisma.promotionCampaign.findFirst({
      where: { id, companyId },
      include: {
        template: true,
        coupon: true,
      },
    });
    return campaign ? this.mapToDTO(campaign) : null;
  }

  /**
   * List campaigns with pagination and filters.
   */
  async listCampaigns(
    companyId: string,
    filters?: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedResult<PromotionCampaignDTO>> {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.max(1, Math.min(100, filters?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search.trim() } },
        { description: { contains: filters.search.trim() } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.promotionCampaign.count({ where }),
      this.prisma.promotionCampaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          template: true,
          coupon: true,
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
   * Dispatch campaign messages across configured channels to targeted customers.
   * Asynchronous, non-blocking, enforces customer consent.
   */
  async dispatchCampaign(
    companyId: string,
    id: string,
    userId?: string
  ): Promise<{
    totalTargeted: number;
    messagesDispatched: number;
    messagesSkippedConsent: number;
    failed: number;
  }> {
    const campaign = await this.prisma.promotionCampaign.findFirst({
      where: { id, companyId },
      include: {
        template: true,
        coupon: true,
        company: true,
      },
    });
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }
    if (!campaign.template) {
      throw new BusinessRuleError('A message template must be linked to the campaign before dispatching');
    }

    // 1. Select targeted customers
    const customerWhere: any = { companyId, status: { not: 'INACTIVE' } };
    if (campaign.targetCustomerGroup === 'INDIVIDUAL') {
      customerWhere.customerType = 'INDIVIDUAL';
    } else if (campaign.targetCustomerGroup === 'BUSINESS') {
      customerWhere.customerType = 'BUSINESS';
    } else if (campaign.targetCustomerGroup === 'WITH_KHATA') {
      customerWhere.allowCredit = true;
    }

    const customers = await this.prisma.customer.findMany({
      where: customerWhere,
    });

    let channels: CommunicationChannel[] = [];
    try {
      channels = JSON.parse(campaign.channels);
    } catch {
      channels = ['SMS'];
    }

    let messagesDispatched = 0;
    let messagesSkippedConsent = 0;
    let failed = 0;

    // Dispatch messages asynchronously
    for (const customer of customers) {
      // Check customer general opt-out
      if (customer.consentStatus === 'OPTED_OUT') {
        messagesSkippedConsent += channels.length;
        continue;
      }

      for (const channel of channels) {
        // Channel consent check
        if (channel === 'EMAIL' && (!customer.emailConsent || !customer.email)) {
          messagesSkippedConsent++;
          continue;
        }
        if (channel === 'SMS' && (!customer.smsConsent || !customer.phone)) {
          messagesSkippedConsent++;
          continue;
        }
        if (channel === 'WHATSAPP' && (!customer.whatsappConsent || !customer.phone)) {
          messagesSkippedConsent++;
          continue;
        }

        const recipient = (channel === 'EMAIL' ? customer.email : customer.phone) || '';
        if (!recipient) {
          messagesSkippedConsent++;
          continue;
        }

        // Context interpolation
        const context = {
          customer_name: customer.name,
          business_name: campaign.company?.name || 'RS Store',
          coupon_code: campaign.coupon?.code || 'WELCOME',
          discount_value: campaign.coupon
            ? campaign.coupon.discountType === 'PERCENTAGE'
              ? `${campaign.coupon.discountValue}%`
              : `₹${campaign.coupon.discountValue}`
            : 'special discount',
          minimum_purchase: campaign.coupon?.minimumPurchase
            ? `₹${campaign.coupon.minimumPurchase}`
            : 'No minimum',
          valid_until: campaign.coupon?.validUntil
            ? new Date(campaign.coupon.validUntil).toLocaleDateString()
            : '',
          coupon_description: campaign.coupon?.description || '',
          redemption_instructions: 'Show this code at the counter during checkout.',
        };

        const interpolatedBody = this.templateService.interpolate(campaign.template.body, context);
        const interpolatedSubject = campaign.template.subject
          ? this.templateService.interpolate(campaign.template.subject, context)
          : undefined;

        try {
          const result = await this.communicationService.dispatchMessage(companyId, {
            channel,
            recipient,
            messageType: 'MARKETING',
            subject: interpolatedSubject,
            body: interpolatedBody,
            templateId: campaign.templateId || undefined,
            campaignId: campaign.id,
            couponId: campaign.couponId || undefined,
            customerId: customer.id,
          });

          if (result.success) {
            messagesDispatched++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }
    }

    // Update campaign metrics
    await this.prisma.promotionCampaign.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        totalRecipients: customers.length,
        messagesSent: { increment: messagesDispatched },
        messagesFailed: { increment: failed },
      },
    });

    await this.auditService.log({
      companyId,
      userId: userId || null,
      module: 'PROMOTIONS',
      referenceId: id,
      action: 'CAMPAIGN_DISPATCH',
      newValue: {
        totalTargeted: customers.length,
        messagesDispatched,
        messagesSkippedConsent,
        failed,
      },
    });

    return {
      totalTargeted: customers.length,
      messagesDispatched,
      messagesSkippedConsent,
      failed,
    };
  }

  private mapToDTO(campaign: any): PromotionCampaignDTO {
    let channels: CommunicationChannel[] = [];
    try {
      channels = JSON.parse(campaign.channels);
    } catch {
      channels = ['SMS'];
    }

    return {
      id: campaign.id,
      companyId: campaign.companyId,
      name: campaign.name,
      description: campaign.description,
      campaignType: campaign.campaignType,
      status: campaign.status,
      startAt: campaign.startAt,
      endAt: campaign.endAt,
      targetCustomerGroup: campaign.targetCustomerGroup,
      channels,
      templateId: campaign.templateId,
      couponId: campaign.couponId,
      totalRecipients: campaign.totalRecipients,
      messagesSent: campaign.messagesSent,
      messagesFailed: campaign.messagesFailed,
      createdBy: campaign.createdBy,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
      template: campaign.template || null,
      coupon: campaign.coupon || null,
    };
  }
}
