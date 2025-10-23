// Main exports for the AI Provider package

// Types and interfaces
export * from './types';

// Provider implementations
export { BaseProvider } from './providers/base';
export { ClaudeProvider } from './providers/claude';
export { LlamaCppProvider } from './providers/llama-cpp';
export { OpenAIProvider } from './providers/openai';

// Factory and configuration utilities
export {
    createProvider, createProviderFromEnv, createProviders, createProvidersFromEnv, ProviderFactory
} from './utils/factory';

export {
    ConfigurationManager, createDefaultConfig,
    createProviderConfig,
    DEFAULT_PROVIDER_CONFIGS, getConfig,
    getProviderConfig, loadConfigFromEnvironment, loadConfigFromFile,
    getModelManagerConfig, ModelManagerConfig
} from './utils/config';

// Model management
export { ModelManager } from './managers/model-manager';
export {
    ModelRegistry,
    ModelRegistryEntry,
    ModelStatus,
    ModelPerformanceMetrics,
    ModelSearchQuery,
    ModelRegistryConfig,
    RegistryStatistics
} from './managers/model-registry';
export {
    EnhancedModelManager,
    EnhancedModelManagerConfig,
    ModelLoadOptions,
    ModelSwitchResult,
    ActiveModelState
} from './managers/enhanced-model-manager';

// AI Response Caching
export {
    AICacheManager,
    createAICacheManager,
    createMemoryCacheManager,
    createRedisCacheManager,
    createDiskCacheManager,
    CacheKeyGenerator,
    createDefaultKeyGenerator,
    CacheWarmer,
    createCacheWarmer,
    MemoryCacheBackend,
    RedisCacheBackend,
    createRedisBackend,
    DiskCacheBackend,
    createDiskBackend
} from './cache';

// Cache types re-export
export type {
    CacheBackendType,
    CacheConfig,
    CacheEntry,
    CacheStats,
    CacheResult,
    CacheParameters,
    CacheKeyComponents,
    CacheWarmupConfig,
    CacheWarmupQuery,
    CacheExport,
    ICacheBackend,
    ISemanticSimilarity,
    RedisConfig,
    DiskConfig
} from './cache/types';

// Rate limiting system
export {
    AIRateLimiter,
    TokenBucket,
    RateLimitTier,
    ProviderRateLimit,
    ModelRateLimit,
    UserTier,
    RequestPriority,
    RateLimitStatus,
    RateLimiterEvents,
    QuotaManager,
    QuotaStorage,
    QuotaData,
    QuotaMetrics,
    UsageAnalytics,
    QuotaAlertConfig,
    QuotaAlert,
    QuotaManagerEvents,
    InMemoryQuotaStorage,
    createRateLimitMiddleware,
    createFastifyRateLimitPlugin,
    createWebSocketRateLimiter,
    RateLimitMiddlewareConfig,
    RateLimitHeaders,
    loadRateLimitConfig,
    RateLimitConfig,
    createRateLimiter,
    createQuotaManager
} from './rate-limiting';

// AI Monitoring & Metrics (NEW)
export {
    // Core monitoring
    MonitoringIntegration,
    MonitoringIntegrationConfig,
    createMonitoringIntegration,
    createFullMonitoring,
    HealthStatus,
    ProviderHealthStatus,
    MetricsSummary,
    MonitoringEndpoints,

    // Metrics collector
    AIMetricsCollector,
    RequestMetrics,
    ProviderMetrics,
    ModelMetrics,
    TimeWindowMetrics,
    AggregatedMetrics,
    MetricsCollectorConfig,
    MetricsAlert,
    ExportedMetrics,

    // Metrics storage
    MetricsStorage,
    MetricsStorageConfig,
    RetentionPolicy,
    ExportFormat,
    TimeSeriesDataPoint,
    QueryOptions,
    QueryResult,
    StorageStatistics,

    // Quality metrics
    QualityMetrics,
    QualityMetricsConfig,
    QualityScore,
    SentimentAnalysis,
    HallucinationDetection,
    FactCheckResult,
    CoherenceScore,
    ModelComparisonMetrics,
    ABTestResult,
    ABTestVariant,

    // Cost analytics
    CostAnalytics,
    CostAnalyticsConfig,
    BudgetThreshold,
    CostBreakdown,
    DailyCostSummary,
    MonthlyCostSummary,
    CostForecast,
    CostOptimizationRecommendation,
    ROIAnalysis,
    BudgetAlert,

    // Alerting
    AIAlerting,
    AlertingConfig,
    AlertChannel,
    AlertThreshold,
    AlertType,
    AlertSeverity,
    AnomalyDetectionConfig,
    AlertAggregationConfig,
    EscalationPolicy,
    EscalationTrigger,
    EscalationLevel,
    Alert,
    Anomaly,
    AlertStats,
} from './monitoring';

// Convenience re-exports for common use cases
export { ModelCapability, ProviderType } from './types';
