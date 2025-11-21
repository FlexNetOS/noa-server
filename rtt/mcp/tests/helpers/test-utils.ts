/**
 * Test Utilities
 * Common utilities and helpers for all test suites
 */

import { vi } from 'vitest'

/**
 * Delays execution for specified milliseconds
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Creates a mock response object for HTTP requests
 */
export const mockResponse = (data: any, status = 200) => {
  return {
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    ok: status >= 200 && status < 300,
    headers: new Headers({
      'content-type': 'application/json'
    })
  }
}

/**
 * Creates a mock error response
 */
export const mockErrorResponse = (message: string, status = 400) => {
  return {
    json: vi.fn().mockResolvedValue({ error: { message } }),
    text: vi.fn().mockResolvedValue(JSON.stringify({ error: { message } })),
    status,
    statusText: 'Error',
    ok: false,
    headers: new Headers({
      'content-type': 'application/json'
    })
  }
}

/**
 * Generates a random UUID-like string for testing
 */
export const generateTestId = (): string => {
  return `test-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`
}

/**
 * Generates a mock trace ID
 */
export const generateTraceId = (): string => {
  const chars = '0123456789abcdef'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

/**
 * Creates mock stats data
 */
export const createMockStats = (overrides?: Partial<{
  requests: number
  tokens_in: number
  tokens_out: number
  cost_total_usd: number
  uptime_seconds: number
}>) => {
  return {
    requests: 1000,
    tokens_in: 50000,
    tokens_out: 25000,
    cost_total_usd: 1.25,
    uptime_seconds: 3600,
    ...overrides
  }
}

/**
 * Creates mock trace data
 */
export const createMockTrace = (overrides?: Partial<{
  id: string
  ts: number
  model: string
  status: string
}>) => {
  return {
    id: generateTraceId(),
    ts: Date.now(),
    model: 'chat-default',
    status: 'completed',
    ...overrides
  }
}

/**
 * Creates mock tenant data
 */
export const createMockTenant = (overrides?: Partial<{
  id: string
  budget_usd: number
  spend_usd: number
  tokens_in: number
  tokens_out: number
  ring_size: number
}>) => {
  return {
    id: 'test-tenant',
    budget_usd: 5.0,
    spend_usd: 1.25,
    tokens_in: 1000,
    tokens_out: 500,
    ring_size: 10,
    ...overrides
  }
}

/**
 * Creates mock tenant record data
 */
export const createMockTenantRecord = (overrides?: Partial<{
  ts: number
  trace: string
  model: string
  prompt_tokens: number
  completion_tokens: number
  cost_usd: number
  status: string
}>) => {
  return {
    ts: Date.now(),
    trace: generateTraceId(),
    model: 'chat-default',
    prompt_tokens: 100,
    completion_tokens: 50,
    cost_usd: 0.01,
    status: 'completed',
    ...overrides
  }
}

/**
 * Creates mock chat completion request
 */
export const createMockChatRequest = (overrides?: Partial<{
  model: string
  messages: Array<{ role: string; content: string }>
  max_tokens: number
  temperature: number
  tenant: string
  stream: boolean
}>) => {
  return {
    model: 'chat-default',
    messages: [
      { role: 'user', content: 'Hello, world!' }
    ],
    max_tokens: 100,
    temperature: 0.7,
    tenant: 'public',
    stream: false,
    ...overrides
  }
}

/**
 * Creates mock chat completion response
 */
export const createMockChatResponse = (overrides?: Partial<{
  id: string
  model: string
  choices: Array<{
    index: number
    message: { role: string; content: string }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}>) => {
  return {
    id: `chatcmpl-${generateTestId()}`,
    object: 'chat.completion',
    created: Date.now(),
    model: 'chat-default',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: 'Hello! How can I help you today?'
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 8,
      total_tokens: 18
    },
    ...overrides
  }
}

/**
 * Creates mock OpenTelemetry span
 */
export const createMockSpan = () => {
  const mockSpanContext = {
    traceId: generateTraceId(),
    spanId: generateTraceId().substring(0, 16),
    traceFlags: 1
  }

  return {
    setAttribute: vi.fn(),
    setAttributes: vi.fn(),
    setStatus: vi.fn(),
    recordException: vi.fn(),
    end: vi.fn(),
    spanContext: vi.fn().mockReturnValue(mockSpanContext),
    updateName: vi.fn(),
    addEvent: vi.fn(),
    isRecording: vi.fn().mockReturnValue(true)
  }
}

/**
 * Creates mock OpenTelemetry tracer
 */
export const createMockTracer = () => {
  const mockSpan = createMockSpan()

  return {
    startSpan: vi.fn().mockReturnValue(mockSpan),
    startActiveSpan: vi.fn((name: string, fn: any) => {
      return fn(mockSpan)
    })
  }
}

/**
 * Waits for a condition to be true
 */
export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return
    }
    await delay(interval)
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`)
}

/**
 * Captures console output during test execution
 */
export const captureConsole = () => {
  const originalConsole = { ...console }
  const logs: string[] = []
  const errors: string[] = []
  const warnings: string[] = []

  console.log = vi.fn((...args) => {
    logs.push(args.join(' '))
  })

  console.error = vi.fn((...args) => {
    errors.push(args.join(' '))
  })

  console.warn = vi.fn((...args) => {
    warnings.push(args.join(' '))
  })

  return {
    logs,
    errors,
    warnings,
    restore: () => {
      console.log = originalConsole.log
      console.error = originalConsole.error
      console.warn = originalConsole.warn
    }
  }
}

/**
 * Creates a mock Express request
 */
export const createMockRequest = (overrides?: any) => {
  return {
    method: 'GET',
    url: '/',
    headers: {},
    body: {},
    params: {},
    query: {},
    ...overrides
  }
}

/**
 * Creates a mock Express response
 */
export const createMockExpressResponse = () => {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as any
  }

  res.status = vi.fn((code: number) => {
    res.statusCode = code
    return res
  })

  res.json = vi.fn((data: any) => {
    res.body = data
    return res
  })

  res.send = vi.fn((data: any) => {
    res.body = data
    return res
  })

  res.setHeader = vi.fn((name: string, value: string) => {
    res.headers[name.toLowerCase()] = value
    return res
  })

  res.getHeader = vi.fn((name: string) => {
    return res.headers[name.toLowerCase()]
  })

  res.write = vi.fn()
  res.end = vi.fn()
  res.writeHead = vi.fn()

  return res
}

/**
 * Generates random test data
 */
export const generateRandomData = {
  number: (min = 0, max = 1000): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min
  },

  string: (length = 10): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)]
    }
    return result
  },

  email: (): string => {
    return `test-${generateRandomData.string(8)}@example.com`
  },

  url: (): string => {
    return `https://example.com/${generateRandomData.string(8)}`
  },

  iso8601: (): string => {
    return new Date().toISOString()
  }
}

/**
 * Test data factories
 */
export const factories = {
  stats: createMockStats,
  trace: createMockTrace,
  tenant: createMockTenant,
  tenantRecord: createMockTenantRecord,
  chatRequest: createMockChatRequest,
  chatResponse: createMockChatResponse,
  span: createMockSpan,
  tracer: createMockTracer,
  request: createMockRequest,
  response: createMockExpressResponse
}

/**
 * Test assertions helpers
 */
export const assertions = {
  isValidUUID: (value: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(value)
  },

  isValidISO8601: (value: string): boolean => {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/
    return iso8601Regex.test(value)
  },

  isValidTraceId: (value: string): boolean => {
    return /^[0-9a-f]{32}$/i.test(value)
  },

  isPositiveNumber: (value: number): boolean => {
    return typeof value === 'number' && value >= 0 && !isNaN(value)
  }
}

export default {
  delay,
  mockResponse,
  mockErrorResponse,
  generateTestId,
  generateTraceId,
  waitFor,
  captureConsole,
  factories,
  assertions,
  generateRandomData
}
