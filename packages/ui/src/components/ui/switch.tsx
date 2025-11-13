/**
 * Switch Component
 * A toggle switch for boolean states
 */

import * as React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../../utils/cn';

const switchVariants = tv({
  slots: {
    root: [
      'peer inline-flex shrink-0 cursor-pointer items-center',
      'rounded-full border-2 border-transparent',
      'transition-colors duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-primary-600',
      'data-[state=unchecked]:bg-neutral-200',
      'dark:data-[state=unchecked]:bg-neutral-800',
    ],
    thumb: [
      'pointer-events-none block rounded-full bg-white shadow-sm',
      'transition-transform duration-200',
      'data-[state=checked]:translate-x-full',
      'data-[state=unchecked]:translate-x-0',
    ],
  },
  variants: {
    size: {
      sm: {
        root: 'h-5 w-9',
        thumb: 'h-4 w-4',
      },
      md: {
        root: 'h-6 w-11',
        thumb: 'h-5 w-5',
      },
      lg: {
        root: 'h-7 w-14',
        thumb: 'h-6 w-6',
      },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const { root, thumb } = switchVariants();

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'>,
    VariantProps<typeof switchVariants> {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      size,
      checked: controlledChecked,
      defaultChecked = false,
      onChange,
      disabled,
      ...props
    },
    ref
  ) => {
    const [uncontrolledChecked, setUncontrolledChecked] =
      React.useState(defaultChecked);

    const isControlled = controlledChecked !== undefined;
    const checked = isControlled ? controlledChecked : uncontrolledChecked;

    const handleToggle = () => {
      if (disabled) return;

      const newChecked = !checked;

      if (!isControlled) {
        setUncontrolledChecked(newChecked);
      }

      onChange?.(newChecked);
    };

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        data-state={checked ? 'checked' : 'unchecked'}
        disabled={disabled}
        onClick={handleToggle}
        className={cn(root({ size }), className)}
        {...props}
      >
        <span
          data-state={checked ? 'checked' : 'unchecked'}
          className={thumb({ size })}
        />
      </button>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };
