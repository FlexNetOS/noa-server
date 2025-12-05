/**
 * Mock Implementations
 * Reusable mocks for external dependencies
 */

import { vi } from 'vitest'

/**
 * Mock Axios Instance
 */
export const createMockAxios = () => {
  const mockAxios: any = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    request: vi.fn(),
    defaults: {
      baseURL: '/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    },
    interceptors: {
      request: {
        use: vi.fn(),
        eject: vi.fn()
      },
      response: {
        use: vi.fn(),
        eject: vi.fn()
      }
    }
  }

  return mockAxios
}

/**
 * Mock Local Storage
 */
export const createMockLocalStorage = () => {
  const store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null)
  }
}

/**
 * Mock OpenTelemetry
 */
export const createMockOTel = () => {
  const mockSpan = {
    setAttribute: vi.fn(),
    setAttributes: vi.fn(),
    setStatus: vi.fn(),
    recordException: vi.fn(),
    end: vi.fn(),
    spanContext: vi.fn().mockReturnValue({
      traceId: '00000000000000000000000000000001',
      spanId: '0000000000000001',
      traceFlags: 1
    })
  }

  const mockTracer = {
    startSpan: vi.fn().mockReturnValue(mockSpan),
    startActiveSpan: vi.fn((name: string, fn: any) => fn(mockSpan))
  }

  return {
    trace: {
      getTracer: vi.fn().mockReturnValue(mockTracer)
    },
    SpanStatusCode: {
      OK: 0,
      ERROR: 2
    },
    mockSpan,
    mockTracer
  }
}

/**
 * Mock React Router
 */
export const createMockRouter = () => {
  return {
    useNavigate: vi.fn(() => vi.fn()),
    useLocation: vi.fn(() => ({
      pathname: '/',
      search: '',
      hash: '',
      state: null
    })),
    useParams: vi.fn(() => ({})),
    useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()])
  }
}

/**
 * Mock Zustand Store
 */
export const createMockStore = (initialState: any = {}) => {
  let state = { ...initialState }

  const mockStore = (selector?: (state: any) => any) => {
    if (selector) {
      return selector(state)
    }
    return state
  }

  mockStore.setState = vi.fn((updates: any) => {
    state = { ...state, ...updates }
  })

  mockStore.getState = vi.fn(() => state)

  mockStore.subscribe = vi.fn()

  return mockStore
}

/**
 * Mock WebSocket
 */
export const createMockWebSocket = () => {
  const mockWS: any = {
    readyState: 1, // OPEN
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null
  }

  // Helper to simulate receiving a message
  mockWS.simulateMessage = (data: any) => {
    const event = { data: JSON.stringify(data) }
    if (mockWS.onmessage) {
      mockWS.onmessage(event)
    }
  }

  // Helper to simulate connection open
  mockWS.simulateOpen = () => {
    mockWS.readyState = 1
    if (mockWS.onopen) {
      mockWS.onopen({})
    }
  }

  // Helper to simulate connection close
  mockWS.simulateClose = () => {
    mockWS.readyState = 3 // CLOSED
    if (mockWS.onclose) {
      mockWS.onclose({})
    }
  }

  return mockWS
}

/**
 * Mock Fetch API
 */
export const createMockFetch = () => {
  const mockFetch = vi.fn()

  mockFetch.mockResolvedValue = (data: any, status = 200) => {
    return mockFetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: new Headers({
        'content-type': 'application/json'
      }),
      json: async () => data,
      text: async () => JSON.stringify(data)
    })
  }

  mockFetch.mockRejectedValue = (error: Error) => {
    return mockFetch.mockRejectedValueOnce(error)
  }

  return mockFetch
}

/**
 * Mock Express App
 */
export const createMockExpressApp = () => {
  const routes: Record<string, Record<string, any>> = {}

  const app: any = {
    get: vi.fn((path: string, handler: any) => {
      if (!routes.GET) routes.GET = {}
      routes.GET[path] = handler
    }),
    post: vi.fn((path: string, handler: any) => {
      if (!routes.POST) routes.POST = {}
      routes.POST[path] = handler
    }),
    put: vi.fn((path: string, handler: any) => {
      if (!routes.PUT) routes.PUT = {}
      routes.PUT[path] = handler
    }),
    delete: vi.fn((path: string, handler: any) => {
      if (!routes.DELETE) routes.DELETE = {}
      routes.DELETE[path] = handler
    }),
    use: vi.fn(),
    listen: vi.fn((port: number, callback: () => void) => {
      if (callback) callback()
      return { close: vi.fn() }
    }),
    routes
  }

  return app
}

/**
 * Mock Database Client
 */
export const createMockDbClient = () => {
  const data: Record<string, any[]> = {}

  return {
    query: vi.fn(async (sql: string, params?: any[]) => {
      // Simple mock implementation
      return { rows: [], rowCount: 0 }
    }),
    collection: vi.fn((name: string) => ({
      find: vi.fn(() => ({
        toArray: async () => data[name] || []
      })),
      insertOne: vi.fn(async (doc: any) => {
        if (!data[name]) data[name] = []
        data[name].push(doc)
        return { insertedId: Math.random().toString() }
      }),
      updateOne: vi.fn(async () => ({ modifiedCount: 1 })),
      deleteOne: vi.fn(async () => ({ deletedCount: 1 }))
    })),
    close: vi.fn()
  }
}

/**
 * Mock Environment Variables
 */
export const createMockEnv = (vars: Record<string, string> = {}) => {
  const originalEnv = { ...process.env }

  Object.keys(vars).forEach(key => {
    process.env[key] = vars[key]
  })

  return {
    restore: () => {
      process.env = originalEnv
    }
  }
}

/**
 * Mock File System
 */
export const createMockFs = () => {
  const files: Record<string, string> = {}

  return {
    readFile: vi.fn(async (path: string) => files[path] || ''),
    writeFile: vi.fn(async (path: string, content: string) => {
      files[path] = content
    }),
    unlink: vi.fn(async (path: string) => {
      delete files[path]
    }),
    exists: vi.fn(async (path: string) => path in files),
    readdir: vi.fn(async () => Object.keys(files)),
    files
  }
}

/**
 * Mock Timer Functions
 */
export const createMockTimers = () => {
  return {
    setTimeout: vi.fn((callback: () => void, ms: number) => {
      return setTimeout(callback, ms)
    }),
    clearTimeout: vi.fn((id: any) => {
      clearTimeout(id)
    }),
    setInterval: vi.fn((callback: () => void, ms: number) => {
      return setInterval(callback, ms)
    }),
    clearInterval: vi.fn((id: any) => {
      clearInterval(id)
    })
  }
}

/**
 * Mock Logger
 */
export const createMockLogger = () => {
  const logs: Array<{ level: string; message: string; meta?: any }> = []

  const logger = {
    info: vi.fn((message: string, meta?: any) => {
      logs.push({ level: 'info', message, meta })
    }),
    warn: vi.fn((message: string, meta?: any) => {
      logs.push({ level: 'warn', message, meta })
    }),
    error: vi.fn((message: string, meta?: any) => {
      logs.push({ level: 'error', message, meta })
    }),
    debug: vi.fn((message: string, meta?: any) => {
      logs.push({ level: 'debug', message, meta })
    }),
    logs
  }

  return logger
}

export default {
  createMockAxios,
  createMockLocalStorage,
  createMockOTel,
  createMockRouter,
  createMockStore,
  createMockWebSocket,
  createMockFetch,
  createMockExpressApp,
  createMockDbClient,
  createMockEnv,
  createMockFs,
  createMockTimers,
  createMockLogger
}
