/**
 * Basic Usage Examples for Provider Fallback System
 */

import {
  FallbackManager,
  DEFAULT_FALLBACK_CONFIG,
  FallbackConfig,
  ProviderType
} from '..';
import { ClaudeProvider } from '../../providers/claude';
import { LlamaCppProvider } from '../../providers/llama-cpp';
import { OpenAIProvider } from '../../providers/openai';

/**
 * Example 1: Basic Setup with Default Configuration
 */
export async function basicSetup() {
  // Initialize fallback manager with default config
  const fallbackManager = new FallbackManager(DEFAULT_FALLBACK_CONFIG);

  // Register providers
  fallbackManager.registerProvider(
    ProviderType.CLAUDE,
    new ClaudeProvider({
      type: ProviderType.CLAUDE,
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    })
  );

  fallbackManager.registerProvider(
    ProviderType.LLAMA_CPP,
    new LlamaCppProvider({
      type: ProviderType.LLAMA_CPP,
      baseURL: process.env.LLAMA_CPP_URL || 'http://localhost:8080'
    })
  );

  fallbackManager.registerProvider(
    ProviderType.OPENAI,
    new OpenAIProvider({
      type: ProviderType.OPENAI,
      apiKey: process.env.OPENAI_API_KEY || ''
    })
  );

  // Start health monitoring
  fallbackManager.startHealthMonitoring();

  // Execute request with automatic failover
  try {
    const result = await fallbackManager.executeWithFallback(
      async (provider) => {
        return await provider.createChatCompletion({
          messages: [{ role: 'user', content: 'Hello, how are you?' }],
          model: 'gpt-4',
          config: { temperature: 0.7, max_tokens: 100 }
        });
      },
      'default' // Use default fallback chain
    );

    console.log('Response:', result.choices[0].message?.content);
  } catch (error) {
    console.error('All providers failed:', error);
  } finally {
    fallbackManager.destroy();
  }
}

/**
 * Example 2: Custom Configuration for Different Use Cases
 */
export async function customConfiguration() {
  const config: FallbackConfig = {
    circuitBreaker: {
      failureThreshold: 3,     // Open circuit after 3 failures
      successThreshold: 2,      // Close after 2 successes
      timeout: 20000,           // 20s timeout
      cooldownPeriod: 30000     // 30s cooldown
    },
    chains: {
      // Production chain: Premium providers first
      'production': {
        name: 'production',
        providers: [ProviderType.CLAUDE, ProviderType.OPENAI],
        retryPolicy: {
          maxRetries: 2,
          initialBackoff: 500,
          maxBackoff: 30000,
          backoffMultiplier: 2
        }
      },
      // Development chain: Local model first
      'development': {
        name: 'development',
        providers: [ProviderType.LLAMA_CPP, ProviderType.CLAUDE],
        retryPolicy: {
          maxRetries: 3,
          initialBackoff: 1000,
          maxBackoff: 60000,
          backoffMultiplier: 2
        }
      },
      // Fast-fail chain: Minimal retries
      'fast-fail': {
        name: 'fast-fail',
        providers: [ProviderType.CLAUDE],
        retryPolicy: {
          maxRetries: 1,
          initialBackoff: 500,
          maxBackoff: 5000,
          backoffMultiplier: 2
        }
      }
    },
    healthCheckInterval: 60000 // 1 minute health checks
  };

  const fallbackManager = new FallbackManager(config);

  // Register providers...
  // (same as basic setup)

  // Use production chain
  const productionResult = await fallbackManager.executeWithFallback(
    async (provider) => provider.createChatCompletion(request),
    'production'
  );

  // Use development chain
  const devResult = await fallbackManager.executeWithFallback(
    async (provider) => provider.createChatCompletion(request),
    'development'
  );
}

/**
 * Example 3: Event Monitoring
 */
export async function eventMonitoring() {
  const fallbackManager = new FallbackManager(DEFAULT_FALLBACK_CONFIG);

  // Register providers...

  // Monitor circuit breaker events
  fallbackManager.on('circuit-breaker-open', ({ provider, state }) => {
    console.warn(`🚨 Circuit breaker opened for ${provider}`);
    console.log('State:', state);
    // Alert operations team
    alertOpsTeam(`Circuit breaker opened for ${provider}`, state);
  });

  fallbackManager.on('circuit-breaker-reset', ({ provider }) => {
    console.log(`✅ Circuit breaker reset for ${provider}`);
  });

  // Monitor requests
  fallbackManager.on('request-success', ({ provider, latency, attemptNumber }) => {
    console.log(`✅ Request succeeded on ${provider}`);
    console.log(`   Latency: ${latency}ms, Attempts: ${attemptNumber}`);

    // Log metrics
    logMetric('provider.request.success', {
      provider,
      latency,
      attemptNumber
    });
  });

  fallbackManager.on('request-failure', ({ provider, error, attemptNumber, willRetry }) => {
    console.error(`❌ Request failed on ${provider} (attempt ${attemptNumber})`);
    console.error(`   Error: ${error}`);
    console.log(`   Will retry: ${willRetry}`);
  });

  // Monitor provider health
  fallbackManager.on('provider-unhealthy', ({ provider, status }) => {
    console.warn(`⚠️  Provider ${provider} is unhealthy`);
    console.log(`   Success rate: ${(status.successRate * 100).toFixed(2)}%`);
    console.log(`   Avg response time: ${status.averageResponseTime}ms`);
    console.log(`   Consecutive failures: ${status.consecutiveFailures}`);
  });

  fallbackManager.on('provider-recovered', ({ provider, status }) => {
    console.log(`✅ Provider ${provider} has recovered`);
    console.log(`   Success rate: ${(status.successRate * 100).toFixed(2)}%`);
  });

  // Monitor retries
  fallbackManager.on('retry-attempt', ({ provider, attempt, maxRetries, delay }) => {
    console.log(`🔄 Retrying ${provider} (${attempt}/${maxRetries}) after ${delay}ms`);
  });

  fallbackManager.startHealthMonitoring();

  // Execute requests...
}

/**
 * Example 4: Manual Circuit Breaker Management
 */
export async function manualCircuitBreakerManagement() {
  const fallbackManager = new FallbackManager(DEFAULT_FALLBACK_CONFIG);

  // Register providers...

  // Get circuit breaker state
  const claudeState = fallbackManager.getCircuitBreakerState(ProviderType.CLAUDE);
  console.log('Claude circuit state:', claudeState);
  // {
  //   state: 'closed',
  //   failureCount: 0,
  //   successCount: 0,
  //   lastFailureTime: 0,
  //   nextRetryTime: 0
  // }

  // Get all circuit states
  const allStates = fallbackManager.getAllCircuitBreakerStates();
  allStates.forEach((state, provider) => {
    console.log(`${provider}: ${state.state} (failures: ${state.failureCount})`);
  });

  // Manually reset circuit breaker (e.g., after maintenance)
  fallbackManager.resetCircuitBreaker(ProviderType.CLAUDE);
  console.log('Circuit breaker reset for Claude');
}

/**
 * Example 5: Health Monitoring and Metrics
 */
export async function healthMonitoringAndMetrics() {
  const fallbackManager = new FallbackManager(DEFAULT_FALLBACK_CONFIG);

  // Register providers...
  fallbackManager.startHealthMonitoring();

  // Get provider health
  const claudeHealth = fallbackManager.getProviderHealth(ProviderType.CLAUDE);
  console.log('Claude health:', claudeHealth);
  // {
  //   provider: 'claude',
  //   isHealthy: true,
  //   availability: 0.98,
  //   averageResponseTime: 250,
  //   successRate: 0.98,
  //   totalRequests: 100,
  //   successfulRequests: 98,
  //   failedRequests: 2,
  //   lastCheckTime: 1698765432000,
  //   consecutiveFailures: 0,
  //   consecutiveSuccesses: 15
  // }

  // Get all provider health
  const allHealth = fallbackManager.getAllProviderHealth();
  allHealth.forEach((health, provider) => {
    console.log(`${provider}:`);
    console.log(`  Healthy: ${health.isHealthy}`);
    console.log(`  Success rate: ${(health.successRate * 100).toFixed(2)}%`);
    console.log(`  Avg response time: ${health.averageResponseTime}ms`);
  });

  // Get comprehensive metrics
  const metrics = fallbackManager.getMetrics();
  console.log('Fallback metrics:', JSON.stringify(metrics, null, 2));
}

/**
 * Example 6: Error Handling and Graceful Degradation
 */
export async function errorHandlingAndGracefulDegradation() {
  const fallbackManager = new FallbackManager(DEFAULT_FALLBACK_CONFIG);

  // Register providers...

  try {
    const result = await fallbackManager.executeWithFallback(
      async (provider) => {
        return await provider.createChatCompletion({
          messages: [{ role: 'user', content: 'Hello!' }],
          model: 'gpt-4'
        });
      },
      'default'
    );

    console.log('Response:', result.choices[0].message?.content);
  } catch (error) {
    // All providers failed - implement graceful degradation
    console.error('All providers failed, using fallback response');

    // Option 1: Return cached response
    const cachedResponse = getCachedResponse();
    if (cachedResponse) {
      return cachedResponse;
    }

    // Option 2: Return error message to user
    return {
      error: 'Service temporarily unavailable. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Helper Functions
 */

function alertOpsTeam(message: string, details: any) {
  // Send alert to ops team (Slack, PagerDuty, etc.)
  console.log('🚨 OPS ALERT:', message, details);
}

function logMetric(metric: string, data: any) {
  // Log to metrics system (Datadog, Prometheus, etc.)
  console.log(`📊 METRIC [${metric}]:`, data);
}

function getCachedResponse(): any | null {
  // Return cached response if available
  return null;
}

/**
 * Run examples
 */
if (require.main === module) {
  (async () => {
    console.log('Running basic setup example...\n');
    await basicSetup();

    console.log('\n\nRunning event monitoring example...\n');
    await eventMonitoring();

    console.log('\n\nRunning manual circuit breaker management...\n');
    await manualCircuitBreakerManagement();

    console.log('\n\nRunning health monitoring and metrics...\n');
    await healthMonitoringAndMetrics();

    console.log('\n\nRunning error handling example...\n');
    await errorHandlingAndGracefulDegradation();
  })();
}
