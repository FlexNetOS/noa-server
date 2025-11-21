/**
 * Checkbox Component
 * A customizable checkbox with indeterminate state support
 */

import * as React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../../utils/cn';

const checkbox = tv({
  base: [
    'peer h-5 w-5 shrink-0 rounded border-2',
    'transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'data-[state=checked]:bg-primary-600 data-[state=checked]:border-primary-600',
    'data-[state=unchecked]:border-neutral-300 data-[state=unchecked]:bg-transparent',
    'data-[state=indeterminate]:bg-primary-600 data-[state=indeterminate]:border-primary-600',
    'dark:data-[state=unchecked]:border-neutral-700',
  ],
  variants: {
    variant: {
      default: 'focus-visible:ring-primary-500',
      error: 'border-error-500 focus-visible:ring-error-500',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>,
    VariantProps<typeof checkbox> {
  indeterminate?: boolean;
  error?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, variant, indeterminate, error, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => inputRef.current!);

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate ?? false;
      }
    }, [indeterminate]);

    const state = indeterminate
      ? 'indeterminate'
      : props.checked
      ? 'checked'
      : 'unchecked';

    const actualVariant = error ? 'error' : variant;

    return (
      <div className="relative inline-flex items-center">
        <input
          ref={inputRef}
          type="checkbox"
          data-state={state}
          className={cn(checkbox({ variant: actualVariant }), className)}
          {...props}
        />
        {(props.checked || indeterminate) && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white">
            {indeterminate ? (
              <svg
                className="h-3 w-3"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="h-3 w-3"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox, checkbox };
