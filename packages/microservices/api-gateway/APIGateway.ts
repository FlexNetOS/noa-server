/**
 * API Gateway for Microservices Architecture
 * Handles routing, authentication, rate limiting, and request aggregation
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import CircuitBreaker from 'opossum';
import { RateLimiterMemory } from 'rate-limiter-flexible';

import { ServiceDiscovery } from '../service-registry/ServiceDiscovery';
import { ServiceRegistry } from '../service-registry/ServiceRegistry';

export interface Route {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  service: string;
  targetPath?: string;
  auth?: boolean;
  rateLimit?: {
    points: number;
    duration: number;
  };
  timeout?: number;
  circuitBreaker?: {
    timeout: number;
    errorThresholdPercentage: number;
    resetTimeout: number;
  };
  transform?: {
    request?: (req: Request) => any;
    response?: (data: any) => any;
  };
}

export class APIGateway {
  private app: Express;
  private registry: ServiceRegistry;
  private serviceDiscoveries: Map<string, ServiceDiscovery> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private rateLimiters: Map<string, RateLimiterMemory> = new Map();
  private routes: Route[] = [];

  constructor(registry: ServiceRegistry) {
    this.app = express();
    this.registry = registry;

    this.setupMiddleware();
  }

  /**
   * Setup global middleware
   */
  private setupMiddleware(): void {
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
      );

      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }

      next();
    });

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
      });
      next();
    });

    // Request ID
    this.app.use((req: any, res, next) => {
      req.id = this.generateRequestId();
      res.setHeader('X-Request-ID', req.id);
      next();
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: Array.from(this.serviceDiscoveries.keys()),
      });
    });
  }

  /**
   * Register a route
   */
  registerRoute(route: Route): void {
    this.routes.push(route);

    // Create service discovery if not exists
    if (!this.serviceDiscoveries.has(route.service)) {
      const discovery = new ServiceDiscovery(this.registry, {
        serviceName: route.service,
        strategy: 'round-robin',
      });
      this.serviceDiscoveries.set(route.service, discovery);
    }

    // Create circuit breaker if not exists
    if (!this.circuitBreakers.has(route.service)) {
      const options = route.circuitBreaker || {
        timeout: 10000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
      };

      const breaker = new CircuitBreaker(async (requestOptions: any) => {
        const discovery = this.serviceDiscoveries.get(route.service)!;
        return await discovery.request(requestOptions.path, requestOptions.options);
      }, options);

      breaker.on('open', () => {
        console.warn(`Circuit breaker opened for service: ${route.service}`);
      });

      breaker.on('halfOpen', () => {
        console.log(`Circuit breaker half-open for service: ${route.service}`);
      });

      breaker.on('close', () => {
        console.log(`Circuit breaker closed for service: ${route.service}`);
      });

      this.circuitBreakers.set(route.service, breaker);
    }

    // Create rate limiter if specified
    if (route.rateLimit) {
      const key = `${route.method}:${route.path}`;
      this.rateLimiters.set(
        key,
        new RateLimiterMemory({
          points: route.rateLimit.points,
          duration: route.rateLimit.duration,
        })
      );
    }

    // Register Express route
    const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';
    this.app[method](route.path, async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Rate limiting
        if (route.rateLimit) {
          const key = `${route.method}:${route.path}`;
          const limiter = this.rateLimiters.get(key)!;
          const identifier = req.ip || 'unknown';

          try {
            await limiter.consume(identifier);
          } catch (error) {
            return res.status(429).json({
              error: 'Too Many Requests',
              message: 'Rate limit exceeded. Please try again later.',
            });
          }
        }

        // Authentication (placeholder)
        if (route.auth) {
          const token = req.headers.authorization?.replace('Bearer ', '');
          if (!token || !this.validateToken(token)) {
            return res.status(401).json({
              error: 'Unauthorized',
              message: 'Invalid or missing authentication token',
            });
          }
        }

        // Transform request
        let requestData = {
          method: req.method,
          headers: req.headers,
          query: req.query,
          body: req.body,
          params: req.params,
        };

        if (route.transform?.request) {
          requestData = route.transform.request(req);
        }

        // Determine target path
        const targetPath = route.targetPath || req.path.replace(route.path, '');

        // Make request through circuit breaker
        const breaker = this.circuitBreakers.get(route.service)!;
        const response = await breaker.fire({
          path:
            targetPath +
            (Object.keys(req.query).length
              ? '?' + new URLSearchParams(req.query as any).toString()
              : ''),
          options: {
            method: req.method,
            headers: {
              ...req.headers,
              'X-Gateway-Request-ID': (req as any).id,
              'X-Forwarded-For': req.ip,
            },
            body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
          },
        });

        // Transform response
        let responseData = response;
        if (route.transform?.response) {
          responseData = route.transform.response(response);
        }

        res.json(responseData);
      } catch (error) {
        next(error);
      }
    });

    console.log(`Registered route: ${route.method} ${route.path} -> ${route.service}`);
  }

  /**
   * Register multiple routes
   */
  registerRoutes(routes: Route[]): void {
    routes.forEach((route) => this.registerRoute(route));
  }

  /**
   * Aggregate multiple service requests
   */
  async aggregateRequests(
    requests: Array<{
      service: string;
      path: string;
      method?: string;
    }>
  ): Promise<any[]> {
    const promises = requests.map(async (request) => {
      try {
        const discovery = this.serviceDiscoveries.get(request.service);
        if (!discovery) {
          throw new Error(`Service ${request.service} not found`);
        }

        return await discovery.request(request.path, {
          method: request.method || 'GET',
        });
      } catch (error) {
        console.error(`Failed to fetch from ${request.service}:`, error);
        return { error: (error as Error).message };
      }
    });

    return await Promise.all(promises);
  }

  /**
   * Register aggregation endpoint
   */
  registerAggregationEndpoint(
    path: string,
    requests: Array<{
      service: string;
      path: string;
      method?: string;
      key: string;
    }>
  ): void {
    this.app.get(path, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const results = await this.aggregateRequests(requests);

        const aggregated: any = {};
        results.forEach((result, index) => {
          aggregated[requests[index].key] = result;
        });

        res.json(aggregated);
      } catch (error) {
        next(error);
      }
    });

    console.log(`Registered aggregation endpoint: ${path}`);
  }

  /**
   * Validate JWT token (placeholder)
   */
  private validateToken(token: string): boolean {
    // Implement JWT validation
    // This should verify the token signature and expiration
    return token.length > 0;
  }

  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    return `gw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Error handling middleware
   */
  setupErrorHandling(): void {
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Gateway error:', error);

      const statusCode = (error as any).statusCode || 500;
      const message = error.message || 'Internal Server Error';

      res.status(statusCode).json({
        error: error.name || 'Error',
        message,
        requestId: (req as any).id,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Get Express app
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Start the gateway
   */
  start(port: number): void {
    this.setupErrorHandling();

    this.app.listen(port, () => {
      console.log(`API Gateway listening on port ${port}`);
      console.log(`Registered routes: ${this.routes.length}`);
    });
  }

  /**
   * Get gateway statistics
   */
  getStats() {
    return {
      routes: this.routes.length,
      services: Array.from(this.serviceDiscoveries.keys()),
      circuitBreakers: Object.fromEntries(
        Array.from(this.circuitBreakers.entries()).map(([service, breaker]) => [
          service,
          {
            state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
            stats: breaker.stats,
          },
        ])
      ),
    };
  }

  /**
   * Shutdown gateway
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down API Gateway...');

    // Shutdown service discoveries
    for (const discovery of this.serviceDiscoveries.values()) {
      discovery.shutdown();
    }

    // Close circuit breakers
    for (const breaker of this.circuitBreakers.values()) {
      breaker.shutdown();
    }

    console.log('API Gateway shutdown complete');
  }
}

// Export factory function
export function createAPIGateway(registry: ServiceRegistry): APIGateway {
  return new APIGateway(registry);
}
