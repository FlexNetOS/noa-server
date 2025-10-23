import { transports, format } from 'winston';
import { z } from 'zod';

/**
 * Console transport configuration schema
 */
const ConsoleTransportConfigSchema = z.object({
  level: z.string().default('info'),
  serviceName: z.string(),
  environment: z.string().default('development'),
  colorize: z.boolean().default(true),
  json: z.boolean().default(false),
  prettyPrint: z.boolean().default(true),
});

export type ConsoleTransportConfig = z.infer<typeof ConsoleTransportConfigSchema>;

/**
 * Console transport for Winston with pretty printing
 */
export class ConsoleTransport {
  private transport: transports.ConsoleTransportInstance;
  private config: ConsoleTransportConfig;

  constructor(config: ConsoleTransportConfig) {
    this.config = ConsoleTransportConfigSchema.parse(config);

    const formatters = [
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      format.errors({ stack: true }),
    ];

    if (this.config.colorize) {
      formatters.push(format.colorize({ all: true }));
    }

    if (this.config.json) {
      formatters.push(format.json());
    } else if (this.config.prettyPrint) {
      formatters.push(
        format.printf((info) => {
          const { timestamp, level, message, service, environment, ...meta } = info;

          // Build the log message
          let logMessage = `${timestamp} [${level}] [${service || this.config.serviceName}]`;

          if (environment || this.config.environment) {
            logMessage += ` [${environment || this.config.environment}]`;
          }

          logMessage += ` ${message}`;

          // Add metadata if present
          const metaKeys = Object.keys(meta);
          if (metaKeys.length > 0) {
            // Remove internal Winston properties
            const filteredMeta = { ...meta };
            delete filteredMeta[Symbol.for('level')];
            delete filteredMeta[Symbol.for('message')];
            delete filteredMeta[Symbol.for('splat')];

            const filteredKeys = Object.keys(filteredMeta);
            if (filteredKeys.length > 0) {
              logMessage += `\n  ${JSON.stringify(filteredMeta, null, 2)
                .split('\n')
                .join('\n  ')}`;
            }
          }

          return logMessage;
        })
      );
    } else {
      formatters.push(format.simple());
    }

    this.transport = new transports.Console({
      level: this.config.level,
      format: format.combine(...formatters),
    });
  }

  /**
   * Get the Winston transport instance
   */
  public getTransport(): transports.ConsoleTransportInstance {
    return this.transport;
  }

  /**
   * Enable colorization
   */
  public enableColors(): void {
    this.config.colorize = true;
  }

  /**
   * Disable colorization
   */
  public disableColors(): void {
    this.config.colorize = false;
  }

  /**
   * Enable JSON output
   */
  public enableJson(): void {
    this.config.json = true;
  }

  /**
   * Disable JSON output
   */
  public disableJson(): void {
    this.config.json = false;
  }
}
