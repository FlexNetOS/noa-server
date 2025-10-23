/**
 * Unified Module Exports
 *
 * Central export file for all unified utilities, services, and types
 *
 * @module unified
 */

// ============================================================================
// UTILITIES
// ============================================================================

export {
  RedisConnectionManager,
  getRedisManager,
  RedisConnectionConfig,
  RedisConnectionConfigSchema,
  ConnectionHealth,
  ConnectionStatistics,
} from './utils/RedisConnectionManager';

export {
  LoggerFactory,
  getLogger,
  LogLevel,
  LoggerConfig,
  LoggerConfigSchema,
  CustomLogger,
  LogMetadata,
} from './utils/LoggerFactory';

export {
  ConfigValidator,
  loadConfig,
  ValidationResult,
  ConfigValidationError,
  EnvParseOptions,
} from './utils/ConfigValidator';

export {
  EventBus,
  TypedEventBus,
  getGlobalEventBus,
  EventMetadata,
  EventEnvelope,
  EventHandler,
  EventSubscription,
  EventBusConfig,
} from './utils/EventBus';

// ============================================================================
// SERVICES
// ============================================================================

export {
  CircuitBreaker,
  CircuitBreakerManager,
  CircuitState,
  CircuitBreakerConfig,
  CircuitBreakerConfigSchema,
  CircuitBreakerStatistics,
} from './services/CircuitBreaker';

// ============================================================================
// TYPES
// ============================================================================

export * from './types';

// ============================================================================
// VERSION
// ============================================================================

export const VERSION = '1.0.0';
export const MODULE_NAME = 'unified';

/**
 * Initialize all unified modules
 *
 * @param config - Global configuration
 */
export async function initializeUnified(config: {
  logger?: any;
  redis?: any;
  eventBus?: any;
} = {}): Promise<void> {
  // Initialize logger
  if (config.logger) {
    LoggerFactory.configure(config.logger);
  }

  // Initialize Redis connections
  if (config.redis) {
    const manager = getRedisManager();
    // Redis connections are lazy-loaded
  }

  // Initialize global event bus
  if (config.eventBus !== false) {
    getGlobalEventBus();
  }
}

/**
 * Shutdown all unified modules
 */
export async function shutdownUnified(): Promise<void> {
  const logger = getLogger('unified');
  logger.info('Shutting down unified modules');

  // Shutdown Redis connections
  const redisManager = getRedisManager();
  await redisManager.shutdown();

  // Shutdown event bus
  const eventBus = getGlobalEventBus();
  eventBus.shutdown();

  // Shutdown logger
  await LoggerFactory.shutdown();

  logger.info('Unified modules shutdown complete');
}

export default {
  VERSION,
  MODULE_NAME,
  initializeUnified,
  shutdownUnified,
};
