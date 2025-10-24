import {
  Collection,
  Db,
  DeleteResult,
  Document,
  InsertOneResult,
  MongoClient,
  UpdateResult,
} from 'mongodb';
import { Logger } from 'winston';
import { MongoDBShardConfig } from '../types';

export interface MongoDBShardAdapterOptions {
  config: MongoDBShardConfig;
  logger: Logger;
}

export class MongoDBShardAdapter {
  private config: MongoDBShardConfig;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private logger: Logger;
  private isConnected = false;

  constructor(options: MongoDBShardAdapterOptions) {
    this.config = options.config;
    this.logger = options.logger;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing MongoDB shard adapter', {
        uri: this.config.uri.replace(/\/\/.*@/, '//***:***@'), // Mask credentials
        database: this.config.database,
      });

      this.client = new MongoClient(this.config.uri, {
        maxPoolSize: this.config.maxPoolSize || 10,
        minPoolSize: this.config.minPoolSize || 1,
        maxIdleTimeMS: this.config.maxIdleTimeMS || 30000,
        readPreference: this.config.readPreference || 'primary',
      });

      // Connect to MongoDB
      await this.client.connect();
      this.db = this.client.db(this.config.database);

      // Test connection
      await this.ping();

      this.isConnected = true;
      this.logger.info('MongoDB shard adapter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize MongoDB shard adapter', { error });
      throw error;
    }
  }

  async close(): Promise<void> {
    if (!this.client) {
      return;
    }

    this.logger.info('Closing MongoDB shard adapter');

    try {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.isConnected = false;
      this.logger.info('MongoDB shard adapter closed successfully');
    } catch (error) {
      this.logger.error('Error closing MongoDB shard adapter', { error });
      throw error;
    }
  }

  async ping(): Promise<void> {
    if (!this.db) {
      throw new Error('Adapter not initialized');
    }

    await this.db.admin().ping();
  }

  async execute<T = any>(operation: (db: Db) => Promise<T>): Promise<T> {
    if (!this.db) {
      throw new Error('Adapter not initialized');
    }

    const startTime = Date.now();

    try {
      const result = await operation(this.db);
      const duration = Date.now() - startTime;

      this.logger.debug('MongoDB operation executed successfully', {
        duration,
        operation: operation.name || 'anonymous',
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('MongoDB operation execution failed', {
        duration,
        error: error.message,
        operation: operation.name || 'anonymous',
      });
      throw error;
    }
  }

  async executeTransaction<T = any>(operation: (db: Db) => Promise<T>): Promise<T> {
    if (!this.db) {
      throw new Error('Adapter not initialized');
    }

    const session = this.client!.startSession();
    const startTime = Date.now();

    try {
      let result: T;

      await session.withTransaction(async () => {
        result = await operation(this.db!);
      });

      const duration = Date.now() - startTime;
      this.logger.debug('MongoDB transaction completed successfully', {
        duration,
        operation: operation.name || 'anonymous',
      });

      return result!;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('MongoDB transaction failed', {
        duration,
        error: error.message,
        operation: operation.name || 'anonymous',
      });
      throw error;
    } finally {
      await session.endSession();
    }
  }

  // Collection operations
  getCollection<T extends Document = Document>(name: string): Collection<T> {
    if (!this.db) {
      throw new Error('Adapter not initialized');
    }

    return this.db.collection<T>(name);
  }

  async createCollection(name: string, options?: any): Promise<void> {
    if (!this.db) {
      throw new Error('Adapter not initialized');
    }

    await this.db.createCollection(name, options);
    this.logger.info(`Collection ${name} created`);
  }

  async dropCollection(name: string): Promise<void> {
    if (!this.db) {
      throw new Error('Adapter not initialized');
    }

    await this.db.dropCollection(name);
    this.logger.info(`Collection ${name} dropped`);
  }

  async collectionExists(name: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Adapter not initialized');
    }

    const collections = await this.db.listCollections({ name }).toArray();
    return collections.length > 0;
  }

  // CRUD operations
  async find<T = any>(collection: string, query: any = {}, options: any = {}): Promise<T[]> {
    return this.execute(async (db) => {
      const coll = db.collection(collection);
      const cursor = coll.find(query, options);
      return cursor.toArray() as Promise<T[]>;
    });
  }

  async findOne<T = any>(
    collection: string,
    query: any = {},
    options: any = {}
  ): Promise<T | null> {
    return this.execute(async (db) => {
      const coll = db.collection(collection);
      return coll.findOne(query, options) as Promise<T | null>;
    });
  }

  async insertOne<T = any>(
    collection: string,
    document: T,
    options: any = {}
  ): Promise<InsertOneResult<T>> {
    return this.execute(async (db) => {
      const coll = db.collection(collection);
      return coll.insertOne(document, options);
    });
  }

  async insertMany<T = any>(collection: string, documents: T[], options: any = {}): Promise<any> {
    return this.execute(async (db) => {
      const coll = db.collection(collection);
      return coll.insertMany(documents, options);
    });
  }

  async updateOne(
    collection: string,
    filter: any,
    update: any,
    options: any = {}
  ): Promise<UpdateResult> {
    return this.execute(async (db) => {
      const coll = db.collection(collection);
      return coll.updateOne(filter, update, options);
    });
  }

  async updateMany(collection: string, filter: any, update: any, options: any = {}): Promise<any> {
    return this.execute(async (db) => {
      const coll = db.collection(collection);
      return coll.updateMany(filter, update, options);
    });
  }

  async replaceOne(
    collection: string,
    filter: any,
    replacement: any,
    options: any = {}
  ): Promise<any> {
    return this.execute(async (db) => {
      const coll = db.collection(collection);
      return coll.replaceOne(filter, replacement, options);
    });
  }

  async deleteOne(collection: string, filter: any, options: any = {}): Promise<DeleteResult> {
    return this.execute(async (db) => {
      const coll = db.collection(collection);
      return coll.deleteOne(filter, options);
    });
  }

  async deleteMany(collection: string, filter: any, options: any = {}): Promise<any> {
    return this.execute(async (db) => {
      const coll = db.collection(collection);
      return coll.deleteMany(filter, options);
    });
  }

  // Aggregation operations
  async aggregate<T = any>(collection: string, pipeline: any[], options: any = {}): Promise<T[]> {
    return this.execute(async (db) => {
      const coll = db.collection(collection);
      const cursor = coll.aggregate(pipeline, options);
      return cursor.toArray() as Promise<T[]>;
    });
  }

  // Index operations
  async createIndex(collection: string, keys: any, options: any = {}): Promise<string> {
    return this.execute(async (db) => {
      const coll = db.collection(collection);
      return coll.createIndex(keys, options);
    });
  }

  async dropIndex(collection: string, indexName: string, options: any = {}): Promise<void> {
    return this.execute(async (db) => {
      const coll = db.collection(collection);
      return coll.dropIndex(indexName, options);
    });
  }

  async listIndexes(collection: string): Promise<any[]> {
    return this.execute(async (db) => {
      const coll = db.collection(collection);
      return coll.listIndexes().toArray();
    });
  }

  // Bulk operations
  async bulkWrite(collection: string, operations: any[], options: any = {}): Promise<any> {
    return this.execute(async (db) => {
      const coll = db.collection(collection);
      return coll.bulkWrite(operations, options);
    });
  }

  // Count operations
  async countDocuments(collection: string, query: any = {}, options: any = {}): Promise<number> {
    return this.execute(async (db) => {
      const coll = db.collection(collection);
      return coll.countDocuments(query, options);
    });
  }

  async estimatedDocumentCount(collection: string, options: any = {}): Promise<number> {
    return this.execute(async (db) => {
      const coll = db.collection(collection);
      return coll.estimatedDocumentCount(options);
    });
  }

  // Connection pool stats
  getPoolStats(): {
    size: number;
    minSize: number;
    maxSize: number;
    checkedOut: number;
    waitQueueSize: number;
  } | null {
    if (!this.client) {
      return null;
    }

    // Note: MongoDB driver doesn't expose detailed pool stats like pg
    // This is a simplified version
    return {
      size: 0, // Not available in MongoDB driver
      minSize: this.config.minPoolSize || 1,
      maxSize: this.config.maxPoolSize || 10,
      checkedOut: 0, // Not available
      waitQueueSize: 0, // Not available
    };
  }

  // Health check
  async healthCheck(): Promise<{
    isHealthy: boolean;
    latency: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      await this.ping();
      const latency = Date.now() - startTime;
      return { isHealthy: true, latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      return { isHealthy: false, latency, error: error.message };
    }
  }

  // Configuration
  getConfig(): MongoDBShardConfig {
    return { ...this.config };
  }

  isInitialized(): boolean {
    return this.isConnected && this.client !== null && this.db !== null;
  }

  // Database-level operations
  async listCollections(): Promise<string[]> {
    if (!this.db) {
      throw new Error('Adapter not initialized');
    }

    const collections = await this.db.listCollections().toArray();
    return collections.map((col) => col.name);
  }

  async getCollectionStats(collection: string): Promise<any> {
    return this.execute(async (db) => {
      const coll = db.collection(collection);
      return coll.stats();
    });
  }

  async getDatabaseStats(): Promise<any> {
    return this.execute(async (db) => {
      return db.stats();
    });
  }
}
