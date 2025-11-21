import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Card component definition for testing
function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      {children}
    </div>
  )
}

describe('Card Component', () => {
  it('should render children content', () => {
    const { container } = render(<Card>Test content</Card>)
    expect(container.textContent).toContain('Test content')
  })

  it('should render title when provided', () => {
    const { container } = render(<Card title="Card Title">Content</Card>)
    const heading = container.querySelector('h3')
    expect(heading).toBeTruthy()
    expect(heading?.textContent).toBe('Card Title')
  })

  it('should not render title when not provided', () => {
    const { container } = render(<Card>Content</Card>)
    const heading = container.querySelector('h3')
    expect(heading).toBeNull()
  })

  it('should apply base card className', () => {
    const { container } = render(<Card>Content</Card>)
    const cardElement = container.firstChild as HTMLElement
    expect(cardElement?.className).toContain('card')
  })

  it('should apply additional className when provided', () => {
    const { container } = render(<Card className="custom-class">Content</Card>)
    const cardElement = container.firstChild as HTMLElement
    expect(cardElement?.className).toContain('card')
    expect(cardElement?.className).toContain('custom-class')
  })

  it('should handle empty className', () => {
    const { container } = render(<Card className="">Content</Card>)
    const cardElement = container.firstChild as HTMLElement
    expect(cardElement?.className).toContain('card')
  })

  it('should render multiple children', () => {
    const { container } = render(
      <Card>
        <p>First child</p>
        <p>Second child</p>
      </Card>
    )
    expect(container.textContent).toContain('First child')
    expect(container.textContent).toContain('Second child')
  })

  it('should render complex children', () => {
    const { container } = render(
      <Card title="Complex Card">
        <div>
          <span>Nested content</span>
          <button>Action</button>
        </div>
      </Card>
    )
    expect(container.textContent).toContain('Complex Card')
    expect(container.textContent).toContain('Nested content')
    expect(container.textContent).toContain('Action')
  })

  it('should apply correct title styling classes', () => {
    const { container } = render(<Card title="Styled Title">Content</Card>)
    const heading = container.querySelector('h3')
    expect(heading?.className).toContain('text-lg')
    expect(heading?.className).toContain('font-semibold')
    expect(heading?.className).toContain('mb-4')
  })

  it('should handle special characters in title', () => {
    const { container } = render(<Card title="Title with <> & special chars">Content</Card>)
    const heading = container.querySelector('h3')
    expect(heading?.textContent).toBe('Title with <> & special chars')
  })

  it('should handle empty content', () => {
    const { container } = render(<Card></Card>)
    const cardElement = container.firstChild as HTMLElement
    expect(cardElement).toBeTruthy()
    expect(cardElement?.className).toContain('card')
  })

  it('should maintain structure with title and multiple children', () => {
    const { container } = render(
      <Card title="Multi-section Card">
        <section>Section 1</section>
        <section>Section 2</section>
        <section>Section 3</section>
      </Card>
    )
    const sections = container.querySelectorAll('section')
    expect(sections).toHaveLength(3)
    expect(sections[0].textContent).toBe('Section 1')
    expect(sections[1].textContent).toBe('Section 2')
    expect(sections[2].textContent).toBe('Section 3')
  })
})
