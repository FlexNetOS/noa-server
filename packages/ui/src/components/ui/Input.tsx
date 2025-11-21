/**
 * Input Component - WCAG 2.1 AA Compliant
 * Accessible input with labels, hints, error messages, and clear functionality
 *
 * Features:
 * - Associated labels with htmlFor
 * - Error messages with aria-describedby
 * - Hint text support
 * - Clear button with aria-label
 * - Focus indicators
 * - Screen reader support
 */

import * as React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../../utils/cn';

const input = tv({
  base: [
    'flex w-full rounded-lg border-2',
    'bg-white dark:bg-neutral-900',
    'px-4 py-2',
    'text-base',
    'transition-colors',
    // WCAG 2.1: Focus visible with 2px outline
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'placeholder:text-neutral-400 dark:placeholder:text-neutral-500',
  ],
  variants: {
    variant: {
      default: [
        'border-neutral-300 dark:border-neutral-700',
        'focus:border-primary-500 focus:ring-primary-500',
      ],
      error: [
        'border-error-500 dark:border-error-600',
        'focus:border-error-600 focus:ring-error-500',
      ],
      success: [
        'border-success-500 dark:border-success-600',
        'focus:border-success-600 focus:ring-success-500',
      ],
    },
    size: {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-6 text-lg',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof input> {
  label?: string;
  hint?: string;
  helperText?: string;
  error?: string;
  showClear?: boolean;
  onClear?: () => void;
  containerClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      variant,
      size,
      type = 'text',
      label,
      hint,
      helperText,
      error,
      showClear = false,
      onClear,
      id,
      disabled,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();
    const helperTextValue = helperText || hint;
    const hintId = helperTextValue ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [hintId, errorId, ariaDescribedBy]
      .filter(Boolean)
      .join(' ');

    const inputVariant = error ? 'error' : variant;

    return (
      <div className={cn('space-y-2', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {label}
            {props.required && (
              <span className="ml-1 text-error-500" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={cn(
              input({ variant: inputVariant, size }),
              showClear && 'pr-10',
              className
            )}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedBy || undefined}
            {...props}
          />

          {showClear && props.value && !disabled && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-400 hover:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:hover:text-neutral-300"
              aria-label="Clear input"
              tabIndex={0}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>

        {helperTextValue && !error && (
          <p
            id={hintId}
            className="text-sm text-neutral-500 dark:text-neutral-400"
          >
            {helperTextValue}
          </p>
        )}

        {error && (
          <p
            id={errorId}
            className="flex items-center gap-1 text-sm text-error-600 dark:text-error-400"
            role="alert"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, input };
