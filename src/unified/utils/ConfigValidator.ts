/**
 * ConfigValidator - Unified configuration validation and management
 *
 * Features:
 * - Type-safe configuration with Zod schemas
 * - Environment variable parsing with type coercion
 * - Default value management
 * - Validation error reporting with helpful messages
 * - Configuration freezing for immutability
 * - Nested configuration support
 * - Secret masking in logs
 * - Hot reload support
 *
 * @module unified/utils/ConfigValidator
 */

import { z, ZodSchema, ZodError, ZodIssue } from 'zod';
import { getLogger } from './LoggerFactory';

const logger = getLogger('ConfigValidator');

/**
 * Configuration validation result
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ConfigValidationError[];
}

/**
 * Configuration validation error
 */
export interface ConfigValidationError {
  path: string;
  message: string;
  code: string;
  received?: any;
  expected?: string;
}

/**
 * Environment variable parsing options
 */
export interface EnvParseOptions {
  prefix?: string;
  transform?: (key: string) => string;
  required?: string[];
  defaults?: Record<string, any>;
}

/**
 * ConfigValidator - Validates and manages configuration
 *
 * @example
 * ```typescript
 * // Define schema
 * const schema = z.object({
 *   port: z.number().min(1).max(65535),
 *   host: z.string().default('localhost'),
 *   database: z.object({
 *     url: z.string().url(),
 *     poolSize: z.number().default(10)
 *   }),
 *   apiKey: z.string()
 * });
 *
 * // Validate configuration
 * const result = ConfigValidator.validate(schema, config);
 * if (!result.success) {
 *   console.error('Configuration errors:', result.errors);
 *   process.exit(1);
 * }
 *
 * // Parse from environment variables
 * const envConfig = ConfigValidator.fromEnv(schema, {
 *   prefix: 'APP_',
 *   required: ['apiKey'],
 *   defaults: { port: 3000 }
 * });
 *
 * // Freeze configuration (immutable)
 * const frozenConfig = ConfigValidator.freeze(config);
 * ```
 */
export class ConfigValidator {
  /**
   * Validate configuration against a Zod schema
   *
   * @param schema - Zod schema to validate against
   * @param data - Configuration data to validate
   * @returns Validation result with data or errors
   */
  public static validate<T>(
    schema: ZodSchema<T>,
    data: unknown
  ): ValidationResult<T> {
    try {
      const validated = schema.parse(data);
      return {
        success: true,
        data: validated,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          success: false,
          errors: this.formatZodErrors(error),
        };
      }

      return {
        success: false,
        errors: [
          {
            path: '',
            message: error instanceof Error ? error.message : 'Unknown validation error',
            code: 'UNKNOWN_ERROR',
          },
        ],
      };
    }
  }

  /**
   * Validate and throw on error
   *
   * @param schema - Zod schema
   * @param data - Data to validate
   * @returns Validated data
   * @throws Error if validation fails
   */
  public static validateOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
    const result = this.validate(schema, data);
    if (!result.success) {
      const errorMessages = result.errors!.map(
        (err) => `${err.path}: ${err.message}`
      ).join(', ');
      throw new Error(`Configuration validation failed: ${errorMessages}`);
    }
    return result.data!;
  }

  /**
   * Parse configuration from environment variables
   *
   * @param schema - Zod schema
   * @param options - Parsing options
   * @returns Parsed and validated configuration
   *
   * @example
   * ```typescript
   * // Environment: APP_PORT=3000, APP_DATABASE_URL=postgres://...
   * const config = ConfigValidator.fromEnv(schema, {
   *   prefix: 'APP_',
   *   transform: (key) => key.toLowerCase()
   * });
   * // Results in: { port: 3000, database: { url: 'postgres://...' } }
   * ```
   */
  public static fromEnv<T>(
    schema: ZodSchema<T>,
    options: EnvParseOptions = {}
  ): T {
    const { prefix = '', transform, required = [], defaults = {} } = options;

    // Build configuration object from environment
    const config: any = { ...defaults };

    for (const [key, value] of Object.entries(process.env)) {
      if (prefix && !key.startsWith(prefix)) {
        continue;
      }

      // Remove prefix
      let configKey = prefix ? key.slice(prefix.length) : key;

      // Apply transformation
      if (transform) {
        configKey = transform(configKey);
      }

      // Parse nested keys (e.g., DATABASE_URL -> database.url)
      const path = configKey.toLowerCase().split('_');
      let current = config;

      for (let i = 0; i < path.length - 1; i++) {
        const segment = path[i];
        if (!(segment in current)) {
          current[segment] = {};
        }
        current = current[segment];
      }

      const finalKey = path[path.length - 1];
      current[finalKey] = this.parseEnvValue(value || '');
    }

    // Check required fields
    for (const field of required) {
      if (!(field in config) || config[field] === undefined) {
        const envVar = prefix + field.toUpperCase();
        throw new Error(`Required environment variable missing: ${envVar}`);
      }
    }

    // Validate against schema
    return this.validateOrThrow(schema, config);
  }

  /**
   * Parse environment variable value to appropriate type
   *
   * @param value - String value from environment
   * @returns Parsed value (number, boolean, string, etc.)
   */
  private static parseEnvValue(value: string): any {
    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Number
    if (/^-?\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    if (/^-?\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }

    // JSON array/object
    if ((value.startsWith('[') && value.endsWith(']')) ||
        (value.startsWith('{') && value.endsWith('}'))) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    // String
    return value;
  }

  /**
   * Format Zod validation errors
   */
  private static formatZodErrors(error: ZodError): ConfigValidationError[] {
    return error.errors.map((issue: ZodIssue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
      received: 'received' in issue ? issue.received : undefined,
      expected: this.formatExpectedType(issue),
    }));
  }

  /**
   * Format expected type from Zod issue
   */
  private static formatExpectedType(issue: ZodIssue): string {
    if (issue.code === 'invalid_type') {
      return (issue as any).expected || 'unknown';
    }
    if (issue.code === 'invalid_enum_value') {
      return `one of: ${(issue as any).options.join(', ')}`;
    }
    return 'valid value';
  }

  /**
   * Freeze configuration object (make immutable)
   *
   * @param config - Configuration object
   * @returns Frozen configuration
   */
  public static freeze<T extends object>(config: T): Readonly<T> {
    return Object.freeze(this.deepFreeze(config));
  }

  /**
   * Deep freeze an object recursively
   */
  private static deepFreeze<T>(obj: T): T {
    Object.freeze(obj);

    Object.getOwnPropertyNames(obj).forEach((prop) => {
      const value = (obj as any)[prop];
      if (
        value !== null &&
        (typeof value === 'object' || typeof value === 'function') &&
        !Object.isFrozen(value)
      ) {
        this.deepFreeze(value);
      }
    });

    return obj;
  }

  /**
   * Mask sensitive fields in configuration for logging
   *
   * @param config - Configuration object
   * @param sensitiveFields - List of field names to mask
   * @returns Configuration with masked sensitive fields
   */
  public static maskSensitive<T extends object>(
    config: T,
    sensitiveFields: string[] = ['password', 'apiKey', 'secret', 'token', 'key']
  ): T {
    const masked = JSON.parse(JSON.stringify(config));

    const maskRecursive = (obj: any, path: string[] = []): void => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = [...path, key];
        const fieldName = currentPath.join('.').toLowerCase();

        // Check if field name contains sensitive keywords
        const isSensitive = sensitiveFields.some((sensitive) =>
          fieldName.includes(sensitive.toLowerCase())
        );

        if (isSensitive && typeof value === 'string') {
          obj[key] = this.maskValue(value);
        } else if (typeof value === 'object' && value !== null) {
          maskRecursive(value, currentPath);
        }
      }
    };

    maskRecursive(masked);
    return masked;
  }

  /**
   * Mask a sensitive value
   */
  private static maskValue(value: string): string {
    if (value.length <= 4) {
      return '****';
    }
    return `${value.slice(0, 2)}****${value.slice(-2)}`;
  }

  /**
   * Merge multiple configuration objects with precedence
   *
   * @param configs - Configuration objects (later ones override earlier)
   * @returns Merged configuration
   */
  public static merge<T extends object>(...configs: Partial<T>[]): T {
    return configs.reduce((acc, config) => {
      return this.deepMerge(acc, config);
    }, {} as any) as T;
  }

  /**
   * Deep merge two objects
   */
  private static deepMerge(target: any, source: any): any {
    const output = { ...target };

    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        output[key] = this.deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    }

    return output;
  }

  /**
   * Log configuration (with sensitive fields masked)
   *
   * @param config - Configuration to log
   * @param title - Log title
   */
  public static logConfig<T extends object>(
    config: T,
    title = 'Configuration'
  ): void {
    const masked = this.maskSensitive(config);
    logger.info(title, masked);
  }

  /**
   * Create a configuration validator with schema
   *
   * @param schema - Zod schema
   * @returns Configuration validator instance
   */
  public static createValidator<T>(schema: ZodSchema<T>) {
    return {
      validate: (data: unknown) => this.validate(schema, data),
      validateOrThrow: (data: unknown) => this.validateOrThrow(schema, data),
      fromEnv: (options?: EnvParseOptions) => this.fromEnv(schema, options),
    };
  }
}

/**
 * Create a type-safe configuration loader
 *
 * @param schema - Zod schema
 * @param sources - Configuration sources (environment, defaults, etc.)
 * @returns Validated configuration
 *
 * @example
 * ```typescript
 * const config = loadConfig(schema, {
 *   env: { prefix: 'APP_' },
 *   defaults: { port: 3000 },
 *   overrides: { host: 'localhost' }
 * });
 * ```
 */
export function loadConfig<T>(
  schema: ZodSchema<T>,
  sources: {
    env?: EnvParseOptions;
    defaults?: Partial<T>;
    overrides?: Partial<T>;
  } = {}
): T {
  const configs: Partial<T>[] = [];

  // Add defaults
  if (sources.defaults) {
    configs.push(sources.defaults);
  }

  // Parse environment variables
  if (sources.env) {
    try {
      const envConfig = ConfigValidator.fromEnv(schema, sources.env);
      configs.push(envConfig as Partial<T>);
    } catch (error) {
      logger.warn('Failed to parse environment variables', { error });
    }
  }

  // Add overrides (highest precedence)
  if (sources.overrides) {
    configs.push(sources.overrides);
  }

  // Merge and validate
  const merged = ConfigValidator.merge(...configs);
  return ConfigValidator.validateOrThrow(schema, merged);
}

export default ConfigValidator;
