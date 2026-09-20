/**
 * Provider Abstraction Interfaces for SMS and WhatsApp
 * RS Inventory - Solo (Step 11)
 */

export interface ProviderConnectionResult {
  success: boolean;
  message: string;
  provider: string;
  isMock: boolean;
}

export interface ProviderSendResult {
  success: boolean;
  messageId?: string;
  status: 'ACCEPTED' | 'DELIVERED' | 'FAILED';
  error?: string;
}

export interface SmsProvider {
  name: string;
  isMock: boolean;
  testConnection(): Promise<ProviderConnectionResult>;
  sendMessage(to: string, message: string): Promise<ProviderSendResult>;
  getProviderStatus(): Promise<{ connected: boolean; provider: string; isMock: boolean }>;
}

export interface WhatsAppProvider {
  name: string;
  isMock: boolean;
  testConnection(): Promise<ProviderConnectionResult>;
  sendMessage(to: string, message: string): Promise<ProviderSendResult>;
  sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string,
    components?: any[],
  ): Promise<ProviderSendResult>;
  getMessageStatus?(messageId: string): Promise<{ status: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK PROVIDERS (Clearly labeled for development and offline simulation)
// ─────────────────────────────────────────────────────────────────────────────

export class MockSmsProvider implements SmsProvider {
  public name = 'MOCK_SMS';
  public isMock = true;

  constructor(_config?: { senderId?: string }) {
    void _config;
  }

  public async testConnection(): Promise<ProviderConnectionResult> {
    return {
      success: true,
      message: 'Mock SMS Provider connected successfully (Simulation Mode).',
      provider: 'MOCK_SMS',
      isMock: true,
    };
  }

  public async sendMessage(to: string, _message: string): Promise<ProviderSendResult> {
    if (!to || to.trim().length < 5) {
      return {
        success: false,
        status: 'FAILED',
        error: 'Invalid recipient mobile number.',
      };
    }
    const mockId = `mock-sms-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return {
      success: true,
      messageId: mockId,
      status: 'DELIVERED',
    };
  }

  public async getProviderStatus(): Promise<{ connected: boolean; provider: string; isMock: boolean }> {
    return { connected: true, provider: 'MOCK_SMS', isMock: true };
  }
}

export class MockWhatsAppProvider implements WhatsAppProvider {
  public name = 'MOCK_WHATSAPP';
  public isMock = true;

  constructor(_config?: { senderPhoneNumber?: string }) {
    void _config;
  }

  public async testConnection(): Promise<ProviderConnectionResult> {
    return {
      success: true,
      message: 'Mock WhatsApp Provider connected successfully (Simulation Mode).',
      provider: 'MOCK_WHATSAPP',
      isMock: true,
    };
  }

  public async sendMessage(to: string, _message: string): Promise<ProviderSendResult> {
    if (!to || to.trim().length < 5) {
      return {
        success: false,
        status: 'FAILED',
        error: 'Invalid recipient phone number.',
      };
    }
    const mockId = `mock-wa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return {
      success: true,
      messageId: mockId,
      status: 'DELIVERED',
    };
  }

  public async sendTemplateMessage(
    to: string,
    _templateName: string,
    _languageCode: string = 'en',
    _components: any[] = [],
  ): Promise<ProviderSendResult> {
    if (!to || to.trim().length < 5) {
      return {
        success: false,
        status: 'FAILED',
        error: 'Invalid recipient phone number.',
      };
    }
    const mockId = `mock-wa-tmpl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return {
      success: true,
      messageId: mockId,
      status: 'DELIVERED',
    };
  }

  public async getMessageStatus(_messageId: string): Promise<{ status: string }> {
    return { status: 'DELIVERED' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REAL PROVIDERS (Twilio SMS & Meta WhatsApp Business Cloud API)
// ─────────────────────────────────────────────────────────────────────────────

export class TwilioSmsProvider implements SmsProvider {
  public name = 'TWILIO';
  public isMock = false;

  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly fromNumberOrSenderId: string,
  ) {}

  public async testConnection(): Promise<ProviderConnectionResult> {
    if (!this.accountSid || !this.authToken) {
      return {
        success: false,
        message: 'Twilio Account SID and Auth Token are required.',
        provider: 'TWILIO',
        isMock: false,
      };
    }
    try {
      // Check credentials via basic fetch if available
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}.json`;
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const res = await fetch(url, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (res.ok) {
        return {
          success: true,
          message: 'Connected to Twilio API successfully.',
          provider: 'TWILIO',
          isMock: false,
        };
      }
      const errJson: any = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errJson.message || `Twilio authentication failed (Status ${res.status}).`,
        provider: 'TWILIO',
        isMock: false,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Connection error: ${err.message}`,
        provider: 'TWILIO',
        isMock: false,
      };
    }
  }

  public async sendMessage(to: string, message: string): Promise<ProviderSendResult> {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const body = new URLSearchParams();
      body.append('To', to);
      body.append('From', this.fromNumberOrSenderId);
      body.append('Body', message);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data: any = await res.json();
      if (res.ok && data.sid) {
        return {
          success: true,
          messageId: data.sid,
          status: 'ACCEPTED', // Provider accepted; not yet confirmed delivered
        };
      }
      return {
        success: false,
        status: 'FAILED',
        error: data.message || 'Twilio send message failed.',
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'FAILED',
        error: err.message,
      };
    }
  }

  public async getProviderStatus(): Promise<{ connected: boolean; provider: string; isMock: boolean }> {
    const test = await this.testConnection();
    return { connected: test.success, provider: 'TWILIO', isMock: false };
  }
}

export class WhatsAppCloudApiProvider implements WhatsAppProvider {
  public name = 'WHATSAPP_CLOUD';
  public isMock = false;

  constructor(
    private readonly phoneNumberId: string,
    private readonly accessToken: string,
  ) {}

  public async testConnection(): Promise<ProviderConnectionResult> {
    if (!this.phoneNumberId || !this.accessToken) {
      return {
        success: false,
        message: 'Phone Number ID and Access Token are required for Meta WhatsApp Cloud API.',
        provider: 'WHATSAPP_CLOUD',
        isMock: false,
      };
    }
    try {
      const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      if (res.ok) {
        return {
          success: true,
          message: 'Connected to Meta WhatsApp Cloud API successfully.',
          provider: 'WHATSAPP_CLOUD',
          isMock: false,
        };
      }
      const data: any = await res.json().catch(() => ({}));
      return {
        success: false,
        message: data.error?.message || `WhatsApp Cloud API error (Status ${res.status}).`,
        provider: 'WHATSAPP_CLOUD',
        isMock: false,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Connection error: ${err.message}`,
        provider: 'WHATSAPP_CLOUD',
        isMock: false,
      };
    }
  }

  public async sendMessage(to: string, message: string): Promise<ProviderSendResult> {
    try {
      const cleanPhone = to.replace(/[^0-9]/g, '');
      const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: { preview_url: false, body: message },
        }),
      });

      const data: any = await res.json();
      if (res.ok && data.messages?.[0]?.id) {
        return {
          success: true,
          messageId: data.messages[0].id,
          status: 'ACCEPTED',
        };
      }
      return {
        success: false,
        status: 'FAILED',
        error: data.error?.message || 'Failed to send WhatsApp message.',
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'FAILED',
        error: err.message,
      };
    }
  }

  public async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = 'en',
    components: any[] = [],
  ): Promise<ProviderSendResult> {
    try {
      const cleanPhone = to.replace(/[^0-9]/g, '');
      const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components: components.length > 0 ? components : undefined,
          },
        }),
      });

      const data: any = await res.json();
      if (res.ok && data.messages?.[0]?.id) {
        return {
          success: true,
          messageId: data.messages[0].id,
          status: 'ACCEPTED',
        };
      }
      return {
        success: false,
        status: 'FAILED',
        error: data.error?.message || 'Failed to send WhatsApp template message.',
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'FAILED',
        error: err.message,
      };
    }
  }
}
