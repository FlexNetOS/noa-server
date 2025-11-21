import { Client } from '@elastic/elasticsearch';
import { ElasticsearchTransport as WinstonElasticsearch } from 'winston-elasticsearch';
import { z } from 'zod';

/**
 * Elasticsearch transport configuration schema
 */
const ElasticsearchConfigSchema = z.object({
  level: z.string().default('info'),
  serviceName: z.string(),
  environment: z.string().default('development'),
  node: z.string().default('http://localhost:9200'),
  index: z.string().default('logs'),
  username: z.string().optional(),
  password: z.string().optional(),
  apiKey: z.string().optional(),
  indexPrefix: z.string().optional(),
  indexSuffixPattern: z.string().default('YYYY.MM.DD'),
  messageType: z.string().default('log'),
  ensureIndexTemplate: z.boolean().default(true),
  flushInterval: z.number().default(2000),
  bufferLimit: z.number().default(100),
});

export type ElasticsearchConfig = z.infer<typeof ElasticsearchConfigSchema>;

/**
 * Elasticsearch transport for Winston with ELK stack integration
 */
export class ElasticsearchTransport {
  private client: Client;
  private transport: any;
  private config: ElasticsearchConfig;

  constructor(config: ElasticsearchConfig) {
    this.config = ElasticsearchConfigSchema.parse(config);

    // Create Elasticsearch client
    const clientConfig: any = {
      node: this.config.node,
    };

    if (this.config.username && this.config.password) {
      clientConfig.auth = {
        username: this.config.username,
        password: this.config.password,
      };
    } else if (this.config.apiKey) {
      clientConfig.auth = {
        apiKey: this.config.apiKey,
      };
    }

    this.client = new Client(clientConfig);

    // Create Winston Elasticsearch transport
    const indexPrefix =
      this.config.indexPrefix || `${this.config.index}-${this.config.environment}`;

    this.transport = new WinstonElasticsearch({
      level: this.config.level,
      client: this.client,
      index: indexPrefix,
      indexSuffixPattern: this.config.indexSuffixPattern,
      messageType: this.config.messageType,
      ensureIndexTemplate: this.config.ensureIndexTemplate,
      flushInterval: this.config.flushInterval,
      bufferLimit: this.config.bufferLimit,
      transformer: (logData: any) => {
        return this.transformLogData(logData);
      },
    });
  }

  /**
   * Transform log data before sending to Elasticsearch
   */
  private transformLogData(logData: any): any {
    return {
      '@timestamp': new Date().toISOString(),
      severity: logData.level,
      message: logData.message,
      service: {
        name: this.config.serviceName,
        environment: this.config.environment,
      },
      fields: logData.meta || {},
      ...logData,
    };
  }

  /**
   * Get the Winston transport instance
   */
  public getTransport(): any {
    return this.transport;
  }

  /**
   * Query logs from Elasticsearch
   */
  public async query(query: {
    from?: Date;
    to?: Date;
    level?: string;
    search?: string;
    limit?: number;
  }): Promise<any[]> {
    const must: any[] = [
      {
        term: {
          'service.name.keyword': this.config.serviceName,
        },
      },
    ];

    if (query.from || query.to) {
      const range: any = {};
      if (query.from) range.gte = query.from.toISOString();
      if (query.to) range.lte = query.to.toISOString();

      must.push({
        range: {
          '@timestamp': range,
        },
      });
    }

    if (query.level) {
      must.push({
        term: {
          'severity.keyword': query.level,
        },
      });
    }

    if (query.search) {
      must.push({
        multi_match: {
          query: query.search,
          fields: ['message', 'fields.*'],
        },
      });
    }

    try {
      const response = await this.client.search({
        index: `${this.config.indexPrefix || this.config.index}-*`,
        body: {
          query: {
            bool: {
              must,
            },
          },
          sort: [{ '@timestamp': 'desc' }],
          size: query.limit || 100,
        },
      });

      return response.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      console.error('Error querying Elasticsearch:', error);
      throw error;
    }
  }

  /**
   * Create index template for logs
   */
  public async createIndexTemplate(): Promise<void> {
    const templateName = `${this.config.index}-template`;
    const indexPattern = `${this.config.indexPrefix || this.config.index}-*`;

    try {
      await this.client.indices.putIndexTemplate({
        name: templateName,
        body: {
          index_patterns: [indexPattern],
          template: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 1,
              'index.refresh_interval': '5s',
            },
            mappings: {
              properties: {
                '@timestamp': { type: 'date' },
                severity: { type: 'keyword' },
                message: { type: 'text' },
                'service.name': { type: 'keyword' },
                'service.environment': { type: 'keyword' },
                correlationId: { type: 'keyword' },
                traceId: { type: 'keyword' },
                spanId: { type: 'keyword' },
                userId: { type: 'keyword' },
                sessionId: { type: 'keyword' },
              },
            },
          },
        },
      });
    } catch (error) {
      console.error('Error creating index template:', error);
      throw error;
    }
  }

  /**
   * Check Elasticsearch connection
   */
  public async checkConnection(): Promise<boolean> {
    try {
      const response = await this.client.ping();
      return response !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get Elasticsearch cluster info
   */
  public async getClusterInfo(): Promise<any> {
    try {
      return await this.client.info();
    } catch (error) {
      console.error('Error getting cluster info:', error);
      throw error;
    }
  }

  /**
   * Close Elasticsearch client
   */
  public async close(): Promise<void> {
    await this.client.close();
  }

  /**
   * Get the Elasticsearch client
   */
  public getClient(): Client {
    return this.client;
  }
}
