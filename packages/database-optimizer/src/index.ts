/**
 * @noa/database-optimizer
 *
 * Comprehensive database optimization and query analysis system
 */

export {
  QueryOptimizer,
  QueryOptimizerConfig,
  QueryAnalysis,
  Recommendation,
  IndexSuggestion,
  CacheabilityAnalysis,
  QueryStatistics,
} from './QueryOptimizer';
export {
  IndexManager,
  IndexManagerConfig,
  IndexInfo,
  IndexRecommendation,
  IndexUsageStats,
  MaintenanceReport,
} from './IndexManager';

// Patterns
export { SlowQueryDetector } from './patterns/SlowQueryDetector';
export { NPlusOneDetector } from './patterns/NPlusOneDetector';
export { MissingIndexDetector } from './patterns/MissingIndexDetector';
export { QueryPlanAnalyzer } from './patterns/QueryPlanAnalyzer';

// Monitoring
export { DatabaseMonitor } from './monitoring/DatabaseMonitor';

// Re-export for convenience
export default {
  QueryOptimizer,
  IndexManager,
};
