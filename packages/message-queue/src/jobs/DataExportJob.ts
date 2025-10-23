import * as fs from 'fs';
import * as path from 'path';
import { Logger } from 'winston';
import { z } from 'zod';
import { QueueJob } from '../types';

// Data export job data schema
export const DataExportJobDataSchema = z.object({
  source: z.object({
    type: z.enum(['database', 'api', 'file', 'memory']),
    connection: z.object({
      host: z.string().optional(),
      port: z.number().optional(),
      database: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      table: z.string().optional(),
      query: z.string().optional(),
      url: z.string().optional(),
      headers: z.record(z.string()).optional()
    }),
    filters: z.object({
      where: z.record(z.any()).optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
      orderBy: z.array(z.object({
        column: z.string(),
        direction: z.enum(['asc', 'desc'])
      })).optional()
    }).optional()
  }),
  format: z.enum(['csv', 'json', 'sql', 'xml', 'parquet', 'excel']),
  output: z.object({
    filename: z.string(),
    path: z.string().optional(),
    compression: z.enum(['none', 'gzip', 'zip']).optional(),
    email: z.object({
      to: z.union([z.string(), z.array(z.string())]),
      subject: z.string().optional(),
      template: z.string().optional()
    }).optional()
  }),
  options: z.object({
    includeHeaders: z.boolean().optional(),
    delimiter: z.string().optional(),
    encoding: z.string().optional(),
    batchSize: z.number().optional(),
    timeout: z.number().optional()
  }).optional()
});

export type DataExportJobData = z.infer<typeof DataExportJobDataSchema>;

// Data source interface
export interface DataSource {
  connect(): Promise<void>;
  query(query: string, params?: any[]): Promise<any[]>;
  getTableSchema(table: string): Promise<any>;
  disconnect(): Promise<void>;
}

// Export format interface
export interface ExportFormat {
  format: string;
  extension: string;
  mimeType: string;
  export(data: any[], options?: any): Promise<Buffer>;
}

/**
 * Data Export Job Implementation
 *
 * Handles exporting data from various sources (databases, APIs, files)
 * to different formats (CSV, JSON, SQL dumps, etc.).
 */
export class DataExportJob {
  private sources: Map<string, DataSource> = new Map();
  private formats: Map<string, ExportFormat> = new Map();
  private logger: Logger;
  private outputDir: string;

  constructor(logger: Logger, outputDir: string = './exports') {
    this.logger = logger;
    this.outputDir = outputDir;

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Register default formats
    this.registerDefaultFormats();
  }

  /**
   * Execute the data export job
   */
  async execute(job: QueueJob): Promise<any> {
    const exportData = DataExportJobDataSchema.parse(job.data);

    try {
      this.logger.info('Starting data export', {
        jobId: job.id,
        sourceType: exportData.source.type,
        format: exportData.format,
        filename: exportData.output.filename
      });

      // Get data from source
      const data = await this.fetchData(exportData);

      // Get the export format handler
      const formatHandler = this.formats.get(exportData.format);
      if (!formatHandler) {
        throw new Error(`Unsupported export format: ${exportData.format}`);
      }

      // Export data to buffer
      const exportBuffer = await formatHandler.export(data, exportData.options);

      // Apply compression if requested
      const finalBuffer = await this.applyCompression(exportBuffer, exportData.output.compression);

      // Save the export to file
      const outputPath = await this.saveExport(finalBuffer, exportData, formatHandler.extension);

      this.logger.info('Data export completed successfully', {
        jobId: job.id,
        outputPath,
        recordCount: data.length,
        size: finalBuffer.length,
        format: exportData.format
      });

      // Send email if requested
      if (exportData.output.email) {
        await this.sendExportEmail(outputPath, exportData);
      }

      return {
        outputPath,
        recordCount: data.length,
        size: finalBuffer.length,
        format: exportData.format,
        compression: exportData.output.compression || 'none',
        emailSent: !!exportData.output.email
      };

    } catch (error) {
      this.logger.error('Data export failed', {
        jobId: job.id,
        error: (error as Error).message,
        sourceType: exportData.source.type,
        format: exportData.format
      });

      throw new Error(`Data export failed: ${(error as Error).message}`);
    }
  }

  /**
   * Fetch data from the specified source
   */
  private async fetchData(exportData: DataExportJobData): Promise<any[]> {
    const { source } = exportData;

    switch (source.type) {
      case 'database':
        return await this.fetchFromDatabase(source);

      case 'api':
        return await this.fetchFromApi(source);

      case 'file':
        return await this.fetchFromFile(source);

      case 'memory':
        return await this.fetchFromMemory(source);

      default:
        throw new Error(`Unsupported data source type: ${source.type}`);
    }
  }

  /**
   * Fetch data from database
   */
  private async fetchFromDatabase(source: any): Promise<any[]> {
    const sourceHandler = this.sources.get('database');
    if (!sourceHandler) {
      throw new Error('Database source handler not registered');
    }

    try {
      await sourceHandler.connect();

      let query = source.connection.query;
      if (!query && source.connection.table) {
        // Build SELECT query from table name and filters
        query = this.buildSelectQuery(source.connection.table, source.filters);
      }

      if (!query) {
        throw new Error('No query or table specified for database export');
      }

      const data = await sourceHandler.query(query);
      return data;

    } finally {
      await sourceHandler.disconnect();
    }
  }

  /**
   * Fetch data from API
   */
  private async fetchFromApi(source: any): Promise<any[]> {
    // In real implementation, use axios or fetch
    const url = source.connection.url;
    if (!url) {
      throw new Error('API URL not specified');
    }

    // Mock implementation - in real code, make HTTP request
    this.logger.info('Fetching data from API', { url });
    return [
      { id: 1, name: 'Sample Data', timestamp: new Date() }
    ];
  }

  /**
   * Fetch data from file
   */
  private async fetchFromFile(source: any): Promise<any[]> {
    // In real implementation, read and parse file based on format
    const filePath = source.connection.url || source.connection.table;
    if (!filePath) {
      throw new Error('File path not specified');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Mock implementation - in real code, parse CSV/JSON/XML etc.
    this.logger.info('Reading data from file', { filePath });
    return [
      { id: 1, name: 'File Data', timestamp: new Date() }
    ];
  }

  /**
   * Fetch data from memory (provided in parameters)
   */
  private async fetchFromMemory(source: any): Promise<any[]> {
    // Data provided directly in the job parameters
    return source.connection.query || [];
  }

  /**
   * Build SELECT query from table and filters
   */
  private buildSelectQuery(table: string, filters?: any): string {
    let query = `SELECT * FROM ${table}`;

    if (filters?.where) {
      const conditions = Object.entries(filters.where)
        .map(([key, value]) => `${key} = '${value}'`)
        .join(' AND ');
      if (conditions) {
        query += ` WHERE ${conditions}`;
      }
    }

    if (filters?.orderBy) {
      const orderClauses = filters.orderBy
        .map((order: any) => `${order.column} ${order.direction.toUpperCase()}`)
        .join(', ');
      query += ` ORDER BY ${orderClauses}`;
    }

    if (filters?.limit) {
      query += ` LIMIT ${filters.limit}`;
      if (filters?.offset) {
        query += ` OFFSET ${filters.offset}`;
      }
    }

    return query;
  }

  /**
   * Register default export formats
   */
  private registerDefaultFormats(): void {
    // CSV Format
    this.registerFormat('csv', {
      format: 'csv',
      extension: 'csv',
      mimeType: 'text/csv',
      export: async (data, options) => {
        return this.exportToCSV(data, options);
      }
    });

    // JSON Format
    this.registerFormat('json', {
      format: 'json',
      extension: 'json',
      mimeType: 'application/json',
      export: async (data, options) => {
        const indent = options?.pretty ? 2 : 0;
        return Buffer.from(JSON.stringify(data, null, indent));
      }
    });

    // SQL Format
    this.registerFormat('sql', {
      format: 'sql',
      extension: 'sql',
      mimeType: 'application/sql',
      export: async (data, options) => {
        return this.exportToSQL(data, options);
      }
    });

    // XML Format
    this.registerFormat('xml', {
      format: 'xml',
      extension: 'xml',
      mimeType: 'application/xml',
      export: async (data, options) => {
        return this.exportToXML(data, options);
      }
    });

    // Parquet Format (placeholder)
    this.registerFormat('parquet', {
      format: 'parquet',
      extension: 'parquet',
      mimeType: 'application/octet-stream',
      export: async (_data) => {
        // In real implementation, use parquetjs or similar
        throw new Error('Parquet export not implemented');
      }
    });

    // Excel Format (placeholder)
    this.registerFormat('excel', {
      format: 'excel',
      extension: 'xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      export: async (_data) => {
        // In real implementation, use exceljs
        throw new Error('Excel export not implemented');
      }
    });
  }

  /**
   * Register a data source
   */
  registerSource(type: string, source: DataSource): void {
    this.sources.set(type, source);
    this.logger.info(`Registered data source for type: ${type}`);
  }

  /**
   * Register an export format
   */
  registerFormat(format: string, handler: ExportFormat): void {
    this.formats.set(format, handler);
    this.logger.info(`Registered export format: ${format}`);
  }

  /**
   * Export data to CSV format
   */
  private exportToCSV(data: any[], options?: any): Buffer {
    if (data.length === 0) {
      return Buffer.from('');
    }

    const delimiter = options?.delimiter || ',';
    const includeHeaders = options?.includeHeaders !== false;
    const encoding = options?.encoding || 'utf8';

    const headers = Object.keys(data[0]);
    let csv = '';

    if (includeHeaders) {
      csv += headers.join(delimiter) + '\n';
    }

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // Escape values containing delimiter, quotes, or newlines
        if (typeof value === 'string' && (value.includes(delimiter) || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csv += values.join(delimiter) + '\n';
    }

    return Buffer.from(csv, encoding);
  }

  /**
   * Export data to SQL format
   */
  private exportToSQL(data: any[], options?: any): Buffer {
    if (data.length === 0) {
      return Buffer.from('-- No data to export');
    }

    const tableName = options?.tableName || 'exported_data';
    let sql = `-- Data export generated at ${new Date().toISOString()}\n\n`;

    for (const row of data) {
      const columns = Object.keys(row);
      const values = columns.map(col => {
        const value = row[col];
        if (value === null) return 'NULL';
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (typeof value === 'boolean') return value ? '1' : '0';
        return String(value);
      });

      sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
    }

    return Buffer.from(sql);
  }

  /**
   * Export data to XML format
   */
  private exportToXML(data: any[], options?: any): Buffer {
    const rootElement = options?.rootElement || 'data';
    const itemElement = options?.itemElement || 'item';

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootElement}>\n`;

    for (const item of data) {
      xml += `  <${itemElement}>\n`;
      for (const [key, value] of Object.entries(item)) {
        const escapedValue = String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
        xml += `    <${key}>${escapedValue}</${key}>\n`;
      }
      xml += `  </${itemElement}>\n`;
    }

    xml += `</${rootElement}>`;
    return Buffer.from(xml);
  }

  /**
   * Apply compression to buffer
   */
  private async applyCompression(buffer: Buffer, compression?: string): Promise<Buffer> {
    if (!compression || compression === 'none') {
      return buffer;
    }

    // In real implementation, use zlib for gzip, archiver for zip
    this.logger.warn(`Compression ${compression} not implemented, returning uncompressed data`);
    return buffer;
  }

  /**
   * Save export to file
   */
  private async saveExport(buffer: Buffer, data: DataExportJobData, extension: string): Promise<string> {
    let filename = data.output.filename;
    if (!filename.includes('.')) {
      filename += `.${extension}`;
    }

    // Add compression extension if needed
    if (data.output.compression && data.output.compression !== 'none') {
      filename += `.${data.output.compression}`;
    }

    const outputPath = data.output.path || path.join(this.outputDir, filename);
    const dir = path.dirname(outputPath);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, buffer);
    return outputPath;
  }

  /**
   * Send export via email (placeholder - would integrate with EmailJob)
   */
  private async sendExportEmail(outputPath: string, data: DataExportJobData): Promise<void> {
    // In real implementation, this would create an EmailJob with the export as attachment
    this.logger.info('Export email sending not implemented yet', {
      outputPath,
      email: data.output.email
    });
  }

  /**
   * Create a job data object for data export
   */
  static createJobData(data: DataExportJobData): DataExportJobData {
    return DataExportJobDataSchema.parse(data);
  }

  /**
   * Helper method to create a database export job
   */
  static createDatabaseExport(
    table: string,
    outputFilename: string,
    options?: {
      format?: 'csv' | 'json' | 'sql' | 'xml';
      path?: string;
      compression?: 'none' | 'gzip' | 'zip';
      email?: { to: string | string[]; subject?: string; template?: string };
      filters?: {
        where?: Record<string, any>;
        limit?: number;
        offset?: number;
        orderBy?: Array<{ column: string; direction: 'asc' | 'desc' }>;
      };
      connection?: {
        host?: string;
        port?: number;
        database?: string;
        username?: string;
        password?: string;
      };
    }
  ): DataExportJobData {
    return DataExportJobDataSchema.parse({
      source: {
        type: 'database',
        connection: {
          table,
          ...options?.connection
        },
        filters: options?.filters
      },
      format: options?.format || 'csv',
      output: {
        filename: outputFilename,
        path: options?.path,
        compression: options?.compression || 'none',
        email: options?.email
      },
      options: {
        includeHeaders: true,
        delimiter: ',',
        encoding: 'utf8'
      }
    });
  }

  /**
   * Helper method to create an API export job
   */
  static createApiExport(
    url: string,
    outputFilename: string,
    options?: {
      format?: 'csv' | 'json' | 'xml';
      headers?: Record<string, string>;
      path?: string;
      email?: { to: string | string[]; subject?: string; template?: string };
    }
  ): DataExportJobData {
    return DataExportJobDataSchema.parse({
      source: {
        type: 'api',
        connection: {
          url,
          headers: options?.headers
        }
      },
      format: options?.format || 'json',
      output: {
        filename: outputFilename,
        path: options?.path,
        email: options?.email
      }
    });
  }
}
