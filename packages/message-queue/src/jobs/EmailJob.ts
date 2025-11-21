import * as nodemailer from 'nodemailer';
import { Logger } from 'winston';
import { z } from 'zod';
import { QueueJob } from '../types';

// Email job data schema
export const EmailJobDataSchema = z.object({
  to: z.union([z.string(), z.array(z.string())]),
  subject: z.string(),
  text: z.string().optional(),
  html: z.string().optional(),
  from: z.string().optional(),
  cc: z.union([z.string(), z.array(z.string())]).optional(),
  bcc: z.union([z.string(), z.array(z.string())]).optional(),
  replyTo: z.string().optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        content: z.union([z.string(), z.instanceof(Buffer)]),
        contentType: z.string().optional(),
        encoding: z.string().optional(),
      })
    )
    .optional(),
  priority: z.enum(['high', 'normal', 'low']).optional(),
  template: z
    .object({
      name: z.string(),
      data: z.record(z.any()),
    })
    .optional(),
});

export type EmailJobData = z.infer<typeof EmailJobDataSchema>;

// Email configuration
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  templates?: {
    [key: string]: (data: any) => { subject: string; html: string; text?: string };
  };
}

/**
 * Email Job Implementation
 *
 * Handles sending emails via SMTP using nodemailer.
 * Supports templates, attachments, and various email options.
 */
export class EmailJob {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;
  private logger: Logger;

  constructor(config: EmailConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;

    // Create nodemailer transporter
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      // Additional options for better reliability
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  /**
   * Execute the email job
   */
  async execute(job: QueueJob): Promise<any> {
    const emailData = EmailJobDataSchema.parse(job.data);

    try {
      this.logger.info('Sending email', {
        jobId: job.id,
        to: emailData.to,
        subject: emailData.subject,
      });

      // Prepare email options
      const mailOptions = await this.prepareMailOptions(emailData);

      // Send email
      const result = await this.transporter.sendMail(mailOptions);

      this.logger.info('Email sent successfully', {
        jobId: job.id,
        messageId: result.messageId,
        response: result.response,
      });

      return {
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
        pending: result.pending,
        response: result.response,
      };
    } catch (error) {
      this.logger.error('Failed to send email', {
        jobId: job.id,
        error: (error as Error).message,
        to: emailData.to,
        subject: emailData.subject,
      });

      throw new Error(`Email sending failed: ${(error as Error).message}`);
    }
  }

  /**
   * Prepare mail options from job data
   */
  private async prepareMailOptions(emailData: EmailJobData): Promise<nodemailer.SendMailOptions> {
    let subject = emailData.subject;
    let html = emailData.html;
    let text = emailData.text;

    // Handle template rendering
    if (emailData.template && this.config.templates) {
      const template = this.config.templates[emailData.template.name];
      if (template) {
        const rendered = template(emailData.template.data);
        subject = rendered.subject;
        html = rendered.html;
        text = rendered.text || text;
      }
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: emailData.from || this.config.from,
      to: emailData.to,
      subject,
      text,
      html,
      cc: emailData.cc,
      bcc: emailData.bcc,
      replyTo: emailData.replyTo,
      attachments: emailData.attachments,
      priority: emailData.priority as 'high' | 'normal' | 'low' | undefined,
    };

    return mailOptions;
  }

  /**
   * Validate email configuration
   */
  async validateConfig(): Promise<boolean> {
    try {
      // Test connection
      await this.transporter.verify();
      this.logger.info('Email configuration validated successfully');
      return true;
    } catch (error) {
      this.logger.error('Email configuration validation failed', {
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Get email statistics
   */
  async getStats(): Promise<any> {
    // Get transporter stats if available
    try {
      const stats = (this.transporter as any).getStats?.();
      return {
        isIdle: this.transporter.isIdle(),
        stats: stats || null,
      };
    } catch (error) {
      return {
        isIdle: this.transporter.isIdle(),
        error: (error as Error).message,
      };
    }
  }

  /**
   * Close the email transporter
   */
  async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
    }
  }

  /**
   * Create a job data object for email sending
   */
  static createJobData(data: EmailJobData): EmailJobData {
    return EmailJobDataSchema.parse(data);
  }

  /**
   * Helper method to create a simple text email job
   */
  static createTextEmail(
    to: string | string[],
    subject: string,
    text: string,
    options?: {
      from?: string;
      cc?: string | string[];
      bcc?: string | string[];
      priority?: 'high' | 'normal' | 'low';
    }
  ): EmailJobData {
    return EmailJobDataSchema.parse({
      to,
      subject,
      text,
      ...options,
    });
  }

  /**
   * Helper method to create an HTML email job
   */
  static createHtmlEmail(
    to: string | string[],
    subject: string,
    html: string,
    options?: {
      text?: string;
      from?: string;
      cc?: string | string[];
      bcc?: string | string[];
      priority?: 'high' | 'normal' | 'low';
      attachments?: Array<{
        filename: string;
        content: string | Buffer;
        contentType?: string;
        encoding?: string;
      }>;
    }
  ): EmailJobData {
    return EmailJobDataSchema.parse({
      to,
      subject,
      html,
      ...options,
    });
  }

  /**
   * Helper method to create a template-based email job
   */
  static createTemplateEmail(
    to: string | string[],
    templateName: string,
    templateData: any,
    options?: {
      from?: string;
      cc?: string | string[];
      bcc?: string | string[];
      priority?: 'high' | 'normal' | 'low';
      attachments?: Array<{
        filename: string;
        content: string | Buffer;
        contentType?: string;
        encoding?: string;
      }>;
    }
  ): EmailJobData {
    return EmailJobDataSchema.parse({
      to,
      subject: '', // Will be set by template
      template: {
        name: templateName,
        data: templateData,
      },
      ...options,
    });
  }
}
