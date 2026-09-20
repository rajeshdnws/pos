/**
 * Message Template Service for RS Inventory - Solo (Step 11)
 * Manages message templates across Email, SMS, and WhatsApp with placeholder validation and rendering.
 */

import { PrismaClient } from '@prisma/client';
import {
  CommunicationChannel,
  MessageTemplateCreateDTO,
  MessageTemplateDTO,
  MessageTemplateUpdateDTO,
} from '@rs-inventory/types';
import { BusinessRuleError, NotFoundError, ValidationError } from '../../errors/app.error.js';

export const SUPPORTED_PLACEHOLDERS = [
  '{{customer_name}}',
  '{{business_name}}',
  '{{coupon_code}}',
  '{{discount_value}}',
  '{{minimum_purchase}}',
  '{{valid_from}}',
  '{{valid_until}}',
  '{{coupon_description}}',
  '{{redemption_instructions}}',
];

export class MessageTemplateService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * List templates with optional channel filtering.
   */
  public async listTemplates(
    companyId: string,
    channel?: CommunicationChannel,
  ): Promise<MessageTemplateDTO[]> {
    const where: any = { companyId };
    if (channel) where.channel = channel;

    const templates = await this.prisma.messageTemplate.findMany({
      where,
      orderBy: [{ channel: 'asc' }, { name: 'asc' }],
    });

    return templates.map((t) => ({
      ...t,
      placeholders: t.placeholders ? JSON.parse(t.placeholders) : [],
    })) as MessageTemplateDTO[];
  }

  /**
   * Get a single template by ID.
   */
  public async getTemplate(companyId: string, id: string): Promise<MessageTemplateDTO> {
    const template = await this.prisma.messageTemplate.findUnique({
      where: { id },
    });
    if (!template || template.companyId !== companyId) {
      throw new NotFoundError('Message template not found.');
    }
    return {
      ...template,
      placeholders: template.placeholders ? JSON.parse(template.placeholders) : [],
    } as MessageTemplateDTO;
  }

  public async getTemplateById(companyId: string, id: string): Promise<MessageTemplateDTO> {
    return this.getTemplate(companyId, id);
  }

  /**
   * Create a new message template with placeholder extraction and validation.
   */
  public async createTemplate(
    companyId: string,
    dto: MessageTemplateCreateDTO,
  ): Promise<MessageTemplateDTO> {
    if (!dto.name?.trim()) throw new ValidationError('Template name is required.');
    if (!dto.body?.trim()) throw new ValidationError('Template message body is required.');
    if (dto.channel === 'EMAIL' && !dto.subject?.trim()) {
      throw new ValidationError('Subject is required for email templates.');
    }

    // Check unique name per channel
    const existing = await this.prisma.messageTemplate.findUnique({
      where: {
        companyId_name_channel: {
          companyId,
          name: dto.name.trim(),
          channel: dto.channel,
        },
      },
    });
    if (existing) {
      throw new BusinessRuleError(
        `A template named "${dto.name}" already exists for channel ${dto.channel}.`,
      );
    }

    const placeholders = this.extractPlaceholders(`${dto.subject || ''} ${dto.body}`);

    const created = await this.prisma.messageTemplate.create({
      data: {
        companyId,
        name: dto.name.trim(),
        channel: dto.channel,
        templateType: dto.templateType || 'PROMOTIONAL',
        subject: dto.subject?.trim() || null,
        body: dto.body.trim(),
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        placeholders: JSON.stringify(placeholders),
      },
    });

    return {
      ...created,
      placeholders,
    } as MessageTemplateDTO;
  }

  /**
   * Update an existing message template.
   */
  public async updateTemplate(
    companyId: string,
    id: string,
    dto: MessageTemplateUpdateDTO,
  ): Promise<MessageTemplateDTO> {
    const existing = await this.getTemplate(companyId, id);

    if (dto.name && dto.name.trim() !== existing.name) {
      const duplicate = await this.prisma.messageTemplate.findUnique({
        where: {
          companyId_name_channel: {
            companyId,
            name: dto.name.trim(),
            channel: existing.channel,
          },
        },
      });
      if (duplicate) {
        throw new BusinessRuleError(
          `A template named "${dto.name}" already exists for channel ${existing.channel}.`,
        );
      }
    }

    const newBody = dto.body !== undefined ? dto.body.trim() : existing.body;
    const newSubject = dto.subject !== undefined ? dto.subject?.trim() || null : existing.subject;
    const placeholders = this.extractPlaceholders(`${newSubject || ''} ${newBody}`);

    const updated = await this.prisma.messageTemplate.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.templateType && { templateType: dto.templateType }),
        ...(dto.subject !== undefined && { subject: newSubject }),
        ...(dto.body !== undefined && { body: newBody }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        placeholders: JSON.stringify(placeholders),
      },
    });

    return {
      ...updated,
      placeholders,
    } as MessageTemplateDTO;
  }

  /**
   * Delete a template.
   */
  public async deleteTemplate(companyId: string, id: string): Promise<boolean> {
    await this.getTemplate(companyId, id);
    await this.prisma.messageTemplate.delete({ where: { id } });
    return true;
  }

  /**
   * Renders a preview of a template with provided or dummy variable replacements.
   */
  public async previewTemplate(
    companyId: string,
    templateId: string,
    sampleData: Record<string, any> = {},
  ): Promise<{ subject?: string; body: string }> {
    const template = await this.getTemplate(companyId, templateId);
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });

    const mergedData: Record<string, string> = {
      customer_name: sampleData.customer_name || 'Ramesh Sharma',
      business_name: sampleData.business_name || company?.businessName || company?.name || 'RS Retail Store',
      coupon_code: sampleData.coupon_code || 'FESTIVE10',
      discount_value: sampleData.discount_value || '10% OFF',
      minimum_purchase: sampleData.minimum_purchase || '₹500.00',
      valid_from: sampleData.valid_from || new Date().toISOString().split('T')[0],
      valid_until: sampleData.valid_until || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      coupon_description: sampleData.coupon_description || 'Special Discount for Valued Customers',
      redemption_instructions: sampleData.redemption_instructions || 'Show this code at the cashier counter during checkout.',
      ...sampleData,
    };

    const renderedSubject = template.subject ? this.interpolate(template.subject, mergedData) : undefined;
    const renderedBody = this.interpolate(template.body, mergedData);

    return { subject: renderedSubject, body: renderedBody };
  }

  /**
   * Replaces placeholders like {{customer_name}} with actual values.
   */
  public interpolate(text: string, values: Record<string, any>): string {
    return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
      const lowerKey = key.toLowerCase();
      if (values[lowerKey] !== undefined && values[lowerKey] !== null) {
        return String(values[lowerKey]);
      }
      return _match; // Keep untouched if variable not provided
    });
  }

  /**
   * Extracts all {{variable}} patterns from a string.
   */
  private extractPlaceholders(text: string): string[] {
    const matches = text.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
    if (!matches) return [];
    const unique = Array.from(new Set(matches.map((m) => m.toLowerCase())));
    return unique;
  }

  /**
   * Seeds default system templates for a new company.
   */
  public async seedDefaultTemplates(companyId: string): Promise<number> {
    const defaults = [
      {
        name: 'Coupon Issued (Email)',
        channel: 'EMAIL' as CommunicationChannel,
        templateType: 'COUPON_ISSUED' as const,
        subject: 'Your Exclusive Discount Coupon from {{business_name}}!',
        body: 'Hello {{customer_name}},\n\nThank you for shopping with us! Here is an exclusive discount coupon for you:\n\nCoupon Code: {{coupon_code}}\nOffer: {{discount_value}}\nMinimum Bill: {{minimum_purchase}}\nValid Until: {{valid_until}}\n\n{{redemption_instructions}}\n\nBest Regards,\n{{business_name}}',
      },
      {
        name: 'Coupon Issued (SMS)',
        channel: 'SMS' as CommunicationChannel,
        templateType: 'COUPON_ISSUED' as const,
        body: 'Dear {{customer_name}}, enjoy {{discount_value}} on min bill {{minimum_purchase}} at {{business_name}}! Use code: {{coupon_code}} before {{valid_until}}.',
      },
      {
        name: 'Coupon Issued (WhatsApp)',
        channel: 'WHATSAPP' as CommunicationChannel,
        templateType: 'COUPON_ISSUED' as const,
        body: '🎉 *Special Offer from {{business_name}}* 🎉\n\nDear {{customer_name}},\n\nHere is your discount voucher for your next purchase:\n🏷️ *Code:* `{{coupon_code}}`\n💰 *Discount:* {{discount_value}}\n📦 *Min Bill:* {{minimum_purchase}}\n⏰ *Valid Till:* {{valid_until}}\n\n_{{redemption_instructions}}_',
      },
      {
        name: 'Promotional Festival Offer (SMS)',
        channel: 'SMS' as CommunicationChannel,
        templateType: 'PROMOTIONAL' as const,
        body: 'Festival Savings at {{business_name}}! Get {{discount_value}} with code {{coupon_code}} valid till {{valid_until}}. Visit us today!',
      },
    ];

    let count = 0;
    for (const t of defaults) {
      const existing = await this.prisma.messageTemplate.findUnique({
        where: {
          companyId_name_channel: {
            companyId,
            name: t.name,
            channel: t.channel,
          },
        },
      });
      if (!existing) {
        await this.createTemplate(companyId, t);
        count++;
      }
    }
    return count;
  }
}

export { MessageTemplateService as TemplateService };
