/**
 * Select Component
 * A native select dropdown with custom styling
 */

import * as React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../../utils/cn';

const select = tv({
  base: [
    'flex w-full rounded-lg border',
    'bg-background text-foreground',
    'transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'appearance-none bg-no-repeat',
    'pr-10', // Space for dropdown icon
  ],
  variants: {
    variant: {
      default: [
        'border-input',
        'focus-visible:ring-primary-500',
      ],
      error: [
        'border-error-500',
        'focus-visible:ring-error-500',
        'bg-error-50 dark:bg-error-950/20',
      ],
    },
    size: {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-5 text-lg',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof select> {
  error?: string;
  helperText?: string;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, variant, size, error, helperText, options, children, ...props },
    ref
  ) => {
    const actualVariant = error ? 'error' : variant;

    return (
      <div className="w-full">
        <div className="relative">
          <select
            ref={ref}
            className={cn(select({ variant: actualVariant, size }), className)}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.5rem center',
              backgroundSize: '1.5em 1.5em',
            }}
            {...props}
          >
            {options
              ? options.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </option>
                ))
              : children}
          </select>
        </div>
        {(error || helperText) && (
          <p
            className={cn(
              'mt-1.5 text-sm',
              error
                ? 'text-error-600 dark:text-error-400'
                : 'text-muted-foreground'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select, select };
