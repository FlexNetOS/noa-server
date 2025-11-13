/**
 * Dialog Component - WCAG 2.1 AA Compliant
 * Accessible modal dialog with focus trap, keyboard navigation, and backdrop click
 *
 * Features:
 * - Focus trap (focus stays within dialog)
 * - Restore focus on close
 * - Close on Escape key
 * - Backdrop click to close (optional)
 * - Proper ARIA roles and labels
 * - Scrollable content
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

const useDialogContext = () => {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog');
  }
  return context;
};

// Root Dialog component
export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

// Dialog Trigger
export interface DialogTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

export const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ children, asChild, ...props }, ref) => {
    const { onOpenChange } = useDialogContext();

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...props,
        onClick: (e: React.MouseEvent) => {
          onOpenChange(true);
          children.props.onClick?.(e);
        },
      } as any);
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={() => onOpenChange(true)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

DialogTrigger.displayName = 'DialogTrigger';

// Dialog Portal (renders in document.body)
export interface DialogPortalProps {
  children: React.ReactNode;
}

export const DialogPortal: React.FC<DialogPortalProps> = ({ children }) => {
  const { open } = useDialogContext();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open) return null;

  return (
    typeof document !== 'undefined' &&
    ReactDOM.createPortal(children, document.body)
  );
};

import ReactDOM from 'react-dom';

// Dialog Overlay (backdrop)
export interface DialogOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  closeOnClick?: boolean;
}

export const DialogOverlay = React.forwardRef<HTMLDivElement, DialogOverlayProps>(
  ({ className, closeOnClick = true, ...props }, ref) => {
    const { onOpenChange } = useDialogContext();

    return (
      <div
        ref={ref}
        className={cn(
          'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          className
        )}
        onClick={closeOnClick ? () => onOpenChange(false) : undefined}
        {...props}
      />
    );
  }
);

DialogOverlay.displayName = 'DialogOverlay';

// Dialog Content
export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onEscapeKeyDown?: () => void;
  closeOnEscape?: boolean;
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  (
    {
      className,
      children,
      onEscapeKeyDown,
      closeOnEscape = true,
      ...props
    },
    ref
  ) => {
    const { open, onOpenChange } = useDialogContext();
    const contentRef = React.useRef<HTMLDivElement>(null);
    const previousActiveElement = React.useRef<HTMLElement | null>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => contentRef.current!);

    // Store previous active element and focus trap
    React.useEffect(() => {
      if (open) {
        // Store the element that had focus before opening
        previousActiveElement.current = document.activeElement as HTMLElement;

        // Focus the dialog content
        contentRef.current?.focus();

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        return () => {
          // Restore body scroll
          document.body.style.overflow = '';

          // Restore focus to previous element
          previousActiveElement.current?.focus();
        };
      }
    }, [open]);

    // Handle Escape key
    React.useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && closeOnEscape) {
          onEscapeKeyDown?.();
          onOpenChange(false);
        }
      };

      if (open) {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
      }
    }, [open, closeOnEscape, onEscapeKeyDown, onOpenChange]);

    // Focus trap
    React.useEffect(() => {
      if (!open || !contentRef.current) return;

      const handleFocus = (e: FocusEvent) => {
        if (!contentRef.current?.contains(e.target as Node)) {
          // Focus escaped the dialog, bring it back
          contentRef.current?.focus();
        }
      };

      document.addEventListener('focusin', handleFocus);
      return () => document.removeEventListener('focusin', handleFocus);
    }, [open]);

    return (
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          'fixed left-[50%] top-[50%] z-50',
          'translate-x-[-50%] translate-y-[-50%]',
          'w-full max-w-lg',
          'max-h-[90vh] overflow-y-auto',
          'rounded-lg border-2 border-neutral-200 bg-white p-6 shadow-lg',
          'dark:border-neutral-800 dark:bg-neutral-900',
          'focus:outline-none focus:ring-2 focus:ring-primary-500',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DialogContent.displayName = 'DialogContent';

// Dialog Header
export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}
    {...props}
  />
);

DialogHeader.displayName = 'DialogHeader';

// Dialog Title
export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      'text-neutral-900 dark:text-neutral-100',
      className
    )}
    {...props}
  />
));

DialogTitle.displayName = 'DialogTitle';

// Dialog Description
export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-neutral-500 dark:text-neutral-400', className)}
    {...props}
  />
));

DialogDescription.displayName = 'DialogDescription';

// Dialog Footer
export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
      className
    )}
    {...props}
  />
);

DialogFooter.displayName = 'DialogFooter';

// Dialog Close Button
export const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const { onOpenChange } = useDialogContext();

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'absolute right-4 top-4 rounded-sm p-1',
        'text-neutral-400 hover:text-neutral-600',
        'focus:outline-none focus:ring-2 focus:ring-primary-500',
        'dark:text-neutral-500 dark:hover:text-neutral-300',
        className
      )}
      onClick={() => onOpenChange(false)}
      aria-label="Close dialog"
      {...props}
    >
      {children || (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
});

DialogClose.displayName = 'DialogClose';
