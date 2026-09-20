/**
 * SMTP Email Service for RS Inventory - Solo (Step 11)
 * Handles SMTP configuration verification, test emails, and production/transactional email dispatch.
 */

import { SaveSMTPConfigDTO, TestCommunicationResultDTO } from '@rs-inventory/types';
import { ValidationError } from '../../errors/app.error.js';

function getNodemailer() {
  if (typeof require !== 'undefined') {
    try {
      return require('nodemailer');
    } catch {
      return null;
    }
  }
  return null;
}

export class EmailService {
  /**
   * Validate email address format.
   */
  public static isValidEmail(email?: string | null): boolean {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  }

  /**
   * Builds a nodemailer transporter options object from the provided SMTP configuration.
   */
  private createTransporter(config: SaveSMTPConfigDTO, plainPassword?: string): any {
    const nodemailer = getNodemailer();
    if (!nodemailer) {
      throw new Error('Nodemailer library is not available in the current environment.');
    }

    const port = Number(config.port) || 587;
    const isSecure = config.securityMode === 'TLS' || port === 465;
    const timeoutMs = (config.timeoutSeconds || 15) * 1000;

    const transportOptions: any = {
      host: config.host.trim(),
      port,
      secure: isSecure,
      connectionTimeout: timeoutMs,
      greetingTimeout: timeoutMs,
      socketTimeout: timeoutMs,
      tls: {
        // Enforce STARTTLS if configured
        rejectUnauthorized: config.securityMode !== 'PLAIN',
      },
    };

    if (config.username?.trim()) {
      transportOptions.auth = {
        user: config.username.trim(),
        pass: plainPassword || '',
      };
    }

    return nodemailer.createTransport(transportOptions);
  }

  /**
   * Tests SMTP connection without sending an email.
   */
  public async testConnection(
    config: SaveSMTPConfigDTO,
    plainPassword?: string,
  ): Promise<TestCommunicationResultDTO> {
    if (!config.host?.trim()) {
      return { success: false, message: 'SMTP host is required.' };
    }
    if (!config.port || config.port <= 0) {
      return { success: false, message: 'Valid SMTP port is required.' };
    }

    try {
      const transporter = this.createTransporter(config, plainPassword);
      await transporter.verify();
      return {
        success: true,
        message: `Successfully connected to SMTP server ${config.host}:${config.port}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `SMTP Connection Failed: ${err.message || 'Unable to establish connection.'}`,
        details: { code: err.code, command: err.command },
      };
    }
  }

  /**
   * Sends an explicit test email to a specified recipient.
   */
  public async sendTestEmail(
    config: SaveSMTPConfigDTO,
    plainPassword: string | undefined,
    testRecipient: string,
  ): Promise<TestCommunicationResultDTO> {
    if (!EmailService.isValidEmail(testRecipient)) {
      throw new ValidationError(`Invalid recipient email address: ${testRecipient}`);
    }
    if (!EmailService.isValidEmail(config.senderEmail)) {
      throw new ValidationError(`Invalid sender email address: ${config.senderEmail}`);
    }

    try {
      const transporter = this.createTransporter(config, plainPassword);
      const sender = config.senderDisplayName
        ? `"${config.senderDisplayName}" <${config.senderEmail}>`
        : config.senderEmail;

      const result = await transporter.sendMail({
        from: sender,
        to: testRecipient.trim(),
        replyTo: config.replyToEmail?.trim() || undefined,
        subject: `[Test] Email Integration Verification - RS Inventory Solo`,
        text: `This is a test email sent from RS Inventory Solo to verify your SMTP configuration.\n\nHost: ${config.host}:${config.port}\nSecurity: ${config.securityMode}\nTimestamp: ${new Date().toISOString()}\n\nIf you received this, your email configuration is working!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px; background: #ffffff;">
            <h2 style="color: #0284c7; margin-top: 0;">SMTP Test Successful!</h2>
            <p style="color: #334155; font-size: 14px;">This email confirms that your outgoing SMTP configuration in <strong>RS Inventory – Solo</strong> is functional.</p>
            <div style="background: #f8fafc; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #475569;">
              <div><strong>Host:</strong> ${config.host}:${config.port}</div>
              <div><strong>Security:</strong> ${config.securityMode}</div>
              <div><strong>Sender:</strong> ${config.senderEmail}</div>
              <div><strong>Timestamp:</strong> ${new Date().toISOString()}</div>
            </div>
            <p style="color: #94a3b8; font-size: 11px; margin-top: 20px;">RS Inventory – Solo • RS ORANGE TECH PVT LTD</p>
          </div>
        `,
      });

      return {
        success: true,
        message: `Test email successfully sent to ${testRecipient}. (MessageId: ${result.messageId})`,
        details: { messageId: result.messageId },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to send test email: ${err.message}`,
        details: { code: err.code },
      };
    }
  }

  /**
   * Sends an email (promotional or transactional).
   */
  public async sendEmail(
    config: SaveSMTPConfigDTO,
    plainPassword: string | undefined,
    to: string,
    subject: string,
    htmlBody: string,
    textBody?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!EmailService.isValidEmail(to)) {
      return { success: false, error: `Invalid recipient email address: ${to}` };
    }

    try {
      const transporter = this.createTransporter(config, plainPassword);
      const sender = config.senderDisplayName
        ? `"${config.senderDisplayName}" <${config.senderEmail}>`
        : config.senderEmail;

      const result = await transporter.sendMail({
        from: sender,
        to: to.trim(),
        replyTo: config.replyToEmail?.trim() || undefined,
        subject: subject.trim(),
        html: htmlBody,
        text: textBody || htmlBody.replace(/<[^>]*>?/gm, ''),
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'SMTP sending error',
      };
    }
  }
}
