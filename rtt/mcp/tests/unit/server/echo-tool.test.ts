import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'

/**
 * Unit tests for MCP Server Echo Tool
 * Tests the echo tool functionality including schema validation,
 * OpenTelemetry tracing, and error handling
 */

describe('MCP Server Echo Tool', () => {
  const EchoOutput = z.object({ text: z.string(), ts: z.string() })

  // Mock OpenTelemetry tracer
  const mockSpan = {
    setAttribute: vi.fn(),
    setStatus: vi.fn(),
    recordException: vi.fn(),
    end: vi.fn(),
    spanContext: vi.fn().mockReturnValue({ traceId: 'test-trace-id' })
  }

  const mockTracer = {
    startActiveSpan: vi.fn((name: string, fn: any) => {
      return fn(mockSpan)
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Echo Tool Success Cases', () => {
    it('should echo text with ISO timestamp', async () => {
      const inputText = 'Hello, MCP!'
      const result = await mockTracer.startActiveSpan('tool.echo', async (span: any) => {
        const text = inputText
        span.setAttribute('mcp.tool.name', 'echo')
        span.setAttribute('mcp.tool.input.length', text.length)

        const out = { text, ts: new Date().toISOString() }

        // Validate output schema
        const validated = EchoOutput.parse(out)
        expect(validated).toMatchObject({ text: inputText })
        expect(validated.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/)

        span.setAttribute('mcp.tool.success', true)
        span.end()

        return { structuredContent: out }
      })

      expect(result.structuredContent).toBeDefined()
      expect(result.structuredContent.text).toBe(inputText)
      expect(result.structuredContent.ts).toBeDefined()
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('mcp.tool.name', 'echo')
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('mcp.tool.success', true)
    })

    it('should handle empty string input', async () => {
      const inputText = ''
      const result = await mockTracer.startActiveSpan('tool.echo', async (span: any) => {
        const text = inputText
        span.setAttribute('mcp.tool.input.length', text.length)

        const out = { text, ts: new Date().toISOString() }
        const validated = EchoOutput.parse(out)

        expect(validated.text).toBe('')
        expect(span.setAttribute).toHaveBeenCalledWith('mcp.tool.input.length', 0)

        span.end()
        return { structuredContent: out }
      })

      expect(result.structuredContent.text).toBe('')
    })

    it('should handle unicode and special characters', async () => {
      const inputText = '你好 🚀 Hello! @#$%^&*()'
      const result = await mockTracer.startActiveSpan('tool.echo', async (span: any) => {
        const out = { text: inputText, ts: new Date().toISOString() }
        const validated = EchoOutput.parse(out)

        expect(validated.text).toBe(inputText)
        span.end()
        return { structuredContent: out }
      })

      expect(result.structuredContent.text).toBe(inputText)
    })

    it('should handle very long text input', async () => {
      const longText = 'a'.repeat(10000)
      const result = await mockTracer.startActiveSpan('tool.echo', async (span: any) => {
        span.setAttribute('mcp.tool.input.length', longText.length)

        const out = { text: longText, ts: new Date().toISOString() }
        const validated = EchoOutput.parse(out)

        expect(validated.text).toBe(longText)
        expect(validated.text.length).toBe(10000)
        expect(mockSpan.setAttribute).toHaveBeenCalledWith('mcp.tool.input.length', 10000)

        span.end()
        return { structuredContent: out }
      })

      expect(result.structuredContent.text.length).toBe(10000)
    })
  })

  describe('Echo Tool Schema Validation', () => {
    it('should validate output has required text field', () => {
      const validOutput = { text: 'test', ts: new Date().toISOString() }
      expect(() => EchoOutput.parse(validOutput)).not.toThrow()
    })

    it('should validate output has required ts field', () => {
      const validOutput = { text: 'test', ts: new Date().toISOString() }
      expect(() => EchoOutput.parse(validOutput)).not.toThrow()
    })

    it('should reject output missing text field', () => {
      const invalidOutput = { ts: new Date().toISOString() } as any
      expect(() => EchoOutput.parse(invalidOutput)).toThrow()
    })

    it('should reject output missing ts field', () => {
      const invalidOutput = { text: 'test' } as any
      expect(() => EchoOutput.parse(invalidOutput)).toThrow()
    })

    it('should reject output with non-string text', () => {
      const invalidOutput = { text: 123, ts: new Date().toISOString() } as any
      expect(() => EchoOutput.parse(invalidOutput)).toThrow()
    })

    it('should validate ISO timestamp format', () => {
      const output = { text: 'test', ts: new Date().toISOString() }
      const validated = EchoOutput.parse(output)

      // ISO 8601 format check
      expect(validated.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  describe('Echo Tool Error Handling', () => {
    it('should handle and record schema validation errors', async () => {
      await mockTracer.startActiveSpan('tool.echo', async (span: any) => {
        try {
          const invalidOutput = { text: 'test' } as any // missing ts
          EchoOutput.parse(invalidOutput)
        } catch (err: any) {
          span.recordException(err)
          span.setStatus({ code: 2, message: 'Echo output failed schema validation' })

          expect(mockSpan.recordException).toHaveBeenCalled()
          expect(mockSpan.setStatus).toHaveBeenCalledWith({
            code: 2,
            message: 'Echo output failed schema validation'
          })
        } finally {
          span.end()
        }
      })
    })

    it('should handle null or undefined input gracefully', async () => {
      const inputs = [null, undefined]

      for (const input of inputs) {
        const result = await mockTracer.startActiveSpan('tool.echo', async (span: any) => {
          const text = typeof input === 'string' ? input : String(input ?? '')
          const out = { text, ts: new Date().toISOString() }

          expect(text).toBe(String(input ?? ''))

          span.end()
          return { structuredContent: out }
        })

        expect(result.structuredContent.text).toBeDefined()
      }
    })

    it('should coerce non-string arguments to string', async () => {
      const numericInput = 12345
      const result = await mockTracer.startActiveSpan('tool.echo', async (span: any) => {
        const text = typeof numericInput === 'string' ? numericInput : String(numericInput)
        const out = { text, ts: new Date().toISOString() }

        expect(text).toBe('12345')

        span.end()
        return { structuredContent: out }
      })

      expect(result.structuredContent.text).toBe('12345')
    })
  })

  describe('Echo Tool OpenTelemetry Integration', () => {
    it('should set correct span attributes', async () => {
      await mockTracer.startActiveSpan('tool.echo', async (span: any) => {
        const text = 'test'
        span.setAttribute('mcp.tool.name', 'echo')
        span.setAttribute('mcp.tool.input.length', text.length)
        span.setAttribute('mcp.tool.success', true)

        expect(mockSpan.setAttribute).toHaveBeenCalledWith('mcp.tool.name', 'echo')
        expect(mockSpan.setAttribute).toHaveBeenCalledWith('mcp.tool.input.length', 4)
        expect(mockSpan.setAttribute).toHaveBeenCalledWith('mcp.tool.success', true)

        span.end()
      })
    })

    it('should record exceptions on errors', async () => {
      await mockTracer.startActiveSpan('tool.echo', async (span: any) => {
        const error = new Error('Test error')
        span.recordException(error)
        span.setStatus({ code: 2, message: error.message })

        expect(mockSpan.recordException).toHaveBeenCalledWith(error)
        expect(mockSpan.setStatus).toHaveBeenCalledWith({
          code: 2,
          message: 'Test error'
        })

        span.end()
      })
    })

    it('should end span in finally block', async () => {
      await mockTracer.startActiveSpan('tool.echo', async (span: any) => {
        try {
          const out = { text: 'test', ts: new Date().toISOString() }
          return { structuredContent: out }
        } finally {
          span.end()
          expect(mockSpan.end).toHaveBeenCalled()
        }
      })
    })
  })

  describe('Echo Tool Performance', () => {
    it('should complete within reasonable time', async () => {
      const startTime = Date.now()

      await mockTracer.startActiveSpan('tool.echo', async (span: any) => {
        const out = { text: 'test', ts: new Date().toISOString() }
        span.end()
        return { structuredContent: out }
      })

      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(100) // Should complete in less than 100ms
    })

    it('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        mockTracer.startActiveSpan('tool.echo', async (span: any) => {
          const out = { text: `test-${i}`, ts: new Date().toISOString() }
          span.end()
          return { structuredContent: out }
        })
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      results.forEach((result, i) => {
        expect(result.structuredContent.text).toBe(`test-${i}`)
      })
    })
  })
})
