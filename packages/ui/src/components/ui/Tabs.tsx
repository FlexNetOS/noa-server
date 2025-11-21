/**
 * Tabs Component - WCAG 2.1 AA Compliant
 * Accessible tabs with keyboard navigation and ARIA roles
 *
 * Features:
 * - Arrow key navigation (Left/Right)
 * - Home/End keys
 * - Automatic or manual activation
 * - ARIA roles (tablist, tab, tabpanel)
 * - Focus management
 * - Roving tabindex
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

interface TabsContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  activationMode?: 'automatic' | 'manual';
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

const useTabsContext = () => {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs');
  }
  return context;
};

// Root Tabs component
export interface TabsProps {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  orientation?: 'horizontal' | 'vertical';
  activationMode?: 'automatic' | 'manual';
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  value: controlledValue,
  onValueChange,
  defaultValue,
  orientation = 'horizontal',
  activationMode = 'automatic',
  children,
  className,
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const handleValueChange = onValueChange || setInternalValue;

  return (
    <TabsContext.Provider
      value={{ value, onValueChange: handleValueChange, orientation, activationMode }}
    >
      <div
        className={cn(
          orientation === 'vertical' && 'flex gap-4',
          className
        )}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
};

// Tabs List
export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ children, className, ...props }, ref) => {
    const { orientation } = useTabsContext();
    const listRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => listRef.current!);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      const tabs = Array.from(
        listRef.current?.querySelectorAll('[role="tab"]:not([disabled])') || []
      ) as HTMLElement[];

      const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
      let nextIndex = currentIndex;

      const isHorizontal = orientation === 'horizontal';

      switch (e.key) {
        case isHorizontal ? 'ArrowLeft' : 'ArrowUp':
          e.preventDefault();
          nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
          break;

        case isHorizontal ? 'ArrowRight' : 'ArrowDown':
          e.preventDefault();
          nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
          break;

        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;

        case 'End':
          e.preventDefault();
          nextIndex = tabs.length - 1;
          break;

        default:
          return;
      }

      tabs[nextIndex]?.focus();
    };

    return (
      <div
        ref={listRef}
        role="tablist"
        aria-orientation={orientation}
        onKeyDown={handleKeyDown}
        className={cn(
          'inline-flex items-center gap-1 rounded-lg bg-neutral-100 p-1',
          'dark:bg-neutral-800',
          orientation === 'vertical' && 'flex-col',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabsList.displayName = 'TabsList';

// Tab Trigger
export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, children, className, disabled, onClick, ...props }, ref) => {
    const { value: selectedValue, onValueChange, activationMode } = useTabsContext();
    const isSelected = selectedValue === value;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled) {
        onValueChange?.(value);
        onClick?.(e);
      }
    };

    const handleFocus = () => {
      if (activationMode === 'automatic' && !disabled) {
        onValueChange?.(value);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (activationMode === 'manual' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        if (!disabled) {
          onValueChange?.(value);
        }
      }
    };

    return (
      <button
        ref={ref}
        role="tab"
        type="button"
        aria-selected={isSelected}
        aria-controls={`tabpanel-${value}`}
        id={`tab-${value}`}
        tabIndex={isSelected ? 0 : -1}
        disabled={disabled}
        onClick={handleClick}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2',
          'text-sm font-medium',
          'transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          isSelected
            ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-100'
            : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

TabsTrigger.displayName = 'TabsTrigger';

// Tab Content
export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, children, className, ...props }, ref) => {
    const { value: selectedValue } = useTabsContext();
    const isSelected = selectedValue === value;

    if (!isSelected) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`tabpanel-${value}`}
        aria-labelledby={`tab-${value}`}
        tabIndex={0}
        className={cn(
          'mt-2 rounded-lg p-4',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabsContent.displayName = 'TabsContent';
