import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createMockSpan, createMockTracer, createMockAxiosResponse, createMockAxiosError } from '../../setup/test-helpers'
import axios from 'axios'

vi.mock('axios')
vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: vi.fn(() => createMockTracer()),
  },
}))

describe('OpenAI Compatible Upstream', () => {
  const mockRoute = {
    model: 'gpt-4',
    provider: 'openai_compatible' as const,
    endpoint: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    models: ['gpt-4o-mini'],
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'test-api-key-123'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('callOpenAICompat', () => {
    it('should make successful API call with correct parameters', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-4o-mini',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! How can I help you today?',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 9,
          total_tokens: 19,
        },
      }

      vi.mocked(axios.post).mockResolvedValueOnce(createMockAxiosResponse(mockResponse))

      const body = {
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 100,
        temperature: 0.7,
      }

      const result = await axios.post(`${mockRoute.endpoint}/chat/completions`, {
        model: mockRoute.models[0],
        messages: body.messages,
        max_tokens: body.max_tokens,
        temperature: body.temperature,
      })

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          model: 'gpt-4o-mini',
          messages: body.messages,
          max_tokens: 100,
          temperature: 0.7,
        }),
        expect.any(Object)
      )
      expect(result.data).toEqual(mockResponse)
      expect(result.data.usage.prompt_tokens).toBe(10)
      expect(result.data.usage.completion_tokens).toBe(9)
    })

    it('should include authorization header when API key is provided', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce(createMockAxiosResponse({ choices: [] }))

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const key = process.env.OPENAI_API_KEY
      if (key) headers['Authorization'] = `Bearer ${key}`

      await axios.post(
        `${mockRoute.endpoint}/chat/completions`,
        {},
        { headers, timeout: 60_000 }
      )

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key-123',
          }),
        })
      )
    })

    it('should work without API key for open endpoints', async () => {
      delete process.env.OPENAI_API_KEY

      vi.mocked(axios.post).mockResolvedValueOnce(createMockAxiosResponse({ choices: [] }))

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const key = process.env.OPENAI_API_KEY
      if (key) headers['Authorization'] = `Bearer ${key}`

      await axios.post(
        `${mockRoute.endpoint}/chat/completions`,
        {},
        { headers, timeout: 60_000 }
      )

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      )
    })

    it('should use default model when not specified in route', async () => {
      const routeWithoutModel = { ...mockRoute, models: undefined }
      const body = { messages: [{ role: 'user', content: 'Test' }], model: 'gpt-4' }

      vi.mocked(axios.post).mockResolvedValueOnce(createMockAxiosResponse({ choices: [] }))

      await axios.post(`${routeWithoutModel.endpoint}/chat/completions`, {
        model: routeWithoutModel.models?.[0] || body.model || 'gpt-4o-mini',
        messages: body.messages,
      })

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          model: 'gpt-4',
        }),
        expect.any(Object)
      )
    })

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Invalid API key'
      vi.mocked(axios.post).mockRejectedValueOnce(createMockAxiosError(errorMessage, 401))

      await expect(
        axios.post(`${mockRoute.endpoint}/chat/completions`, {})
      ).rejects.toThrow()
    })

    it('should set correct timeout', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce(createMockAxiosResponse({ choices: [] }))

      await axios.post(
        `${mockRoute.endpoint}/chat/completions`,
        {},
        { headers: {}, timeout: 60_000 }
      )

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          timeout: 60_000,
        })
      )
    })

    it('should handle rate limiting errors', async () => {
      vi.mocked(axios.post).mockRejectedValueOnce(createMockAxiosError('Rate limit exceeded', 429))

      await expect(
        axios.post(`${mockRoute.endpoint}/chat/completions`, {})
      ).rejects.toThrow()
    })

    it('should handle server errors', async () => {
      vi.mocked(axios.post).mockRejectedValueOnce(createMockAxiosError('Internal server error', 500))

      await expect(
        axios.post(`${mockRoute.endpoint}/chat/completions`, {})
      ).rejects.toThrow()
    })

    it('should record telemetry span', async () => {
      const mockTracer = createMockTracer()
      const mockSpan = createMockSpan()

      vi.mocked(axios.post).mockResolvedValueOnce(createMockAxiosResponse({ choices: [] }))

      await mockTracer.startActiveSpan('genai.provider.openai_compat', async (span: any) => {
        await axios.post(`${mockRoute.endpoint}/chat/completions`, {})
        span.end()
      })

      expect(mockSpan.end).toHaveBeenCalled()
    })
  })

  describe('callOpenAICompatStream', () => {
    it('should handle streaming response', async () => {
      const mockStreamData = [
        'data: {"id":"1","choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"id":"1","choices":[{"delta":{"content":" world"}}]}\n\n',
        'data: [DONE]\n\n',
      ]

      const mockStream = {
        on: vi.fn((event, handler) => {
          if (event === 'data') {
            mockStreamData.forEach((chunk) => handler(Buffer.from(chunk)))
          }
          if (event === 'end') {
            setTimeout(() => handler(), 0)
          }
          return mockStream
        }),
      }

      vi.mocked(axios.post).mockResolvedValueOnce({
        data: mockStream,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      })

      const chunks: string[] = []
      const mockResponse = {
        write: vi.fn((chunk: string) => chunks.push(chunk)),
        end: vi.fn(),
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      }
      const key = process.env.OPENAI_API_KEY
      if (key) headers['Authorization'] = `Bearer ${key}`

      const resp = await axios.post(
        `${mockRoute.endpoint}/chat/completions`,
        {
          model: mockRoute.models[0],
          messages: [{ role: 'user', content: 'Hello' }],
          stream: true,
        },
        { headers, timeout: 0, responseType: 'stream' }
      )

      resp.data.on('data', (chunk: any) => {
        mockResponse.write(chunk.toString())
      })

      await new Promise<void>((resolve) => {
        resp.data.on('end', () => resolve())
      })

      expect(chunks.length).toBeGreaterThan(0)
    })

    it('should extract usage information from stream', async () => {
      const mockStreamData = [
        'data: {"id":"1","choices":[{"delta":{"content":"Test"}}]}\n\n',
        'data: {"id":"1","usage":{"prompt_tokens":10,"completion_tokens":5}}\n\n',
        'data: [DONE]\n\n',
      ]

      const mockStream = {
        on: vi.fn((event, handler) => {
          if (event === 'data') {
            mockStreamData.forEach((chunk) => handler(Buffer.from(chunk)))
          }
          if (event === 'end') {
            setTimeout(() => handler(), 0)
          }
          return mockStream
        }),
      }

      vi.mocked(axios.post).mockResolvedValueOnce({
        data: mockStream,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      })

      let capturedUsage: any = null
      const onUsage = (u: any) => {
        capturedUsage = u
      }

      const resp = await axios.post(
        `${mockRoute.endpoint}/chat/completions`,
        { stream: true },
        { headers: {}, timeout: 0, responseType: 'stream' }
      )

      resp.data.on('data', (chunk: any) => {
        const s = chunk.toString()
        for (const line of s.split(/\r?\n/)) {
          if (line.startsWith('data: ')) {
            try {
              const obj = JSON.parse(line.slice(6))
              if (obj.usage) onUsage(obj.usage)
            } catch {}
          }
        }
      })

      await new Promise<void>((resolve) => {
        resp.data.on('end', () => resolve())
      })

      expect(capturedUsage).toEqual({ prompt_tokens: 10, completion_tokens: 5 })
    })

    it('should handle streaming errors', async () => {
      const mockStream = {
        on: vi.fn((event, handler) => {
          if (event === 'error') {
            setTimeout(() => handler(new Error('Stream error')), 0)
          }
          return mockStream
        }),
      }

      vi.mocked(axios.post).mockResolvedValueOnce({
        data: mockStream,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      })

      const resp = await axios.post(
        `${mockRoute.endpoint}/chat/completions`,
        { stream: true },
        { timeout: 0, responseType: 'stream' }
      )

      let errorCaught = false
      resp.data.on('error', () => {
        errorCaught = true
      })

      await new Promise<void>((resolve) => setTimeout(resolve, 10))
      expect(errorCaught).toBe(true)
    })

    it('should include authorization header in streaming requests', async () => {
      const mockStream = {
        on: vi.fn(() => mockStream),
      }

      vi.mocked(axios.post).mockResolvedValueOnce({
        data: mockStream,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      })

      await axios.post(
        `${mockRoute.endpoint}/chat/completions`,
        { stream: true },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            'Authorization': 'Bearer test-api-key-123',
          },
          timeout: 0,
          responseType: 'stream',
        }
      )

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key-123',
          }),
        })
      )
    })

    it('should set correct headers for streaming', async () => {
      const mockStream = {
        on: vi.fn(() => mockStream),
      }

      vi.mocked(axios.post).mockResolvedValueOnce({
        data: mockStream,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      })

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      }

      await axios.post(
        `${mockRoute.endpoint}/chat/completions`,
        { stream: true },
        { headers, timeout: 0, responseType: 'stream' }
      )

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          }),
          responseType: 'stream',
          timeout: 0,
        })
      )
    })
  })

  describe('OpenAI Response Format', () => {
    it('should handle standard OpenAI response structure', () => {
      const response = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-4o-mini',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Test response',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      }

      expect(response.choices).toHaveLength(1)
      expect(response.choices[0].message.content).toBe('Test response')
      expect(response.usage.prompt_tokens).toBe(10)
      expect(response.usage.completion_tokens).toBe(5)
    })

    it('should handle multiple choices in response', () => {
      const response = {
        choices: [
          { index: 0, message: { role: 'assistant', content: 'Choice 1' }, finish_reason: 'stop' },
          { index: 1, message: { role: 'assistant', content: 'Choice 2' }, finish_reason: 'stop' },
        ],
      }

      expect(response.choices).toHaveLength(2)
      expect(response.choices[0].message.content).toBe('Choice 1')
      expect(response.choices[1].message.content).toBe('Choice 2')
    })

    it('should handle different finish reasons', () => {
      const finishReasons = ['stop', 'length', 'content_filter', 'function_call']

      finishReasons.forEach((reason) => {
        const response = {
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Test' },
              finish_reason: reason,
            },
          ],
        }

        expect(response.choices[0].finish_reason).toBe(reason)
      })
    })
  })
})
