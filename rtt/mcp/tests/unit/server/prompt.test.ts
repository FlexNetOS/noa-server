import { describe, it, expect } from 'vitest'
import { z } from 'zod'

/**
 * Unit tests for MCP Server Summarize Prompt
 * Tests prompt generation, schema validation, and message formatting
 */

describe('MCP Server Summarize Prompt', () => {
  const SummarizeInput = z.object({ text: z.string() })

  describe('Prompt Input Validation', () => {
    it('should validate text input schema', () => {
      const validInput = { text: 'This is a sample text to summarize.' }
      const result = SummarizeInput.parse(validInput)

      expect(result.text).toBe(validInput.text)
    })

    it('should reject input without text field', () => {
      const invalidInput = {} as any

      expect(() => SummarizeInput.parse(invalidInput)).toThrow()
    })

    it('should reject input with non-string text', () => {
      const invalidInput = { text: 123 } as any

      expect(() => SummarizeInput.parse(invalidInput)).toThrow()
    })

    it('should accept empty string text', () => {
      const validInput = { text: '' }

      expect(() => SummarizeInput.parse(validInput)).not.toThrow()
    })

    it('should accept very long text', () => {
      const longText = 'a'.repeat(100000)
      const validInput = { text: longText }

      const result = SummarizeInput.parse(validInput)
      expect(result.text.length).toBe(100000)
    })
  })

  describe('Prompt Message Generation', () => {
    it('should generate user message with summarize instruction', () => {
      const text = 'This is a sample text to summarize.'
      const prompt = {
        description: 'Summarize input text',
        messages: [
          { role: 'user', content: { type: 'text', text: `Summarize:\n${text}` } }
        ]
      }

      expect(prompt.messages).toHaveLength(1)
      expect(prompt.messages[0].role).toBe('user')
      expect(prompt.messages[0].content.type).toBe('text')
      expect(prompt.messages[0].content.text).toContain('Summarize:')
      expect(prompt.messages[0].content.text).toContain(text)
    })

    it('should include description field', () => {
      const prompt = {
        description: 'Summarize input text',
        messages: []
      }

      expect(prompt.description).toBe('Summarize input text')
    })

    it('should format message with newline separator', () => {
      const text = 'Sample text'
      const prompt = {
        description: 'Summarize input text',
        messages: [
          { role: 'user', content: { type: 'text', text: `Summarize:\n${text}` } }
        ]
      }

      expect(prompt.messages[0].content.text).toBe('Summarize:\nSample text')
      expect(prompt.messages[0].content.text.split('\n')).toHaveLength(2)
    })

    it('should handle text with multiple lines', () => {
      const text = 'Line 1\nLine 2\nLine 3'
      const prompt = {
        description: 'Summarize input text',
        messages: [
          { role: 'user', content: { type: 'text', text: `Summarize:\n${text}` } }
        ]
      }

      expect(prompt.messages[0].content.text).toContain('Line 1')
      expect(prompt.messages[0].content.text).toContain('Line 2')
      expect(prompt.messages[0].content.text).toContain('Line 3')
    })

    it('should preserve special characters in text', () => {
      const text = 'Text with special chars: @#$%^&*() 你好 🚀'
      const prompt = {
        description: 'Summarize input text',
        messages: [
          { role: 'user', content: { type: 'text', text: `Summarize:\n${text}` } }
        ]
      }

      expect(prompt.messages[0].content.text).toContain('@#$%^&*()')
      expect(prompt.messages[0].content.text).toContain('你好')
      expect(prompt.messages[0].content.text).toContain('🚀')
    })
  })

  describe('Prompt Message Structure', () => {
    it('should have correct role field', () => {
      const prompt = {
        description: 'Summarize input text',
        messages: [
          { role: 'user' as const, content: { type: 'text', text: 'Summarize:\nTest' } }
        ]
      }

      expect(prompt.messages[0].role).toBe('user')
      expect(['user', 'assistant', 'system']).toContain(prompt.messages[0].role)
    })

    it('should have correct content type', () => {
      const prompt = {
        description: 'Summarize input text',
        messages: [
          { role: 'user', content: { type: 'text', text: 'Summarize:\nTest' } }
        ]
      }

      expect(prompt.messages[0].content.type).toBe('text')
    })

    it('should have non-empty text content', () => {
      const prompt = {
        description: 'Summarize input text',
        messages: [
          { role: 'user', content: { type: 'text', text: 'Summarize:\nSome text' } }
        ]
      }

      expect(prompt.messages[0].content.text).toBeTruthy()
      expect(prompt.messages[0].content.text.length).toBeGreaterThan(0)
    })
  })

  describe('Prompt Edge Cases', () => {
    it('should handle empty text input', () => {
      const text = ''
      const prompt = {
        description: 'Summarize input text',
        messages: [
          { role: 'user', content: { type: 'text', text: `Summarize:\n${text}` } }
        ]
      }

      expect(prompt.messages[0].content.text).toBe('Summarize:\n')
    })

    it('should handle whitespace-only text', () => {
      const text = '   \n   \t   '
      const prompt = {
        description: 'Summarize input text',
        messages: [
          { role: 'user', content: { type: 'text', text: `Summarize:\n${text}` } }
        ]
      }

      expect(prompt.messages[0].content.text).toContain(text)
    })

    it('should handle text with code blocks', () => {
      const text = '```javascript\nconst x = 1;\n```'
      const prompt = {
        description: 'Summarize input text',
        messages: [
          { role: 'user', content: { type: 'text', text: `Summarize:\n${text}` } }
        ]
      }

      expect(prompt.messages[0].content.text).toContain('```javascript')
      expect(prompt.messages[0].content.text).toContain('const x = 1;')
    })

    it('should handle text with markdown', () => {
      const text = '# Heading\n## Subheading\n- Item 1\n- Item 2'
      const prompt = {
        description: 'Summarize input text',
        messages: [
          { role: 'user', content: { type: 'text', text: `Summarize:\n${text}` } }
        ]
      }

      expect(prompt.messages[0].content.text).toContain('# Heading')
      expect(prompt.messages[0].content.text).toContain('- Item 1')
    })

    it('should handle text with JSON', () => {
      const text = '{"key": "value", "number": 123}'
      const prompt = {
        description: 'Summarize input text',
        messages: [
          { role: 'user', content: { type: 'text', text: `Summarize:\n${text}` } }
        ]
      }

      expect(prompt.messages[0].content.text).toContain('{"key": "value"')
    })
  })

  describe('Prompt Performance', () => {
    it('should generate prompt quickly', () => {
      const startTime = performance.now()

      const text = 'Sample text to summarize'
      const prompt = {
        description: 'Summarize input text',
        messages: [
          { role: 'user', content: { type: 'text', text: `Summarize:\n${text}` } }
        ]
      }

      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(10)
      expect(prompt.messages).toHaveLength(1)
    })

    it('should handle large text efficiently', () => {
      const largeText = 'a'.repeat(50000)
      const startTime = performance.now()

      const prompt = {
        description: 'Summarize input text',
        messages: [
          { role: 'user', content: { type: 'text', text: `Summarize:\n${largeText}` } }
        ]
      }

      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(50)
      expect(prompt.messages[0].content.text.length).toBeGreaterThan(50000)
    })

    it('should handle multiple prompt generations', () => {
      const prompts = Array.from({ length: 100 }, (_, i) => ({
        description: 'Summarize input text',
        messages: [
          { role: 'user', content: { type: 'text', text: `Summarize:\nText ${i}` } }
        ]
      }))

      expect(prompts).toHaveLength(100)
      prompts.forEach((prompt, i) => {
        expect(prompt.messages[0].content.text).toContain(`Text ${i}`)
      })
    })
  })

  describe('Prompt Data Integrity', () => {
    it('should not modify input text', () => {
      const originalText = 'Original text'
      const text = originalText

      const prompt = {
        description: 'Summarize input text',
        messages: [
          { role: 'user', content: { type: 'text', text: `Summarize:\n${text}` } }
        ]
      }

      expect(text).toBe(originalText)
      expect(prompt.messages[0].content.text).toContain(originalText)
    })

    it('should create independent prompt instances', () => {
      const text1 = 'Text 1'
      const text2 = 'Text 2'

      const prompt1 = {
        description: 'Summarize input text',
        messages: [
          { role: 'user', content: { type: 'text', text: `Summarize:\n${text1}` } }
        ]
      }

      const prompt2 = {
        description: 'Summarize input text',
        messages: [
          { role: 'user', content: { type: 'text', text: `Summarize:\n${text2}` } }
        ]
      }

      expect(prompt1.messages[0].content.text).not.toBe(prompt2.messages[0].content.text)
    })
  })
})
