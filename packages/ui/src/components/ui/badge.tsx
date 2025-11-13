/**
 * Badge Component
 * A small status indicator with multiple variants
 */

import * as React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../../utils/cn';

const badge = tv({
  base: [
    'inline-flex items-center gap-1.5 rounded-full',
    'font-medium transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
  ],
  variants: {
    variant: {
      default: [
        'bg-primary-100 text-primary-800',
        'dark:bg-primary-950 dark:text-primary-200',
      ],
      secondary: [
        'bg-secondary-100 text-secondary-800',
        'dark:bg-secondary-950 dark:text-secondary-200',
      ],
      success: [
        'bg-success-100 text-success-800',
        'dark:bg-success-950 dark:text-success-200',
      ],
      warning: [
        'bg-warning-100 text-warning-800',
        'dark:bg-warning-950 dark:text-warning-200',
      ],
      error: [
        'bg-error-100 text-error-800',
        'dark:bg-error-950 dark:text-error-200',
      ],
      neutral: [
        'bg-neutral-100 text-neutral-800',
        'dark:bg-neutral-900 dark:text-neutral-200',
      ],
      outline: [
        'border-2 border-current bg-transparent',
      ],
    },
    size: {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base',
    },
    dot: {
      true: 'relative pl-5',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badge> {
  removable?: boolean;
  onRemove?: () => void;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, dot, removable, onRemove, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badge({ variant, size, dot }), className)}
        {...props}
      >
        {dot && (
          <span className="absolute left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-current" />
        )}
        {children}
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
            aria-label="Remove"
          >
            <svg
              className="h-3 w-3"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge, badge };
