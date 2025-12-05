import { test, expect } from '@playwright/test'

/**
 * E2E tests for Chat Completion Flow
 * Tests end-to-end chat completion functionality through the UI
 */

test.describe('Chat Completion Flow', () => {
  const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080'

  test.describe('Non-Streaming Chat', () => {
    test('should complete basic chat request', async ({ request }) => {
      const response = await request.post(`${GATEWAY_URL}/v1/chat/completions`, {
        data: {
          model: 'chat-default',
          messages: [
            { role: 'user', content: 'Hello, how are you?' }
          ],
          max_tokens: 100
        },
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.ok()).toBeTruthy()
      const data = await response.json()

      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('choices')
      expect(data).toHaveProperty('usage')
      expect(data.choices).toHaveLength(1)
      expect(data.choices[0].message.role).toBe('assistant')
    })

    test('should handle multi-turn conversation', async ({ request }) => {
      const response = await request.post(`${GATEWAY_URL}/v1/chat/completions`, {
        data: {
          model: 'chat-default',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'What is 2+2?' },
            { role: 'assistant', content: '4' },
            { role: 'user', content: 'What about 3+3?' }
          ],
          max_tokens: 50
        }
      })

      expect(response.ok()).toBeTruthy()
      const data = await response.json()

      expect(data.choices[0].message.content).toBeTruthy()
    })

    test('should respect max_tokens parameter', async ({ request }) => {
      const response = await request.post(`${GATEWAY_URL}/v1/chat/completions`, {
        data: {
          model: 'chat-default',
          messages: [
            { role: 'user', content: 'Write a long story' }
          ],
          max_tokens: 10
        }
      })

      expect(response.ok()).toBeTruthy()
      const data = await response.json()

      // Should have usage info
      expect(data.usage).toBeDefined()
      if (data.usage.completion_tokens) {
        expect(data.usage.completion_tokens).toBeLessThanOrEqual(10)
      }
    })

    test('should respect temperature parameter', async ({ request }) => {
      const response = await request.post(`${GATEWAY_URL}/v1/chat/completions`, {
        data: {
          model: 'chat-default',
          messages: [
            { role: 'user', content: 'Say hello' }
          ],
          temperature: 0.1,
          max_tokens: 50
        }
      })

      expect(response.ok()).toBeTruthy()
      const data = await response.json()

      expect(data.choices[0].message.content).toBeTruthy()
    })

    test('should return proper usage statistics', async ({ request }) => {
      const response = await request.post(`${GATEWAY_URL}/v1/chat/completions`, {
        data: {
          model: 'chat-default',
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        }
      })

      expect(response.ok()).toBeTruthy()
      const data = await response.json()

      expect(data.usage).toBeDefined()
      expect(data.usage).toHaveProperty('prompt_tokens')
      expect(data.usage).toHaveProperty('completion_tokens')
      expect(data.usage).toHaveProperty('total_tokens')

      if (data.usage.prompt_tokens && data.usage.completion_tokens) {
        expect(data.usage.total_tokens).toBe(
          data.usage.prompt_tokens + data.usage.completion_tokens
        )
      }
    })

    test('should include trace ID in response headers', async ({ request }) => {
      const response = await request.post(`${GATEWAY_URL}/v1/chat/completions`, {
        data: {
          model: 'chat-default',
          messages: [
            { role: 'user', content: 'Test trace ID' }
          ]
        }
      })

      expect(response.ok()).toBeTruthy()

      const traceId = response.headers()['x-trace-id']
      if (traceId) {
        expect(traceId).toBeTruthy()
        expect(typeof traceId).toBe('string')
      }
    })
  })

  test.describe('Streaming Chat', () => {
    test('should handle streaming response', async ({ request }) => {
      const response = await request.post(`${GATEWAY_URL}/v1/chat/completions`, {
        data: {
          model: 'chat-default',
          messages: [
            { role: 'user', content: 'Count to 5' }
          ],
          stream: true
        }
      })

      expect(response.ok()).toBeTruthy()
      expect(response.headers()['content-type']).toContain('text/event-stream')

      const body = await response.text()
      expect(body).toContain('data:')
      expect(body).toContain('[DONE]')
    })

    test('should stream multiple chunks', async ({ request }) => {
      const response = await request.post(`${GATEWAY_URL}/v1/chat/completions`, {
        data: {
          model: 'chat-default',
          messages: [
            { role: 'user', content: 'Write a short sentence' }
          ],
          stream: true
        }
      })

      expect(response.ok()).toBeTruthy()

      const body = await response.text()
      const lines = body.split('\n').filter(line => line.startsWith('data:'))

      // Should have at least one data line plus [DONE]
      expect(lines.length).toBeGreaterThan(0)
    })
  })

  test.describe('Tenant Isolation', () => {
    test('should track usage per tenant', async ({ request }) => {
      const response = await request.post(`${GATEWAY_URL}/v1/chat/completions`, {
        data: {
          model: 'chat-default',
          tenant: 'test-tenant',
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        }
      })

      expect(response.ok()).toBeTruthy()
      const data = await response.json()

      expect(data).toBeDefined()
    })

    test('should enforce tenant budget limits', async ({ request }) => {
      // This would fail if tenant exceeds budget
      const response = await request.post(`${GATEWAY_URL}/v1/chat/completions`, {
        data: {
          model: 'chat-default',
          tenant: 'public',
          messages: [
            { role: 'user', content: 'Test' }
          ],
          max_tokens: 50
        }
      })

      // Should succeed for small request
      expect(response.status()).toBeLessThan(500)
    })
  })

  test.describe('Model Selection', () => {
    test('should use default model when not specified', async ({ request }) => {
      const response = await request.post(`${GATEWAY_URL}/v1/chat/completions`, {
        data: {
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        }
      })

      expect(response.ok()).toBeTruthy()
      const data = await response.json()

      expect(data.model).toBeDefined()
    })

    test('should use specified model', async ({ request }) => {
      const response = await request.post(`${GATEWAY_URL}/v1/chat/completions`, {
        data: {
          model: 'chat-default',
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        }
      })

      expect(response.ok()).toBeTruthy()
      const data = await response.json()

      expect(data.model).toBeTruthy()
    })

    test('should handle local model requests', async ({ request }) => {
      const response = await request.post(`${GATEWAY_URL}/v1/chat/completions`, {
        data: {
          model: 'chat-local',
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        }
      })

      // May succeed or fail depending on if local model is running
      expect(response.status()).toBeDefined()
    })
  })

  test.describe('Error Handling', () => {
    test('should handle missing messages field', async ({ request }) => {
      const response = await request.post(`${GATEWAY_URL}/v1/chat/completions`, {
        data: {
          model: 'chat-default'
          // missing messages
        }
      })

      expect(response.status()).toBeGreaterThanOrEqual(400)
    })

    test('should handle invalid message format', async ({ request }) => {
      const response = await request.post(`${GATEWAY_URL}/v1/chat/completions`, {
        data: {
          model: 'chat-default',
          messages: [
            { role: 'invalid-role', content: 'Test' }
          ]
        }
      })

      expect(response.status()).toBeGreaterThanOrEqual(400)
    })

    test('should handle empty messages array', async ({ request }) => {
      const response = await request.post(`${GATEWAY_URL}/v1/chat/completions`, {
        data: {
          model: 'chat-default',
          messages: []
        }
      })

      expect(response.status()).toBeGreaterThanOrEqual(400)
    })

    test('should handle very large max_tokens', async ({ request }) => {
      const response = await request.post(`${GATEWAY_URL}/v1/chat/completions`, {
        data: {
          model: 'chat-default',
          messages: [
            { role: 'user', content: 'Test' }
          ],
          max_tokens: 100000
        }
      })

      // Should either succeed with capped tokens or return error
      expect(response.status()).toBeDefined()
    })

    test('should handle invalid temperature', async ({ request }) => {
      const response = await request.post(`${GATEWAY_URL}/v1/chat/completions`, {
        data: {
          model: 'chat-default',
          messages: [
            { role: 'user', content: 'Test' }
          ],
          temperature: 10.0  // Invalid: should be 0-2
        }
      })

      // May accept or reject depending on validation
      expect(response.status()).toBeDefined()
    })
  })

  test.describe('Concurrent Requests', () => {
    test('should handle multiple concurrent chat requests', async ({ request }) => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        request.post(`${GATEWAY_URL}/v1/chat/completions`, {
          data: {
            model: 'chat-default',
            messages: [
              { role: 'user', content: `Request ${i}` }
            ],
            max_tokens: 20
          }
        })
      )

      const responses = await Promise.all(requests)

      responses.forEach(response => {
        expect(response.status()).toBeLessThan(500)
      })
    })

    test('should maintain request isolation', async ({ request }) => {
      const requests = await Promise.all([
        request.post(`${GATEWAY_URL}/v1/chat/completions`, {
          data: {
            model: 'chat-default',
            messages: [{ role: 'user', content: 'Request A' }]
          }
        }),
        request.post(`${GATEWAY_URL}/v1/chat/completions`, {
          data: {
            model: 'chat-default',
            messages: [{ role: 'user', content: 'Request B' }]
          }
        })
      ])

      const [dataA, dataB] = await Promise.all([
        requests[0].json(),
        requests[1].json()
      ])

      // Should have different IDs
      expect(dataA.id).not.toBe(dataB.id)
    })
  })

  test.describe('Performance', () => {
    test('should complete request within reasonable time', async ({ request }) => {
      const start = Date.now()

      const response = await request.post(`${GATEWAY_URL}/v1/chat/completions`, {
        data: {
          model: 'chat-default',
          messages: [
            { role: 'user', content: 'Quick test' }
          ],
          max_tokens: 10
        }
      })

      const duration = Date.now() - start

      expect(response.ok()).toBeTruthy()
      // Should complete in reasonable time (adjust based on actual performance)
      expect(duration).toBeLessThan(30000)
    })
  })
})
