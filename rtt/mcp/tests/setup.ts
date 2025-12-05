import { beforeAll, afterAll, afterEach, vi } from 'vitest'

// Mock environment variables
beforeAll(() => {
  process.env.MCP_SERVER_NAME = 'test-server'
  process.env.MCP_TRANSPORT = 'http'
  process.env.PORT = '3001'
  process.env.OPENAI_BASE = 'https://api.openai.com/v1'
  process.env.OPENROUTER_API_KEY = 'test-key'
  process.env.LLAMA_CPP_BASE = 'http://localhost:8081'
})

// Clean up after all tests
afterAll(() => {
  vi.restoreAllMocks()
})

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks()
})

// Global test utilities
global.testUtils = {
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  mockResponse: (data: any) => ({
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    status: 200,
    ok: true
  })
}

declare global {
  var testUtils: {
    delay: (ms: number) => Promise<void>
    mockResponse: (data: any) => any
  }
}
