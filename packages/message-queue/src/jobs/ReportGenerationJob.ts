import * as fs from 'fs';
import * as path from 'path';
import { Logger } from 'winston';
import { z } from 'zod';
import { QueueJob } from '../types';

// Report generation job data schema
export const ReportGenerationJobDataSchema = z.object({
  reportType: z.enum(['user-activity', 'system-metrics', 'financial', 'custom']),
  parameters: z.record(z.any()),
  format: z.enum(['pdf', 'excel', 'csv', 'json', 'html']),
  filters: z
    .object({
      dateRange: z
        .object({
          start: z.date(),
          end: z.date(),
        })
        .optional(),
      userIds: z.array(z.string()).optional(),
      categories: z.array(z.string()).optional(),
      status: z.array(z.string()).optional(),
    })
    .optional(),
  output: z.object({
    filename: z.string(),
    path: z.string().optional(),
    email: z
      .object({
        to: z.union([z.string(), z.array(z.string())]),
        subject: z.string().optional(),
        template: z.string().optional(),
      })
      .optional(),
  }),
  template: z
    .object({
      name: z.string(),
      data: z.record(z.any()),
    })
    .optional(),
});

export type ReportGenerationJobData = z.infer<typeof ReportGenerationJobDataSchema>;

// Report generator interface
export interface ReportGenerator {
  generate(data: ReportGenerationJobData, logger: Logger): Promise<Buffer>;
  getSupportedFormats(): string[];
}

// Report template interface
export interface ReportTemplate {
  name: string;
  render(data: any): Promise<string>;
}

/**
 * Report Generation Job Implementation
 *
 * Handles generating various types of reports in different formats.
 * Supports data filtering, templating, and output delivery.
 */
export class ReportGenerationJob {
  private generators: Map<string, ReportGenerator> = new Map();
  private templates: Map<string, ReportTemplate> = new Map();
  private logger: Logger;
  private outputDir: string;

  constructor(logger: Logger, outputDir: string = './reports') {
    this.logger = logger;
    this.outputDir = outputDir;

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Register default generators
    this.registerDefaultGenerators();
  }

  /**
   * Execute the report generation job
   */
  async execute(job: QueueJob): Promise<any> {
    const reportData = ReportGenerationJobDataSchema.parse(job.data);

    try {
      this.logger.info('Starting report generation', {
        jobId: job.id,
        reportType: reportData.reportType,
        format: reportData.format,
        filename: reportData.output.filename,
      });

      // Get the appropriate generator
      const generator = this.generators.get(reportData.reportType);
      if (!generator) {
        throw new Error(`No generator found for report type: ${reportData.reportType}`);
      }

      // Check if format is supported
      if (!generator.getSupportedFormats().includes(reportData.format)) {
        throw new Error(
          `Format ${reportData.format} not supported for report type ${reportData.reportType}`
        );
      }

      // Generate the report
      const reportBuffer = await generator.generate(reportData, this.logger);

      // Save the report to file
      const outputPath = await this.saveReport(reportBuffer, reportData);

      this.logger.info('Report generated successfully', {
        jobId: job.id,
        outputPath,
        size: reportBuffer.length,
      });

      // Send email if requested
      if (reportData.output.email) {
        await this.sendReportEmail(outputPath, reportData);
      }

      return {
        outputPath,
        size: reportBuffer.length,
        format: reportData.format,
        reportType: reportData.reportType,
        emailSent: !!reportData.output.email,
      };
    } catch (error) {
      this.logger.error('Report generation failed', {
        jobId: job.id,
        error: (error as Error).message,
        reportType: reportData.reportType,
      });

      throw new Error(`Report generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Register a report generator
   */
  registerGenerator(reportType: string, generator: ReportGenerator): void {
    this.generators.set(reportType, generator);
    this.logger.info(`Registered report generator for type: ${reportType}`);
  }

  /**
   * Register a report template
   */
  registerTemplate(name: string, template: ReportTemplate): void {
    this.templates.set(name, template);
    this.logger.info(`Registered report template: ${name}`);
  }

  /**
   * Register default generators
   */
  private registerDefaultGenerators(): void {
    // User Activity Report Generator
    this.registerGenerator('user-activity', {
      generate: async (data, logger) => {
        logger.info('Generating user activity report');
        const reportData = await this.generateUserActivityReport(data);
        return this.formatReport(reportData, data.format);
      },
      getSupportedFormats: () => ['json', 'csv', 'html'],
    });

    // System Metrics Report Generator
    this.registerGenerator('system-metrics', {
      generate: async (data, logger) => {
        logger.info('Generating system metrics report');
        const reportData = await this.generateSystemMetricsReport(data);
        return this.formatReport(reportData, data.format);
      },
      getSupportedFormats: () => ['json', 'csv', 'html', 'pdf'],
    });

    // Financial Report Generator
    this.registerGenerator('financial', {
      generate: async (data, logger) => {
        logger.info('Generating financial report');
        const reportData = await this.generateFinancialReport(data);
        return this.formatReport(reportData, data.format);
      },
      getSupportedFormats: () => ['excel', 'pdf', 'csv'],
    });

    // Custom Report Generator
    this.registerGenerator('custom', {
      generate: async (data, logger) => {
        logger.info('Generating custom report');
        const reportData = await this.generateCustomReport(data);
        return this.formatReport(reportData, data.format);
      },
      getSupportedFormats: () => ['json', 'csv', 'html', 'pdf', 'excel'],
    });
  }

  /**
   * Generate user activity report
   */
  private async generateUserActivityReport(data: ReportGenerationJobData): Promise<any> {
    // Mock data - in real implementation, this would query a database
    const activities = [
      { userId: 'user1', action: 'login', timestamp: new Date(), ip: '192.168.1.1' },
      { userId: 'user2', action: 'logout', timestamp: new Date(), ip: '192.168.1.2' },
      // ... more activities
    ];

    // Apply filters
    let filteredActivities = activities;
    if (data.filters?.dateRange) {
      filteredActivities = activities.filter(
        (activity) =>
          activity.timestamp >= data.filters!.dateRange!.start &&
          activity.timestamp <= data.filters!.dateRange!.end
      );
    }

    if (data.filters?.userIds) {
      filteredActivities = filteredActivities.filter((activity) =>
        data.filters!.userIds!.includes(activity.userId)
      );
    }

    return {
      title: 'User Activity Report',
      generatedAt: new Date(),
      dateRange: data.filters?.dateRange,
      totalActivities: filteredActivities.length,
      activities: filteredActivities,
      summary: {
        uniqueUsers: new Set(filteredActivities.map((a) => a.userId)).size,
        actionsByType: this.groupBy(filteredActivities, 'action'),
      },
    };
  }

  /**
   * Generate system metrics report
   */
  private async generateSystemMetricsReport(_data: ReportGenerationJobData): Promise<any> {
    // Mock system metrics - in real implementation, this would collect from monitoring systems
    const metrics = {
      cpu: { usage: 45.2, cores: 8 },
      memory: { used: 8192, total: 16384, percentage: 50.0 },
      disk: { used: 256, total: 512, percentage: 50.0 },
      network: { bytesIn: 1024000, bytesOut: 2048000 },
      uptime: 86400, // seconds
      timestamp: new Date(),
    };

    return {
      title: 'System Metrics Report',
      generatedAt: new Date(),
      metrics,
      alerts: [], // Any system alerts
      recommendations: [], // System optimization recommendations
    };
  }

  /**
   * Generate financial report
   */
  private async generateFinancialReport(data: ReportGenerationJobData): Promise<any> {
    // Mock financial data - in real implementation, this would query financial databases
    const transactions = [
      { id: 'txn1', amount: 100.5, type: 'credit', date: new Date(), category: 'sales' },
      { id: 'txn2', amount: -50.25, type: 'debit', date: new Date(), category: 'expenses' },
      // ... more transactions
    ];

    const totalRevenue = transactions
      .filter((t) => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = Math.abs(
      transactions.filter((t) => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0)
    );

    return {
      title: 'Financial Report',
      generatedAt: new Date(),
      period: data.filters?.dateRange,
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        transactionCount: transactions.length,
      },
      transactions,
      categories: this.groupBy(transactions, 'category'),
    };
  }

  /**
   * Generate custom report
   */
  private async generateCustomReport(data: ReportGenerationJobData): Promise<any> {
    // Custom report based on parameters
    const { parameters } = data;

    return {
      title: parameters.title || 'Custom Report',
      generatedAt: new Date(),
      parameters,
      data: parameters.data || [],
      customFields: parameters.fields || {},
    };
  }

  /**
   * Format report data into the requested format
   */
  private async formatReport(data: any, format: string): Promise<Buffer> {
    switch (format) {
      case 'json':
        return Buffer.from(JSON.stringify(data, null, 2));

      case 'csv':
        return this.convertToCSV(data);

      case 'html':
        return this.convertToHTML(data);

      case 'pdf':
        return this.convertToPDF(data);

      case 'excel':
        return this.convertToExcel(data);

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any): Buffer {
    // Simple CSV conversion - in real implementation, use a proper CSV library
    if (Array.isArray(data)) {
      const headers = Object.keys(data[0] || {});
      const rows = data.map((item) => headers.map((header) => item[header]).join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      return Buffer.from(csv);
    }

    // For non-array data, convert to single-row CSV
    const headers = Object.keys(data);
    const values = headers.map((header) => data[header]);
    const csv = [headers.join(','), values.join(',')].join('\n');
    return Buffer.from(csv);
  }

  /**
   * Convert data to HTML format
   */
  private convertToHTML(data: any): Buffer {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${data.title || 'Report'}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .summary { background-color: #e7f3ff; padding: 10px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>${data.title || 'Report'}</h1>
        <p>Generated at: ${data.generatedAt}</p>
        ${data.summary ? `<div class="summary"><pre>${JSON.stringify(data.summary, null, 2)}</pre></div>` : ''}
        ${Array.isArray(data) ? this.arrayToHTMLTable(data) : this.objectToHTML(data)}
      </body>
      </html>
    `;
    return Buffer.from(html);
  }

  /**
   * Convert data to PDF format (placeholder)
   */
  private convertToPDF(data: any): Buffer {
    // In real implementation, use a PDF library like puppeteer or pdfkit
    const pdfContent = `PDF Report: ${data.title}\nGenerated: ${data.generatedAt}\n\n${JSON.stringify(data, null, 2)}`;
    return Buffer.from(pdfContent);
  }

  /**
   * Convert data to Excel format (placeholder)
   */
  private convertToExcel(data: any): Buffer {
    // In real implementation, use a library like exceljs
    const excelContent = `Excel Report: ${data.title}\n${JSON.stringify(data, null, 2)}`;
    return Buffer.from(excelContent);
  }

  /**
   * Convert array to HTML table
   */
  private arrayToHTMLTable(data: any[]): string {
    if (data.length === 0) return '<p>No data available</p>';

    const headers = Object.keys(data[0]);
    const rows = data
      .map((item) => `<tr>${headers.map((header) => `<td>${item[header]}</td>`).join('')}</tr>`)
      .join('');

    return `
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  /**
   * Convert object to HTML
   */
  private objectToHTML(data: any): string {
    const entries = Object.entries(data)
      .map(([key, value]) => `<dt>${key}</dt><dd>${JSON.stringify(value)}</dd>`)
      .join('');

    return `<dl>${entries}</dl>`;
  }

  /**
   * Save report to file
   */
  private async saveReport(buffer: Buffer, data: ReportGenerationJobData): Promise<string> {
    const outputPath = data.output.path || path.join(this.outputDir, data.output.filename);
    const dir = path.dirname(outputPath);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, buffer);
    return outputPath;
  }

  /**
   * Send report via email (placeholder - would integrate with EmailJob)
   */
  private async sendReportEmail(outputPath: string, data: ReportGenerationJobData): Promise<void> {
    // In real implementation, this would create an EmailJob with the report as attachment
    this.logger.info('Report email sending not implemented yet', {
      outputPath,
      email: data.output.email,
    });
  }

  /**
   * Utility function to group array by key
   */
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce(
      (groups, item) => {
        const groupKey = String(item[key]);
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(item);
        return groups;
      },
      {} as Record<string, T[]>
    );
  }

  /**
   * Create a job data object for report generation
   */
  static createJobData(data: ReportGenerationJobData): ReportGenerationJobData {
    return ReportGenerationJobDataSchema.parse(data);
  }

  /**
   * Helper method to create a user activity report job
   */
  static createUserActivityReport(
    outputFilename: string,
    dateRange?: { start: Date; end: Date },
    options?: {
      path?: string;
      email?: { to: string | string[]; subject?: string; template?: string };
      userIds?: string[];
    }
  ): ReportGenerationJobData {
    return ReportGenerationJobDataSchema.parse({
      reportType: 'user-activity',
      parameters: {},
      format: 'html',
      filters: {
        dateRange,
        userIds: options?.userIds,
      },
      output: {
        filename: outputFilename,
        path: options?.path,
        email: options?.email,
      },
    });
  }

  /**
   * Helper method to create a system metrics report job
   */
  static createSystemMetricsReport(
    outputFilename: string,
    options?: {
      path?: string;
      email?: { to: string | string[]; subject?: string; template?: string };
      format?: 'json' | 'csv' | 'html' | 'pdf';
    }
  ): ReportGenerationJobData {
    return ReportGenerationJobDataSchema.parse({
      reportType: 'system-metrics',
      parameters: {},
      format: options?.format || 'html',
      output: {
        filename: outputFilename,
        path: options?.path,
        email: options?.email,
      },
    });
  }
}
