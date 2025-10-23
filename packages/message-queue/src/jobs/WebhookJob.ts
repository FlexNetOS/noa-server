import * as crypto from 'crypto';
import { Logger } from 'winston';
import { z } from 'zod';
import { QueueJob } from '../types';

// Webhook job data schema
export const WebhookJobDataSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  headers: z.record(z.string()).optional(),
  body: z.any().optional(),
  timeout: z.number().optional(),
  retries: z.object({
    maxAttempts: z.number().optional(),
    backoffMs: z.number().optional(),
    backoffMultiplier: z.number().optional()
  }).optional(),
  auth: z.object({
    type: z.enum(['none', 'basic', 'bearer', 'api-key', 'signature']),
    credentials: z.record(z.string()).optional()
  }).optional(),
  signature: z.object({
    algorithm: z.enum(['sha256', 'sha512', 'md5']).optional(),
    secret: z.string().optional(),
    header: z.string().optional()
  }).optional(),
  validation: z.object({
    expectedStatusCodes: z.array(z.number()).optional(),
    expectedResponseSchema: z.any().optional(),
    customValidator: z.string().optional() // Function name or code
  }).optional(),
  metadata: z.record(z.any()).optional()
});

export type WebhookJobData = z.infer<typeof WebhookJobDataSchema>;

// HTTP client interface
export interface HttpClient {
  request(options: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
  }): Promise<{
    statusCode: number;
    headers: Record<string, string>;
    body: any;
  }>;
}

// Webhook response
export interface WebhookResponse {
  success: boolean;
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  attempts: number;
  duration: number;
  error?: string;
}

/**
 * Webhook Job Implementation
 *
 * Handles making HTTP requests to webhooks with retry logic,
 * authentication, signature validation, and response validation.
 */
export class WebhookJob {
  private httpClient: HttpClient;
  private logger: Logger;
  private validators: Map<string, (response: WebhookResponse) => boolean> = new Map();

  constructor(httpClient: HttpClient, logger: Logger) {
    this.httpClient = httpClient;
    this.logger = logger;

    // Register default validators
    this.registerDefaultValidators();
  }

  /**
   * Execute the webhook job
   */
  async execute(job: QueueJob): Promise<WebhookResponse> {
    const webhookData = WebhookJobDataSchema.parse(job.data);

    const startTime = Date.now();
    let lastError: Error | null = null;
    let attempts = 0;
    const maxAttempts = webhookData.retries?.maxAttempts || 3;
    let backoffMs = webhookData.retries?.backoffMs || 1000;
    const backoffMultiplier = webhookData.retries?.backoffMultiplier || 2;

    this.logger.info('Starting webhook execution', {
      jobId: job.id,
      url: webhookData.url,
      method: webhookData.method || 'POST',
      maxAttempts
    });

    while (attempts < maxAttempts) {
      attempts++;

      try {
        this.logger.debug('Making webhook request', {
          jobId: job.id,
          attempt: attempts,
          url: webhookData.url
        });

        // Prepare request options
        const requestOptions = await this.prepareRequestOptions(webhookData);

        // Make the HTTP request
        const response = await this.httpClient.request(requestOptions);

        const webhookResponse: WebhookResponse = {
          success: true,
          statusCode: response.statusCode,
          headers: response.headers,
          body: response.body,
          attempts,
          duration: Date.now() - startTime
        };

        // Validate response if validation rules are specified
        if (webhookData.validation) {
          const isValid = await this.validateResponse(webhookResponse, webhookData.validation);
          if (!isValid) {
            throw new Error('Response validation failed');
          }
        }

        this.logger.info('Webhook executed successfully', {
          jobId: job.id,
          statusCode: response.statusCode,
          attempts,
          duration: webhookResponse.duration
        });

        return webhookResponse;

      } catch (error) {
        lastError = error as Error;

        this.logger.warn('Webhook request failed', {
          jobId: job.id,
          attempt: attempts,
          error: lastError.message,
          url: webhookData.url
        });

        // If this is not the last attempt, wait before retrying
        if (attempts < maxAttempts) {
          await this.delay(backoffMs);
          backoffMs *= backoffMultiplier;
        }
      }
    }

    // All attempts failed
    const finalResponse: WebhookResponse = {
      success: false,
      statusCode: 0,
      headers: {},
      body: null,
      attempts,
      duration: Date.now() - startTime,
      error: lastError?.message || 'All retry attempts failed'
    };

    this.logger.error('Webhook execution failed after all retries', {
      jobId: job.id,
      attempts,
      finalError: finalResponse.error,
      url: webhookData.url
    });

    return finalResponse;
  }

  /**
   * Prepare request options from webhook data
   */
  private async prepareRequestOptions(webhookData: WebhookJobData): Promise<{
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
  }> {
    const method = webhookData.method || 'POST';
    let headers = { ...webhookData.headers };
    let body = webhookData.body;

    // Add authentication
    if (webhookData.auth && webhookData.auth.type !== 'none') {
      headers = await this.addAuthentication(headers, webhookData.auth);
    }

    // Add signature if configured
    if (webhookData.signature) {
      headers = await this.addSignature(headers, body, webhookData.signature);
    }

    // Set content type for body
    if (body && !headers['Content-Type']) {
      if (typeof body === 'object') {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
      } else {
        headers['Content-Type'] = 'text/plain';
      }
    }

    return {
      url: webhookData.url,
      method,
      headers,
      body,
      timeout: webhookData.timeout || 30000 // 30 seconds default
    };
  }

  /**
   * Add authentication headers
   */
  private async addAuthentication(
    headers: Record<string, string>,
    auth: NonNullable<WebhookJobData['auth']>
  ): Promise<Record<string, string>> {
    const { type, credentials = {} } = auth;

    switch (type) {
      case 'basic':
        const username = credentials.username || '';
        const password = credentials.password || '';
        const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
        headers['Authorization'] = `Basic ${basicAuth}`;
        break;

      case 'bearer':
        const token = credentials.token || '';
        headers['Authorization'] = `Bearer ${token}`;
        break;

      case 'api-key':
        const apiKey = credentials.key || '';
        const headerName = credentials.header || 'X-API-Key';
        headers[headerName] = apiKey;
        break;

      case 'signature':
        // Signature is handled separately
        break;

      default:
        this.logger.warn('Unknown auth type, skipping authentication', { type });
    }

    return headers;
  }

  /**
   * Add signature to headers
   */
  private async addSignature(
    headers: Record<string, string>,
    body: any,
    signature: NonNullable<WebhookJobData['signature']>
  ): Promise<Record<string, string>> {
    const algorithm = signature.algorithm || 'sha256';
    const secret = signature.secret || '';
    const header = signature.header || 'X-Signature';

    let payload = '';
    if (typeof body === 'string') {
      payload = body;
    } else if (body) {
      payload = JSON.stringify(body);
    }

    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(payload);
    const signatureValue = hmac.digest('hex');

    headers[header] = signatureValue;
    return headers;
  }

  /**
   * Validate webhook response
   */
  private async validateResponse(
    response: WebhookResponse,
    validation: NonNullable<WebhookJobData['validation']>
  ): Promise<boolean> {
    // Check status code
    if (validation.expectedStatusCodes) {
      if (!validation.expectedStatusCodes.includes(response.statusCode)) {
        this.logger.warn('Response status code validation failed', {
          statusCode: response.statusCode,
          expected: validation.expectedStatusCodes
        });
        return false;
      }
    }

    // Check response schema
    if (validation.expectedResponseSchema) {
      try {
        // In real implementation, use a JSON schema validator
        // For now, just check if response body exists
        if (!response.body) {
          return false;
        }
      } catch (error) {
        this.logger.warn('Response schema validation failed', { error: (error as Error).message });
        return false;
      }
    }

    // Custom validator
    if (validation.customValidator) {
      const validator = this.validators.get(validation.customValidator);
      if (validator) {
        return validator(response);
      } else {
        this.logger.warn('Custom validator not found', { validator: validation.customValidator });
        return false;
      }
    }

    return true;
  }

  /**
   * Register a custom validator
   */
  registerValidator(name: string, validator: (response: WebhookResponse) => boolean): void {
    this.validators.set(name, validator);
    this.logger.info(`Registered webhook validator: ${name}`);
  }

  /**
   * Register default validators
   */
  private registerDefaultValidators(): void {
    // Success status validator
    this.registerValidator('success-status', (response) => {
      return response.statusCode >= 200 && response.statusCode < 300;
    });

    // JSON response validator
    this.registerValidator('json-response', (response) => {
      try {
        if (typeof response.body === 'string') {
          JSON.parse(response.body);
        } else if (typeof response.body === 'object') {
          return true;
        }
        return false;
      } catch {
        return false;
      }
    });
  }

  /**
   * Utility method for delaying execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a job data object for webhook execution
   */
  static createJobData(data: WebhookJobData): WebhookJobData {
    return WebhookJobDataSchema.parse(data);
  }

  /**
   * Helper method to create a simple POST webhook job
   */
  static createPostWebhook(
    url: string,
    body: any,
    options?: {
      headers?: Record<string, string>;
      timeout?: number;
      retries?: { maxAttempts?: number; backoffMs?: number; backoffMultiplier?: number };
      auth?: { type: 'basic' | 'bearer' | 'api-key'; credentials: Record<string, string> };
      signature?: { algorithm?: 'sha256' | 'sha512'; secret: string; header?: string };
      validation?: {
        expectedStatusCodes?: number[];
        expectedResponseSchema?: any;
        customValidator?: string;
      };
      metadata?: Record<string, any>;
    }
  ): WebhookJobData {
    return WebhookJobDataSchema.parse({
      url,
      method: 'POST',
      body,
      headers: options?.headers,
      timeout: options?.timeout,
      retries: options?.retries,
      auth: options?.auth,
      signature: options?.signature,
      validation: options?.validation,
      metadata: options?.metadata
    });
  }

  /**
   * Helper method to create a GET webhook job
   */
  static createGetWebhook(
    url: string,
    options?: {
      headers?: Record<string, string>;
      timeout?: number;
      retries?: { maxAttempts?: number; backoffMs?: number; backoffMultiplier?: number };
      auth?: { type: 'basic' | 'bearer' | 'api-key'; credentials: Record<string, string> };
      validation?: {
        expectedStatusCodes?: number[];
        expectedResponseSchema?: any;
        customValidator?: string;
      };
      metadata?: Record<string, any>;
    }
  ): WebhookJobData {
    return WebhookJobDataSchema.parse({
      url,
      method: 'GET',
      headers: options?.headers,
      timeout: options?.timeout,
      retries: options?.retries,
      auth: options?.auth,
      validation: options?.validation,
      metadata: options?.metadata
    });
  }

  /**
   * Helper method to create a webhook job with signature authentication
   */
  static createSignedWebhook(
    url: string,
    body: any,
    secret: string,
    options?: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      headers?: Record<string, string>;
      algorithm?: 'sha256' | 'sha512';
      signatureHeader?: string;
      timeout?: number;
      retries?: { maxAttempts?: number; backoffMs?: number; backoffMultiplier?: number };
      validation?: {
        expectedStatusCodes?: number[];
        expectedResponseSchema?: any;
        customValidator?: string;
      };
      metadata?: Record<string, any>;
    }
  ): WebhookJobData {
    return WebhookJobDataSchema.parse({
      url,
      method: options?.method || 'POST',
      body,
      headers: options?.headers,
      timeout: options?.timeout,
      retries: options?.retries,
      signature: {
        algorithm: options?.algorithm || 'sha256',
        secret,
        header: options?.signatureHeader || 'X-Signature'
      },
      validation: options?.validation,
      metadata: options?.metadata
    });
  }
}
