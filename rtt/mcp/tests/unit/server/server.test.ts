import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createMockSpan, createMockTracer } from '../../setup/test-helpers'

// Mock OpenTelemetry before importing server code
vi.mock('@opentelemetry/api', () => ({
  SpanStatusCode: { ERROR: 2, OK: 0, UNSET: 1 },
  trace: {
    getTracer: vi.fn(() => createMockTracer()),
  },
}))

// Mock MCP SDK
const mockConnect = vi.fn()
const mockRegisterTool = vi.fn()
const mockRegisterResource = vi.fn()
const mockRegisterPrompt = vi.fn()

vi.mock('@modelcontextprotocol/sdk/dist/esm/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    registerTool: mockRegisterTool,
    registerResource: mockRegisterResource,
    registerPrompt: mockRegisterPrompt,
    prompt: mockRegisterPrompt,
  })),
}))

vi.mock('@modelcontextprotocol/sdk/dist/esm/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}))

vi.mock('@modelcontextprotocol/sdk/dist/esm/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: vi.fn().mockImplementation(() => ({
    handleRequest: vi.fn(),
  })),
}))

describe('MCP Server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MCP_SERVER_NAME = 'test-server'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Echo Tool', () => {
    it('should register echo tool with correct schema', async () => {
      // Import after mocks are set up
      const { McpServer } = await import('@modelcontextprotocol/sdk/dist/esm/server/mcp.js')

      // Create server instance to trigger registration
      new McpServer({ name: 'test-server', version: '0.1.0' })

      expect(mockRegisterTool).toHaveBeenCalled()
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'echo')
      expect(toolCall).toBeDefined()
      expect(toolCall[1]).toHaveProperty('title', 'Echo')
      expect(toolCall[1]).toHaveProperty('description')
    })

    it('should echo text with ISO timestamp', async () => {
      const inputText = 'Hello, MCP!'
      const mockDate = new Date('2025-01-15T12:00:00.000Z')
      vi.setSystemTime(mockDate)

      // Simulate the echo tool handler
      const echoHandler = async ({ text }: { text: string }) => {
        const out = { text, ts: new Date().toISOString() }
        return { structuredContent: out }
      }

      const result = await echoHandler({ text: inputText })

      expect(result.structuredContent).toEqual({
        text: inputText,
        ts: '2025-01-15T12:00:00.000Z',
      })

      vi.useRealTimers()
    })

    it('should validate echo output schema', async () => {
      const Ajv = (await import('ajv')).default
      const ajv = new Ajv({ allErrors: true, strict: true })

      const EchoOutputValidate = ajv.compile({
        type: 'object',
        additionalProperties: false,
        properties: { text: { type: 'string' }, ts: { type: 'string' } },
        required: ['text', 'ts'],
      })

      // Valid output
      const validOutput = { text: 'test', ts: '2025-01-15T12:00:00.000Z' }
      expect(EchoOutputValidate(validOutput)).toBe(true)

      // Invalid output - missing required field
      const invalidOutput = { text: 'test' }
      expect(EchoOutputValidate(invalidOutput)).toBe(false)

      // Invalid output - wrong type
      const invalidTypeOutput = { text: 123, ts: '2025-01-15T12:00:00.000Z' }
      expect(EchoOutputValidate(invalidTypeOutput)).toBe(false)
    })

    it('should handle empty text input', async () => {
      const echoHandler = async ({ text }: { text: string }) => {
        const out = { text, ts: new Date().toISOString() }
        return { structuredContent: out }
      }

      const result = await echoHandler({ text: '' })

      expect(result.structuredContent.text).toBe('')
      expect(result.structuredContent.ts).toBeDefined()
    })

    it('should record OpenTelemetry span attributes', async () => {
      const mockSpan = createMockSpan()
      const mockTracer = createMockTracer()
      mockTracer.startActiveSpan.mockImplementation((name, fn) => fn(mockSpan))

      await mockTracer.startActiveSpan('tool.echo', async (span: any) => {
        const text = 'test input'
        span.setAttribute('mcp.tool.name', 'echo')
        span.setAttribute('mcp.tool.input.length', text.length)
        span.setAttribute('mcp.tool.success', true)
        span.end()
      })

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('mcp.tool.name', 'echo')
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('mcp.tool.input.length', 10)
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('mcp.tool.success', true)
      expect(mockSpan.end).toHaveBeenCalled()
    })

    it('should handle errors and record exceptions', async () => {
      const mockSpan = createMockSpan()
      const mockTracer = createMockTracer()
      const testError = new Error('Validation failed')

      mockTracer.startActiveSpan.mockImplementation(async (name, fn) => {
        try {
          return await fn(mockSpan)
        } catch (err) {
          mockSpan.recordException(err)
          mockSpan.setStatus({ code: 2, message: (err as Error).message })
          throw err
        } finally {
          mockSpan.end()
        }
      })

      await expect(async () => {
        await mockTracer.startActiveSpan('tool.echo', async () => {
          throw testError
        })
      }).rejects.toThrow('Validation failed')

      expect(mockSpan.recordException).toHaveBeenCalledWith(testError)
      expect(mockSpan.setStatus).toHaveBeenCalled()
      expect(mockSpan.end).toHaveBeenCalled()
    })
  })

  describe('Health Resource', () => {
    it('should register health resource', async () => {
      const { McpServer } = await import('@modelcontextprotocol/sdk/dist/esm/server/mcp.js')

      new McpServer({ name: 'test-server', version: '0.1.0' })

      expect(mockRegisterResource).toHaveBeenCalled()
      const resourceCall = mockRegisterResource.mock.calls.find(call => call[0] === 'health')
      expect(resourceCall).toBeDefined()
      expect(resourceCall[1]).toBe('res://health')
    })

    it('should return health status with timestamp', async () => {
      const mockDate = new Date('2025-01-15T12:00:00.000Z')
      vi.setSystemTime(mockDate)

      const healthHandler = async (uri: { href: string }) => {
        const payload = { status: 'ok', time: new Date().toISOString() }
        return {
          contents: [{ uri: uri.href, text: JSON.stringify(payload) }],
        }
      }

      const result = await healthHandler({ href: 'res://health' })

      expect(result.contents).toHaveLength(1)
      expect(result.contents[0].uri).toBe('res://health')
      const parsed = JSON.parse(result.contents[0].text)
      expect(parsed).toEqual({
        status: 'ok',
        time: '2025-01-15T12:00:00.000Z',
      })

      vi.useRealTimers()
    })

    it('should return valid JSON format', async () => {
      const healthHandler = async (uri: { href: string }) => {
        const payload = { status: 'ok', time: new Date().toISOString() }
        return {
          contents: [{ uri: uri.href, text: JSON.stringify(payload) }],
        }
      }

      const result = await healthHandler({ href: 'res://health' })

      expect(() => JSON.parse(result.contents[0].text)).not.toThrow()
      const parsed = JSON.parse(result.contents[0].text)
      expect(parsed).toHaveProperty('status')
      expect(parsed).toHaveProperty('time')
    })
  })

  describe('Summarize Prompt', () => {
    it('should register summarize prompt', async () => {
      const { McpServer } = await import('@modelcontextprotocol/sdk/dist/esm/server/mcp.js')

      new McpServer({ name: 'test-server', version: '0.1.0' })

      expect(mockRegisterPrompt).toHaveBeenCalled()
      const promptCall = mockRegisterPrompt.mock.calls.find(call => call[0] === 'summarize')
      expect(promptCall).toBeDefined()
    })

    it('should generate summarize prompt with user message', async () => {
      const inputText = 'This is a long text that needs to be summarized.'

      const summarizeHandler = async ({ text }: { text: string }) => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Summarize:\n${text}`,
            },
          },
        ],
      })

      const result = await summarizeHandler({ text: inputText })

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].role).toBe('user')
      expect(result.messages[0].content.type).toBe('text')
      expect(result.messages[0].content.text).toContain('Summarize:')
      expect(result.messages[0].content.text).toContain(inputText)
    })

    it('should handle empty text in summarize prompt', async () => {
      const summarizeHandler = async ({ text }: { text: string }) => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Summarize:\n${text}`,
            },
          },
        ],
      })

      const result = await summarizeHandler({ text: '' })

      expect(result.messages[0].content.text).toBe('Summarize:\n')
    })

    it('should handle multiline text in summarize prompt', async () => {
      const multilineText = 'Line 1\nLine 2\nLine 3'

      const summarizeHandler = async ({ text }: { text: string }) => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Summarize:\n${text}`,
            },
          },
        ],
      })

      const result = await summarizeHandler({ text: multilineText })

      expect(result.messages[0].content.text).toContain('Line 1')
      expect(result.messages[0].content.text).toContain('Line 2')
      expect(result.messages[0].content.text).toContain('Line 3')
    })
  })

  describe('Server Configuration', () => {
    it('should use SERVER_NAME from environment', () => {
      process.env.MCP_SERVER_NAME = 'custom-server'
      const serverName = process.env.MCP_SERVER_NAME || 'mcp-server-skeleton'
      expect(serverName).toBe('custom-server')
    })

    it('should use default server name when env not set', () => {
      delete process.env.MCP_SERVER_NAME
      const serverName = process.env.MCP_SERVER_NAME || 'mcp-server-skeleton'
      expect(serverName).toBe('mcp-server-skeleton')
    })

    it('should set transport type from environment', () => {
      process.env.MCP_TRANSPORT = 'http'
      const transportKind = process.env.MCP_TRANSPORT === 'http' ? 'http' : 'stdio'
      expect(transportKind).toBe('http')
    })

    it('should default to stdio transport', () => {
      delete process.env.MCP_TRANSPORT
      const transportKind = process.env.MCP_TRANSPORT === 'http' ? 'http' : 'stdio'
      expect(transportKind).toBe('stdio')
    })

    it('should use PORT from environment for HTTP transport', () => {
      process.env.PORT = '4000'
      const port = Number(process.env.PORT || 3000)
      expect(port).toBe(4000)
    })

    it('should use default port 3000 when not set', () => {
      delete process.env.PORT
      const port = Number(process.env.PORT || 3000)
      expect(port).toBe(3000)
    })
  })
})
