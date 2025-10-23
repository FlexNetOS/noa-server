import {
  trace,
  context,
  Span,
  SpanStatusCode,
  SpanKind,
  Context,
  Tracer,
} from '@opentelemetry/api';
import { Logger } from 'winston';

/**
 * Span attributes interface
 */
export interface SpanAttributes {
  [key: string]: string | number | boolean | string[] | number[] | boolean[];
}

/**
 * Span options interface
 */
export interface SpanOptions {
  kind?: SpanKind;
  attributes?: SpanAttributes;
  links?: any[];
  startTime?: number;
}

/**
 * Manager for creating and managing OpenTelemetry spans
 */
export class SpanManager {
  private tracer: Tracer;
  private logger?: Logger;

  constructor(tracerName: string = 'default', logger?: Logger) {
    this.tracer = trace.getTracer(tracerName);
    this.logger = logger;
  }

  /**
   * Start a new span
   */
  public startSpan(name: string, options?: SpanOptions): Span {
    const span = this.tracer.startSpan(name, {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: options?.attributes,
      links: options?.links,
      startTime: options?.startTime,
    });

    this.logger?.debug('Span started', { name, spanId: span.spanContext().spanId });

    return span;
  }

  /**
   * Start a span with a specific context
   */
  public startSpanWithContext(name: string, ctx: Context, options?: SpanOptions): Span {
    return this.tracer.startSpan(
      name,
      {
        kind: options?.kind || SpanKind.INTERNAL,
        attributes: options?.attributes,
        links: options?.links,
        startTime: options?.startTime,
      },
      ctx
    );
  }

  /**
   * Execute a function within a span context
   */
  public async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: SpanOptions
  ): Promise<T> {
    const span = this.startSpan(name, options);

    try {
      const result = await context.with(trace.setSpan(context.active(), span), async () => {
        return await fn(span);
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
      this.logger?.debug('Span ended', { name, spanId: span.spanContext().spanId });
    }
  }

  /**
   * Execute a synchronous function within a span context
   */
  public withSpanSync<T>(
    name: string,
    fn: (span: Span) => T,
    options?: SpanOptions
  ): T {
    const span = this.startSpan(name, options);

    try {
      const result = context.with(trace.setSpan(context.active(), span), () => {
        return fn(span);
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
      this.logger?.debug('Span ended', { name, spanId: span.spanContext().spanId });
    }
  }

  /**
   * Get the current active span
   */
  public getCurrentSpan(): Span | undefined {
    return trace.getSpan(context.active());
  }

  /**
   * Add an event to the current span
   */
  public addEvent(name: string, attributes?: SpanAttributes): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.addEvent(name, attributes);
    } else {
      this.logger?.warn('No active span to add event to', { eventName: name });
    }
  }

  /**
   * Set an attribute on the current span
   */
  public setAttribute(key: string, value: string | number | boolean): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.setAttribute(key, value);
    } else {
      this.logger?.warn('No active span to set attribute on', { key });
    }
  }

  /**
   * Set multiple attributes on the current span
   */
  public setAttributes(attributes: SpanAttributes): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.setAttributes(attributes);
    } else {
      this.logger?.warn('No active span to set attributes on');
    }
  }

  /**
   * Record an exception in the current span
   */
  public recordException(error: Error): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    } else {
      this.logger?.warn('No active span to record exception', { error: error.message });
    }
  }

  /**
   * Set the status of the current span
   */
  public setStatus(code: SpanStatusCode, message?: string): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.setStatus({ code, message });
    } else {
      this.logger?.warn('No active span to set status');
    }
  }

  /**
   * End the current span
   */
  public endCurrentSpan(endTime?: number): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.end(endTime);
      this.logger?.debug('Current span ended');
    } else {
      this.logger?.warn('No active span to end');
    }
  }

  /**
   * Create a child span from the current context
   */
  public createChildSpan(name: string, options?: SpanOptions): Span {
    const currentContext = context.active();
    return this.startSpanWithContext(name, currentContext, options);
  }

  /**
   * Decorator for automatic span creation
   */
  public traced(spanName?: string) {
    return (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ): PropertyDescriptor => {
      const originalMethod = descriptor.value;
      const name = spanName || `${target.constructor.name}.${propertyKey}`;

      descriptor.value = async function (this: any, ...args: any[]) {
        return await this.spanManager.withSpan(
          name,
          async () => {
            return await originalMethod.apply(this, args);
          },
          {
            attributes: {
              'function.name': propertyKey,
              'class.name': target.constructor.name,
            },
          }
        );
      };

      return descriptor;
    };
  }

  /**
   * Get the current trace context
   */
  public getCurrentContext(): Context {
    return context.active();
  }

  /**
   * Execute a function with a custom context
   */
  public withContext<T>(ctx: Context, fn: () => T): T {
    return context.with(ctx, fn);
  }

  /**
   * Get trace ID from current span
   */
  public getTraceId(): string | undefined {
    const span = this.getCurrentSpan();
    if (span) {
      return span.spanContext().traceId;
    }
    return undefined;
  }

  /**
   * Get span ID from current span
   */
  public getSpanId(): string | undefined {
    const span = this.getCurrentSpan();
    if (span) {
      return span.spanContext().spanId;
    }
    return undefined;
  }

  /**
   * Check if there is an active span
   */
  public hasActiveSpan(): boolean {
    return this.getCurrentSpan() !== undefined;
  }
}
