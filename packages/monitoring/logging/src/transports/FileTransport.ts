import DailyRotateFile from 'winston-daily-rotate-file';
import { z } from 'zod';
import { format } from 'winston';

/**
 * File transport configuration schema
 */
const FileTransportConfigSchema = z.object({
  level: z.string().default('info'),
  serviceName: z.string(),
  directory: z.string().default('./logs'),
  filename: z.string().default('application-%DATE%.log'),
  datePattern: z.string().default('YYYY-MM-DD'),
  maxSize: z.string().default('20m'),
  maxFiles: z.string().default('14d'),
  compress: z.boolean().default(true),
  json: z.boolean().default(true),
});

export type FileTransportConfig = z.infer<typeof FileTransportConfigSchema>;

/**
 * File transport with daily rotation for Winston
 */
export class FileTransport {
  private transport: DailyRotateFile;
  private config: FileTransportConfig;

  constructor(config: FileTransportConfig) {
    this.config = FileTransportConfigSchema.parse(config);

    this.transport = new DailyRotateFile({
      level: this.config.level,
      dirname: this.config.directory,
      filename: this.config.filename,
      datePattern: this.config.datePattern,
      maxSize: this.config.maxSize,
      maxFiles: this.config.maxFiles,
      zippedArchive: this.config.compress,
      format: this.config.json
        ? format.combine(
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
            format.json()
          )
        : format.combine(
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
            format.printf((info) => {
              const { timestamp, level, message, ...meta } = info;
              return `${timestamp} [${level.toUpperCase()}] ${message} ${
                Object.keys(meta).length ? JSON.stringify(meta) : ''
              }`;
            })
          ),
    });

    // Event listeners for rotation
    this.transport.on('rotate', (oldFilename, newFilename) => {
      console.log(`Log file rotated: ${oldFilename} -> ${newFilename}`);
    });

    this.transport.on('error', (error) => {
      console.error('File transport error:', error);
    });
  }

  /**
   * Get the Winston transport instance
   */
  public getTransport(): DailyRotateFile {
    return this.transport;
  }

  /**
   * Get current log file path
   */
  public getCurrentLogFile(): string {
    return `${this.config.directory}/${this.config.filename}`;
  }

  /**
   * Get log directory
   */
  public getLogDirectory(): string {
    return this.config.directory;
  }

  /**
   * Close the transport
   */
  public close(): void {
    this.transport.close();
  }
}
