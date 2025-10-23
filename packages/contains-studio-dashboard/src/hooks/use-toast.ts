// Simplified toast hook - uses the toast component from shadcn/ui
import { useState, useCallback } from 'react';

import { toast as sonnerToast } from 'sonner';

export interface Toast {
  id?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ title, description, variant, action }: Toast) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { id, title, description, action, variant };

    setToasts((prev) => [...prev, newToast]);

    if (variant === 'destructive') {
      sonnerToast.error(title || 'Error', { description });
    } else {
      sonnerToast.success(title || 'Success', { description });
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);

    return { id };
  }, []);

  const dismiss = useCallback((toastId?: string) => {
    if (toastId) {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    } else {
      setToasts([]);
    }
  }, []);

  return { toast, toasts, dismiss };
}
