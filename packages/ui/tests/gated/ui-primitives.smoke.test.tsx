import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// Focused smoke tests for a small set of core UI primitives.
// These are used as the gating suite for the @noa/ui package.

describe('UI primitives smoke gate', () => {
  it('renders a primary button and handles click', () => {
    const handleClick = vi.fn();

    render(
      <Button variant="primary" size="md" onClick={handleClick}>
        Click me
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders an input with label and helper text', () => {
    render(
      <Input
        label="Email"
        placeholder="you@example.com"
        helperText="We will never share your email."
        required
      />
    );

    const input = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');

    const helper = screen.getByText(/never share your email/i);
    expect(helper).toBeInTheDocument();
  });

  it('renders an input with error state and clear button', () => {
    const handleClear = vi.fn();

    render(
      <Input
        label="Name"
        value="Claude"
        error="Name is required"
        showClear
        onClear={handleClear}
      />
    );

    const input = screen.getByLabelText(/name/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');

    const error = screen.getByText(/name is required/i);
    expect(error).toBeInTheDocument();

    const clearButton = screen.getByRole('button', { name: /clear input/i });
    fireEvent.click(clearButton);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });
});
