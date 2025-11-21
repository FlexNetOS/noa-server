import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'

// Mock environment variables
beforeAll(() => {
  process.env.NODE_ENV = 'test'
  process.env.MCP_SERVER_NAME = 'test-server'
  process.env.PORT = '3001'
  process.env.OPENROUTER_API_KEY = 'test-api-key'
  process.env.OPENAI_BASE = 'http://localhost:8080'
  process.env.LLAMA_CPP_BASE = 'http://localhost:8081'
})

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})

// Cleanup after each test
afterEach(() => {
  vi.restoreAllMocks()
})

// Global teardown
afterAll(() => {
  vi.clearAllTimers()
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: console.error, // Keep error for debugging
}
