/**
 * Accordion Component - WCAG 2.1 AA Compliant
 * Accessible accordion with keyboard navigation and ARIA attributes
 *
 * Features:
 * - Arrow key navigation
 * - Enter/Space to toggle
 * - Home/End keys
 * - aria-expanded for state
 * - Smooth animations
 * - Single or multiple items open
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

type AccordionType = 'single' | 'multiple';

interface AccordionContextValue {
  type: AccordionType;
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  collapsible?: boolean;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

const useAccordionContext = () => {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion components must be used within an Accordion');
  }
  return context;
};

// Root Accordion component
export interface AccordionProps {
  type?: AccordionType;
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  defaultValue?: string | string[];
  collapsible?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  type = 'single',
  value: controlledValue,
  onValueChange,
  defaultValue,
  collapsible = false,
  children,
  className,
}) => {
  const [internalValue, setInternalValue] = React.useState<string | string[]>(
    defaultValue || (type === 'multiple' ? [] : '')
  );

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const handleValueChange = onValueChange || setInternalValue;

  return (
    <AccordionContext.Provider
      value={{ type, value, onValueChange: handleValueChange, collapsible }}
    >
      <div className={cn('space-y-2', className)}>{children}</div>
    </AccordionContext.Provider>
  );
};

// Accordion Item
export interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  value,
  children,
  className,
  disabled,
}) => {
  return (
    <div
      className={cn(
        'rounded-lg border-2 border-neutral-200 bg-white',
        'dark:border-neutral-800 dark:bg-neutral-900',
        disabled && 'opacity-50',
        className
      )}
      data-state={disabled ? 'disabled' : undefined}
      data-value={value}
    >
      {children}
    </div>
  );
};

AccordionItem.displayName = 'AccordionItem';

// Accordion Trigger
export interface AccordionTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  AccordionTriggerProps
>(({ value, children, className, disabled, ...props }, ref) => {
  const { type, value: selectedValue, onValueChange, collapsible } =
    useAccordionContext();

  const isOpen =
    type === 'multiple'
      ? Array.isArray(selectedValue) && selectedValue.includes(value)
      : selectedValue === value;

  const handleClick = () => {
    if (disabled) return;

    if (type === 'multiple' && Array.isArray(selectedValue)) {
      const newValue = isOpen
        ? selectedValue.filter((v) => v !== value)
        : [...selectedValue, value];
      onValueChange?.(newValue);
    } else {
      // Single mode
      const newValue = isOpen && collapsible ? '' : value;
      onValueChange?.(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const triggers = Array.from(
      document.querySelectorAll('[data-accordion-trigger]')
    ) as HTMLElement[];
    const currentIndex = triggers.findIndex((trigger) => trigger === e.currentTarget);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = currentIndex < triggers.length - 1 ? currentIndex + 1 : 0;
        triggers[nextIndex]?.focus();
        break;

      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : triggers.length - 1;
        triggers[prevIndex]?.focus();
        break;

      case 'Home':
        e.preventDefault();
        triggers[0]?.focus();
        break;

      case 'End':
        e.preventDefault();
        triggers[triggers.length - 1]?.focus();
        break;
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      data-accordion-trigger
      aria-expanded={isOpen}
      aria-controls={`accordion-content-${value}`}
      id={`accordion-trigger-${value}`}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex w-full items-center justify-between gap-2 p-4',
        'text-left font-medium',
        'transition-all',
        'hover:bg-neutral-50 dark:hover:bg-neutral-800',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          'h-5 w-5 shrink-0 transition-transform duration-200',
          isOpen && 'rotate-180'
        )}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
});

AccordionTrigger.displayName = 'AccordionTrigger';

// Accordion Content
export interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ value, children, className, ...props }, ref) => {
    const { type, value: selectedValue } = useAccordionContext();
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [height, setHeight] = React.useState<number | undefined>(0);

    const isOpen =
      type === 'multiple'
        ? Array.isArray(selectedValue) && selectedValue.includes(value)
        : selectedValue === value;

    React.useImperativeHandle(ref, () => contentRef.current!);

    // Animate height
    React.useEffect(() => {
      if (contentRef.current) {
        setHeight(isOpen ? contentRef.current.scrollHeight : 0);
      }
    }, [isOpen, children]);

    return (
      <div
        id={`accordion-content-${value}`}
        role="region"
        aria-labelledby={`accordion-trigger-${value}`}
        className="overflow-hidden transition-all duration-200"
        style={{ height }}
      >
        <div
          ref={contentRef}
          className={cn('p-4 pt-0', className)}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  }
);

AccordionContent.displayName = 'AccordionContent';
