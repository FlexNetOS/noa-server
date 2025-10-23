/**
 * API Performance Benchmarks
 * Tests HTTP endpoint performance
 */

import { BenchmarkRunner } from './benchmark-runner';
import axios from 'axios';

interface APIBenchmarkConfig {
  baseURL: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export class APIBenchmarks {
  private runner: BenchmarkRunner;
  private config: APIBenchmarkConfig;

  constructor(config: APIBenchmarkConfig) {
    this.runner = new BenchmarkRunner();
    this.config = {
      timeout: 5000,
      ...config,
    };
  }

  /**
   * Run all API benchmarks
   */
  async runAll(): Promise<void> {
    console.log('=== API Performance Benchmarks ===\n');

    await this.runHealthCheckBenchmark();
    await this.runAuthenticationBenchmark();
    await this.runMetricsBenchmark();

    await this.runner.saveResults('api-benchmarks.json');
    await this.runner.generateReport();
  }

  /**
   * Health check endpoint benchmark
   */
  private async runHealthCheckBenchmark(): Promise<void> {
    await this.runner.runBenchmark(
      'GET /health',
      'Health Checks',
      async () => {
        try {
          await axios.get(`${this.config.baseURL}/health`, {
            timeout: this.config.timeout,
            headers: this.config.headers,
          });
        } catch (error) {
          // Endpoint might not exist yet
        }
      },
      {
        warmupRuns: 20,
        measurementRuns: 200,
      }
    );
  }

  /**
   * Authentication endpoint benchmark
   */
  private async runAuthenticationBenchmark(): Promise<void> {
    await this.runner.runBenchmark(
      'POST /auth/login',
      'Authentication',
      async () => {
        try {
          await axios.post(
            `${this.config.baseURL}/auth/login`,
            {
              username: 'test',
              password: 'test123',
            },
            {
              timeout: this.config.timeout,
              headers: this.config.headers,
            }
          );
        } catch (error) {
          // Expected to fail, measuring request time only
        }
      },
      {
        warmupRuns: 10,
        measurementRuns: 100,
      }
    );
  }

  /**
   * Metrics endpoint benchmark
   */
  private async runMetricsBenchmark(): Promise<void> {
    await this.runner.runBenchmark(
      'GET /metrics',
      'Monitoring',
      async () => {
        try {
          await axios.get(`${this.config.baseURL}/metrics`, {
            timeout: this.config.timeout,
            headers: this.config.headers,
          });
        } catch (error) {
          // Endpoint might not exist yet
        }
      },
      {
        warmupRuns: 20,
        measurementRuns: 200,
      }
    );
  }

  /**
   * Get benchmark results
   */
  getResults() {
    return this.runner.getResults();
  }
}

/**
 * Run API benchmarks
 */
export async function runAPIBenchmarks(baseURL: string = 'http://localhost:8080') {
  const benchmarks = new APIBenchmarks({ baseURL });
  await benchmarks.runAll();
  return benchmarks.getResults();
}

// Run if called directly
if (require.main === module) {
  const baseURL = process.env.API_BASE_URL || 'http://localhost:8080';
  runAPIBenchmarks(baseURL).catch(console.error);
}
