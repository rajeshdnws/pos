/**
 * Central Communication Service for RS Inventory - Solo (Step 11)
 * Coordinates Email, SMS, WhatsApp providers, enforces customer consent,
 * logs communication history, and dispatches messages without blocking billing transactions.
 */

import { PrismaClient } from '@prisma/client';
import {
  CommunicationChannel,
  CommunicationLogDTO,
  CommunicationLogFilterDTO,
  CommunicationProviderConfigDTO,
  PaginatedResult,
  SaveSMSConfigDTO,
  SaveSMTPConfigDTO,
  SaveWhatsAppConfigDTO,
  TestCommunicationResultDTO,
} from '@rs-inventory/types';
import { BusinessRuleError, NotFoundError, ValidationError } from '../../errors/app.error.js';
import { decryptSecret, encryptSecret } from '../../utils/credential-crypto.js';
import { EmailService } from './email.service.js';
import {
  MockSmsProvider,
  MockWhatsAppProvider,
  SmsProvider,
  TwilioSmsProvider,
  WhatsAppCloudApiProvider,
  WhatsAppProvider,
} from './provider-interfaces.js';

export interface DispatchMessageOptions {
  channel: CommunicationChannel;
  recipient: string;
  messageType: 'TRANSACTIONAL' | 'MARKETING' | 'TEST';
  subject?: string;
  body: string;
  templateId?: string;
  campaignId?: string;
  couponId?: string;
  customerId?: string;
}

export class CommunicationService {
  private readonly emailService: EmailService;

  constructor(private readonly prisma: PrismaClient) {
    this.emailService = new EmailService();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. PROVIDER CONFIGURATION MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves provider configuration for a channel with masked secrets.
   */
  public async getConfig(
    companyId: string,
    channel: CommunicationChannel,
  ): Promise<CommunicationProviderConfigDTO | null> {
    const config = await this.prisma.communicationProviderConfig.findUnique({
      where: { companyId_channel: { companyId, channel } },
    });
    if (!config) return null;

    let payload: Record<string, any> = {};
    try {
      payload = JSON.parse(config.configPayload);
    } catch {
      payload = {};
    }

    return {
      id: config.id,
      companyId: config.companyId,
      channel: config.channel as CommunicationChannel,
      providerName: config.providerName,
      isEnabled: config.isEnabled,
      configPayload: payload,
      hasSecrets: Boolean(config.encryptedSecrets && config.encryptedSecrets.trim().length > 0),
      lastTestStatus: config.lastTestStatus as any,
      lastTestMessage: config.lastTestMessage,
      lastTestedAt: config.lastTestedAt,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Save SMTP configuration. Plaintext password is encrypted and never stored in plaintext.
   */
  public async saveSMTPConfig(
    companyId: string,
    dto: SaveSMTPConfigDTO,
  ): Promise<CommunicationProviderConfigDTO> {
    if (!dto.host?.trim()) throw new ValidationError('SMTP host is required.');
    if (!dto.senderEmail?.trim()) throw new ValidationError('Sender email is required.');

    const existing = await this.prisma.communicationProviderConfig.findUnique({
      where: { companyId_channel: { companyId, channel: 'EMAIL' } },
    });

    let encryptedSecrets = existing?.encryptedSecrets;
    // If a new password is provided, encrypt it; otherwise preserve existing
    if (dto.password && dto.password !== '••••••••' && dto.password.trim().length > 0) {
      encryptedSecrets = encryptSecret(dto.password.trim(), companyId);
    }

    const nonSensitivePayload = {
      providerName: dto.providerName || 'SMTP',
      host: dto.host.trim(),
      port: Number(dto.port) || 587,
      securityMode: dto.securityMode || 'STARTTLS',
      username: dto.username?.trim() || '',
      senderDisplayName: dto.senderDisplayName?.trim() || '',
      senderEmail: dto.senderEmail.trim(),
      replyToEmail: dto.replyToEmail?.trim() || '',
      timeoutSeconds: Number(dto.timeoutSeconds) || 15,
    };

    await this.prisma.communicationProviderConfig.upsert({
      where: { companyId_channel: { companyId, channel: 'EMAIL' } },
      create: {
        companyId,
        channel: 'EMAIL',
        providerName: dto.providerName || 'SMTP',
        isEnabled: dto.isEnabled !== undefined ? dto.isEnabled : true,
        configPayload: JSON.stringify(nonSensitivePayload),
        encryptedSecrets: encryptedSecrets || null,
      },
      update: {
        providerName: dto.providerName || 'SMTP',
        isEnabled: dto.isEnabled !== undefined ? dto.isEnabled : true,
        configPayload: JSON.stringify(nonSensitivePayload),
        ...(encryptedSecrets !== undefined && { encryptedSecrets }),
      },
    });

    return (await this.getConfig(companyId, 'EMAIL'))!;
  }

  /**
   * Save SMS configuration.
   */
  public async saveSMSConfig(
    companyId: string,
    dto: SaveSMSConfigDTO,
  ): Promise<CommunicationProviderConfigDTO> {
    const existing = await this.prisma.communicationProviderConfig.findUnique({
      where: { companyId_channel: { companyId, channel: 'SMS' } },
    });

    let encryptedSecrets = existing?.encryptedSecrets;
    if (dto.authToken && dto.authToken !== '••••••••' && dto.authToken.trim().length > 0) {
      encryptedSecrets = encryptSecret(dto.authToken.trim(), companyId);
    }

    const nonSensitivePayload = {
      providerName: dto.providerName || 'MOCK_SMS',
      apiEndpoint: dto.apiEndpoint?.trim() || '',
      accountSid: dto.accountSid?.trim() || '',
      senderId: dto.senderId?.trim() || '',
      region: dto.region?.trim() || 'IN',
    };

    await this.prisma.communicationProviderConfig.upsert({
      where: { companyId_channel: { companyId, channel: 'SMS' } },
      create: {
        companyId,
        channel: 'SMS',
        providerName: dto.providerName || 'MOCK_SMS',
        isEnabled: dto.isEnabled !== undefined ? dto.isEnabled : true,
        configPayload: JSON.stringify(nonSensitivePayload),
        encryptedSecrets: encryptedSecrets || null,
      },
      update: {
        providerName: dto.providerName || 'MOCK_SMS',
        isEnabled: dto.isEnabled !== undefined ? dto.isEnabled : true,
        configPayload: JSON.stringify(nonSensitivePayload),
        ...(encryptedSecrets !== undefined && { encryptedSecrets }),
      },
    });

    return (await this.getConfig(companyId, 'SMS'))!;
  }

  /**
   * Save WhatsApp configuration.
   */
  public async saveWhatsAppConfig(
    companyId: string,
    dto: SaveWhatsAppConfigDTO,
  ): Promise<CommunicationProviderConfigDTO> {
    const existing = await this.prisma.communicationProviderConfig.findUnique({
      where: { companyId_channel: { companyId, channel: 'WHATSAPP' } },
    });

    let encryptedSecrets = existing?.encryptedSecrets;
    if (dto.accessToken && dto.accessToken !== '••••••••' && dto.accessToken.trim().length > 0) {
      encryptedSecrets = encryptSecret(dto.accessToken.trim(), companyId);
    }

    const nonSensitivePayload = {
      providerName: dto.providerName || 'MOCK_WHATSAPP',
      businessAccountId: dto.businessAccountId?.trim() || '',
      phoneNumberId: dto.phoneNumberId?.trim() || '',
      senderPhoneNumber: dto.senderPhoneNumber?.trim() || '',
      apiEndpoint: dto.apiEndpoint?.trim() || 'https://graph.facebook.com/v18.0',
    };

    await this.prisma.communicationProviderConfig.upsert({
      where: { companyId_channel: { companyId, channel: 'WHATSAPP' } },
      create: {
        companyId,
        channel: 'WHATSAPP',
        providerName: dto.providerName || 'MOCK_WHATSAPP',
        isEnabled: dto.isEnabled !== undefined ? dto.isEnabled : true,
        configPayload: JSON.stringify(nonSensitivePayload),
        encryptedSecrets: encryptedSecrets || null,
      },
      update: {
        providerName: dto.providerName || 'MOCK_WHATSAPP',
        isEnabled: dto.isEnabled !== undefined ? dto.isEnabled : true,
        configPayload: JSON.stringify(nonSensitivePayload),
        ...(encryptedSecrets !== undefined && { encryptedSecrets }),
      },
    });

    return (await this.getConfig(companyId, 'WHATSAPP'))!;
  }

  /**
   * Aliases for camelCase naming compatibility
   */
  public async saveSmtpConfig(
    companyId: string,
    dto: SaveSMTPConfigDTO,
  ): Promise<CommunicationProviderConfigDTO> {
    return this.saveSMTPConfig(companyId, dto);
  }

  public async saveSmsConfig(
    companyId: string,
    dto: SaveSMSConfigDTO,
  ): Promise<CommunicationProviderConfigDTO> {
    return this.saveSMSConfig(companyId, dto);
  }

  public async testConnection(
    companyId: string,
    channel: CommunicationChannel,
    testRecipient?: string,
  ): Promise<TestCommunicationResultDTO> {
    return this.testConfig(companyId, channel, testRecipient);
  }

  /**
   * Test connection and optionally send an explicit test message.
   */
  public async testConfig(
    companyId: string,
    channel: CommunicationChannel,
    testRecipient?: string,
  ): Promise<TestCommunicationResultDTO> {
    const config = await this.prisma.communicationProviderConfig.findUnique({
      where: { companyId_channel: { companyId, channel } },
    });
    if (!config) {
      return { success: false, message: `No configuration found for channel ${channel}.` };
    }

    let payload: Record<string, any> = {};
    try {
      payload = JSON.parse(config.configPayload);
    } catch {
      payload = {};
    }

    let plainSecret = '';
    if (config.encryptedSecrets) {
      plainSecret = decryptSecret(config.encryptedSecrets, companyId);
    }

    let result: TestCommunicationResultDTO;

    if (channel === 'EMAIL') {
      const smtpDto: SaveSMTPConfigDTO = { ...payload, isEnabled: config.isEnabled } as any;
      if (testRecipient && testRecipient.trim().length > 0) {
        result = await this.emailService.sendTestEmail(smtpDto, plainSecret, testRecipient.trim());
      } else {
        result = await this.emailService.testConnection(smtpDto, plainSecret);
      }
    } else if (channel === 'SMS') {
      const smsProvider = this.resolveSmsProvider(config.providerName, payload, plainSecret);
      if (testRecipient && testRecipient.trim().length > 0) {
        const sendRes = await smsProvider.sendMessage(
          testRecipient.trim(),
          'Test SMS from RS Inventory Solo - Your SMS configuration is active!',
        );
        result = {
          success: sendRes.success,
          message: sendRes.success
            ? `Test SMS sent successfully to ${testRecipient}.`
            : `Failed to send test SMS: ${sendRes.error}`,
        };
      } else {
        const conn = await smsProvider.testConnection();
        result = { success: conn.success, message: conn.message };
      }
    } else if (channel === 'WHATSAPP') {
      const waProvider = this.resolveWhatsAppProvider(config.providerName, payload, plainSecret);
      if (testRecipient && testRecipient.trim().length > 0) {
        const sendRes = await waProvider.sendMessage(
          testRecipient.trim(),
          'Test message from RS Inventory Solo - WhatsApp integration verified!',
        );
        result = {
          success: sendRes.success,
          message: sendRes.success
            ? `Test WhatsApp message sent to ${testRecipient}.`
            : `Failed to send WhatsApp message: ${sendRes.error}`,
        };
      } else {
        const conn = await waProvider.testConnection();
        result = { success: conn.success, message: conn.message };
      }
    } else {
      result = { success: false, message: `Unsupported channel: ${channel}` };
    }

    // Record last test outcome
    await this.prisma.communicationProviderConfig.update({
      where: { id: config.id },
      data: {
        lastTestStatus: result.success ? 'SUCCESS' : 'FAILED',
        lastTestMessage: result.message,
        lastTestedAt: new Date(),
      },
    });

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. MESSAGE DISPATCH & CONSENT VALIDATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Dispatches a message to a customer or recipient while checking marketing consent.
   * Asynchronous, resilient: will not throw an error that breaks checkout transactions.
   */
  public async dispatchMessage(
    companyId: string,
    options: DispatchMessageOptions,
  ): Promise<{ success: boolean; logId: string; status: string; error?: string }> {
    const { channel, recipient, messageType, subject, body, templateId, campaignId, couponId, customerId } = options;

    // 1. Consent Verification for MARKETING messages
    if (messageType === 'MARKETING' && customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
      if (customer) {
        if (customer.consentStatus === 'OPTED_OUT') {
          return this.recordFailure(
            companyId,
            options,
            'Customer has opted out of all promotional marketing.',
          );
        }
        if (channel === 'EMAIL' && !customer.emailConsent) {
          return this.recordFailure(
            companyId,
            options,
            'Customer has not given consent for Email marketing.',
          );
        }
        if (channel === 'SMS' && !customer.smsConsent) {
          return this.recordFailure(
            companyId,
            options,
            'Customer has not given consent for SMS marketing.',
          );
        }
        if (channel === 'WHATSAPP' && !customer.whatsappConsent) {
          return this.recordFailure(
            companyId,
            options,
            'Customer has not given consent for WhatsApp marketing.',
          );
        }
      }
    }

    // 2. Fetch Provider Config
    const configRecord = await this.prisma.communicationProviderConfig.findUnique({
      where: { companyId_channel: { companyId, channel } },
    });

    if (!configRecord || !configRecord.isEnabled) {
      return this.recordFailure(
        companyId,
        options,
        `${channel} provider is not configured or is disabled.`,
      );
    }

    let payload: Record<string, any> = {};
    try {
      payload = JSON.parse(configRecord.configPayload);
    } catch {
      payload = {};
    }

    let plainSecret = '';
    if (configRecord.encryptedSecrets) {
      plainSecret = decryptSecret(configRecord.encryptedSecrets, companyId);
    }

    // 3. Create initial pending log
    const log = await this.prisma.communicationLog.create({
      data: {
        companyId,
        channel,
        recipientReference: recipient,
        messageType,
        templateId: templateId || null,
        campaignId: campaignId || null,
        couponId: couponId || null,
        customerId: customerId || null,
        status: 'PROCESSING',
      },
    });

    // 4. Send Message via selected provider
    try {
      if (channel === 'EMAIL') {
        const smtpDto: SaveSMTPConfigDTO = { ...payload, isEnabled: configRecord.isEnabled } as any;
        const res = await this.emailService.sendEmail(
          smtpDto,
          plainSecret,
          recipient,
          subject || 'Notification from RS Inventory',
          body,
        );

        if (res.success) {
          await this.prisma.communicationLog.update({
            where: { id: log.id },
            data: {
              status: 'DELIVERED',
              deliveredAt: new Date(),
              providerMessageId: res.messageId || null,
            },
          });
          return { success: true, logId: log.id, status: 'DELIVERED' };
        } else {
          await this.prisma.communicationLog.update({
            where: { id: log.id },
            data: { status: 'FAILED', failureReason: res.error },
          });
          return { success: false, logId: log.id, status: 'FAILED', error: res.error };
        }
      } else if (channel === 'SMS') {
        const provider = this.resolveSmsProvider(configRecord.providerName, payload, plainSecret);
        const res = await provider.sendMessage(recipient, body);

        if (res.success) {
          await this.prisma.communicationLog.update({
            where: { id: log.id },
            data: {
              status: res.status === 'DELIVERED' ? 'DELIVERED' : 'ACCEPTED',
              deliveredAt: res.status === 'DELIVERED' ? new Date() : null,
              providerMessageId: res.messageId || null,
            },
          });
          return { success: true, logId: log.id, status: res.status };
        } else {
          await this.prisma.communicationLog.update({
            where: { id: log.id },
            data: { status: 'FAILED', failureReason: res.error },
          });
          return { success: false, logId: log.id, status: 'FAILED', error: res.error };
        }
      } else if (channel === 'WHATSAPP') {
        const provider = this.resolveWhatsAppProvider(configRecord.providerName, payload, plainSecret);
        const res = await provider.sendMessage(recipient, body);

        if (res.success) {
          await this.prisma.communicationLog.update({
            where: { id: log.id },
            data: {
              status: res.status === 'DELIVERED' ? 'DELIVERED' : 'ACCEPTED',
              deliveredAt: res.status === 'DELIVERED' ? new Date() : null,
              providerMessageId: res.messageId || null,
            },
          });
          return { success: true, logId: log.id, status: res.status };
        } else {
          await this.prisma.communicationLog.update({
            where: { id: log.id },
            data: { status: 'FAILED', failureReason: res.error },
          });
          return { success: false, logId: log.id, status: 'FAILED', error: res.error };
        }
      }
    } catch (err: any) {
      await this.prisma.communicationLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', failureReason: err.message },
      });
      return { success: false, logId: log.id, status: 'FAILED', error: err.message };
    }

    return { success: false, logId: log.id, status: 'FAILED', error: 'Unknown provider outcome.' };
  }

  private async recordFailure(
    companyId: string,
    options: DispatchMessageOptions,
    reason: string,
  ): Promise<{ success: boolean; logId: string; status: string; error: string }> {
    const log = await this.prisma.communicationLog.create({
      data: {
        companyId,
        channel: options.channel,
        recipientReference: options.recipient,
        messageType: options.messageType,
        templateId: options.templateId || null,
        campaignId: options.campaignId || null,
        couponId: options.couponId || null,
        customerId: options.customerId || null,
        status: 'FAILED',
        failureReason: reason,
      },
    });
    return { success: false, logId: log.id, status: 'FAILED', error: reason };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. COMMUNICATION LOGS & RETRIES
  // ─────────────────────────────────────────────────────────────────────────────

  public async listLogs(
    companyId: string,
    filters: CommunicationLogFilterDTO = {},
  ): Promise<PaginatedResult<CommunicationLogDTO>> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = { companyId };
    if (filters.channel) where.channel = filters.channel;
    if (filters.status) where.status = filters.status;
    if (filters.messageType) where.messageType = filters.messageType;
    if (filters.search?.trim()) {
      where.recipientReference = { contains: filters.search.trim() };
    }
    if (filters.startDate || filters.endDate) {
      where.submittedAt = {};
      if (filters.startDate) where.submittedAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.submittedAt.lte = new Date(filters.endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.communicationLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { submittedAt: 'desc' },
        include: {
          template: { select: { name: true } },
          campaign: { select: { name: true } },
          customer: { select: { name: true, phone: true, email: true } },
        },
      }),
      this.prisma.communicationLog.count({ where }),
    ]);

    return {
      items: items as unknown as CommunicationLogDTO[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  public async retryLog(companyId: string, logId: string): Promise<CommunicationLogDTO> {
    const log = await this.prisma.communicationLog.findUnique({
      where: { id: logId },
    });
    if (!log || log.companyId !== companyId) {
      throw new NotFoundError('Communication log not found.');
    }

    if (log.retryCount >= 5) {
      throw new BusinessRuleError('Maximum retry attempts (5) reached for this message.');
    }

    // Dispatch again
    const res = await this.dispatchMessage(companyId, {
      channel: log.channel as CommunicationChannel,
      recipient: log.recipientReference,
      messageType: log.messageType as any,
      templateId: log.templateId || undefined,
      campaignId: log.campaignId || undefined,
      couponId: log.couponId || undefined,
      customerId: log.customerId || undefined,
      body: 'Retrying communication message.',
    });

    const updated = await this.prisma.communicationLog.update({
      where: { id: logId },
      data: {
        retryCount: { increment: 1 },
        status: res.status,
        failureReason: res.error || null,
        deliveredAt: res.success ? new Date() : null,
      },
      include: {
        template: { select: { name: true } },
        campaign: { select: { name: true } },
        customer: { select: { name: true, phone: true, email: true } },
      },
    });

    return updated as unknown as CommunicationLogDTO;
  }

  public async retryMessage(companyId: string, logId: string): Promise<CommunicationLogDTO> {
    return this.retryLog(companyId, logId);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. CUSTOMER CONSENT & PREFERENCES
  // ─────────────────────────────────────────────────────────────────────────────

  public async updateCustomerPreferences(
    companyId: string,
    customerId: string,
    dto: {
      preferredChannel?: string;
      emailConsent?: boolean;
      smsConsent?: boolean;
      whatsappConsent?: boolean;
      consentStatus?: 'OPTED_IN' | 'OPTED_OUT' | 'PENDING';
      communicationNotes?: string;
    },
  ) {
    const cust = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!cust || cust.companyId !== companyId) throw new NotFoundError('Customer not found.');

    const isOptingOut = dto.consentStatus === 'OPTED_OUT';

    return this.prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(dto.preferredChannel && { preferredChannel: dto.preferredChannel }),
        ...(dto.emailConsent !== undefined && { emailConsent: dto.emailConsent }),
        ...(dto.smsConsent !== undefined && { smsConsent: dto.smsConsent }),
        ...(dto.whatsappConsent !== undefined && { whatsappConsent: dto.whatsappConsent }),
        ...(dto.consentStatus && { consentStatus: dto.consentStatus }),
        ...(dto.communicationNotes !== undefined && { communicationNotes: dto.communicationNotes }),
        ...(isOptingOut && { optedOutAt: new Date() }),
        ...(!isOptingOut && dto.consentStatus === 'OPTED_IN' && { consentDate: new Date() }),
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. HELPER PROVIDER RESOLVERS
  // ─────────────────────────────────────────────────────────────────────────────

  private resolveSmsProvider(
    providerName: string,
    payload: Record<string, any>,
    secret: string,
  ): SmsProvider {
    if (providerName === 'TWILIO' && payload.accountSid && secret) {
      return new TwilioSmsProvider(payload.accountSid, secret, payload.senderId || '');
    }
    return new MockSmsProvider(payload);
  }

  private resolveWhatsAppProvider(
    providerName: string,
    payload: Record<string, any>,
    secret: string,
  ): WhatsAppProvider {
    if (providerName === 'WHATSAPP_CLOUD' && payload.phoneNumberId && secret) {
      return new WhatsAppCloudApiProvider(payload.phoneNumberId, secret);
    }
    return new MockWhatsAppProvider(payload);
  }
}
