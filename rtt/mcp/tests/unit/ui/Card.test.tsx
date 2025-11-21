import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

/**
 * Unit tests for Card Component
 * Tests rendering, props handling, and styling
 */

// Mock Card component for testing
interface CardProps {
  title?: string
  children: React.ReactNode
  className?: string
}

function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`card ${className}`} data-testid="card">
      {title && <h3 className="text-lg font-semibold mb-4" data-testid="card-title">{title}</h3>}
      <div data-testid="card-content">{children}</div>
    </div>
  )
}

describe('Card Component', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<Card>Test content</Card>)
      expect(container).toBeTruthy()
    })

    it('should render children content', () => {
      render(<Card>Test content</Card>)
      expect(screen.getByTestId('card-content')).toHaveTextContent('Test content')
    })

    it('should render title when provided', () => {
      render(<Card title="Test Title">Content</Card>)
      expect(screen.getByTestId('card-title')).toHaveTextContent('Test Title')
    })

    it('should not render title when not provided', () => {
      render(<Card>Content</Card>)
      expect(screen.queryByTestId('card-title')).toBeNull()
    })

    it('should render with default card class', () => {
      render(<Card>Content</Card>)
      const card = screen.getByTestId('card')
      expect(card.className).toContain('card')
    })

    it('should apply custom className', () => {
      render(<Card className="custom-class">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card.className).toContain('custom-class')
    })

    it('should preserve default class with custom className', () => {
      render(<Card className="custom-class">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card.className).toContain('card')
      expect(card.className).toContain('custom-class')
    })
  })

  describe('Content Rendering', () => {
    it('should render text content', () => {
      render(<Card>Simple text</Card>)
      expect(screen.getByTestId('card-content')).toHaveTextContent('Simple text')
    })

    it('should render JSX content', () => {
      render(
        <Card>
          <div data-testid="custom-element">Custom Element</div>
        </Card>
      )
      expect(screen.getByTestId('custom-element')).toHaveTextContent('Custom Element')
    })

    it('should render multiple children', () => {
      render(
        <Card>
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
        </Card>
      )
      const content = screen.getByTestId('card-content')
      expect(content).toContainHTML('<p>Paragraph 1</p>')
      expect(content).toContainHTML('<p>Paragraph 2</p>')
    })

    it('should render numeric content', () => {
      render(<Card>{123}</Card>)
      expect(screen.getByTestId('card-content')).toHaveTextContent('123')
    })

    it('should render complex nested content', () => {
      render(
        <Card title="Stats">
          <div className="stats">
            <div className="stat-item">
              <span>Count:</span>
              <span>100</span>
            </div>
          </div>
        </Card>
      )
      expect(screen.getByTestId('card-title')).toHaveTextContent('Stats')
      expect(screen.getByTestId('card-content')).toContainHTML('<div class="stats">')
    })
  })

  describe('Title Rendering', () => {
    it('should apply correct title classes', () => {
      render(<Card title="Test">Content</Card>)
      const title = screen.getByTestId('card-title')
      expect(title.className).toContain('text-lg')
      expect(title.className).toContain('font-semibold')
      expect(title.className).toContain('mb-4')
    })

    it('should render title as h3 element', () => {
      render(<Card title="Test">Content</Card>)
      const title = screen.getByTestId('card-title')
      expect(title.tagName).toBe('H3')
    })

    it('should handle empty string title', () => {
      render(<Card title="">Content</Card>)
      const title = screen.getByTestId('card-title')
      expect(title).toHaveTextContent('')
    })

    it('should handle long titles', () => {
      const longTitle = 'This is a very long title that might need to wrap or be truncated'
      render(<Card title={longTitle}>Content</Card>)
      expect(screen.getByTestId('card-title')).toHaveTextContent(longTitle)
    })

    it('should handle special characters in title', () => {
      render(<Card title="Title with @#$% special chars">Content</Card>)
      expect(screen.getByTestId('card-title')).toHaveTextContent('Title with @#$% special chars')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(<Card>{''}</Card>)
      const content = screen.getByTestId('card-content')
      expect(content).toBeInTheDocument()
    })

    it('should handle undefined className', () => {
      render(<Card className={undefined}>Content</Card>)
      const card = screen.getByTestId('card')
      expect(card.className).toContain('card')
    })

    it('should handle multiple spaces in className', () => {
      render(<Card className="  class1   class2  ">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card.className).toBeTruthy()
    })

    it('should render with both title and custom className', () => {
      render(<Card title="Test" className="custom">Content</Card>)
      const card = screen.getByTestId('card')
      const title = screen.getByTestId('card-title')

      expect(card.className).toContain('custom')
      expect(title).toHaveTextContent('Test')
    })
  })

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(<Card title="Accessible Title">Accessible Content</Card>)
      const title = screen.getByTestId('card-title')
      expect(title.tagName).toBe('H3')
    })

    it('should be identifiable by test id', () => {
      render(<Card>Content</Card>)
      expect(screen.getByTestId('card')).toBeInTheDocument()
    })
  })

  describe('Styling Integration', () => {
    it('should support Tailwind CSS classes', () => {
      render(<Card className="bg-white shadow-lg rounded-lg p-6">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card.className).toContain('bg-white')
      expect(card.className).toContain('shadow-lg')
    })

    it('should support responsive classes', () => {
      render(<Card className="md:col-span-2 lg:col-span-3">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card.className).toContain('md:col-span-2')
      expect(card.className).toContain('lg:col-span-3')
    })

    it('should support dark mode classes', () => {
      render(<Card className="dark:bg-gray-800 dark:text-white">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card.className).toContain('dark:bg-gray-800')
    })
  })

  describe('Component Composition', () => {
    it('should allow nesting Cards', () => {
      render(
        <Card title="Outer Card">
          <Card title="Inner Card">
            Inner Content
          </Card>
        </Card>
      )
      const titles = screen.getAllByTestId('card-title')
      expect(titles).toHaveLength(2)
      expect(titles[0]).toHaveTextContent('Outer Card')
      expect(titles[1]).toHaveTextContent('Inner Card')
    })

    it('should work with different content types', () => {
      render(
        <Card title="Mixed Content">
          <p>Text paragraph</p>
          <ul>
            <li>List item</li>
          </ul>
          <button>Action</button>
        </Card>
      )
      const content = screen.getByTestId('card-content')
      expect(content).toContainHTML('<p>Text paragraph</p>')
      expect(content).toContainHTML('<button>Action</button>')
    })
  })

  describe('Props Validation', () => {
    it('should accept all valid prop combinations', () => {
      const validProps = [
        { children: 'Content' },
        { title: 'Title', children: 'Content' },
        { title: 'Title', children: 'Content', className: 'custom' },
        { children: <div>JSX</div> },
        { title: 'Title', children: <div>JSX</div>, className: 'custom' }
      ]

      validProps.forEach((props, index) => {
        const { container } = render(<Card key={index} {...props} />)
        expect(container.querySelector('.card')).toBeInTheDocument()
      })
    })
  })
})
