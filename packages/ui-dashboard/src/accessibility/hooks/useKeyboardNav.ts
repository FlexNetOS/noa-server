import { useEffect, useCallback, RefObject } from 'react';

interface KeyboardNavOptions {
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onEnter?: () => void;
  onSpace?: () => void;
  onEscape?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
  onPageUp?: () => void;
  onPageDown?: () => void;
  enabled?: boolean;
}

/**
 * Hook for keyboard navigation
 * Meets WCAG 2.1.1 Keyboard requirements
 */
export function useKeyboardNav<T extends HTMLElement>(
  ref: RefObject<T>,
  options: KeyboardNavOptions
) {
  const {
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onEnter,
    onSpace,
    onEscape,
    onHome,
    onEnd,
    onPageUp,
    onPageDown,
    enabled = true,
  } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) {
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          if (onArrowUp) {
            e.preventDefault();
            onArrowUp();
          }
          break;
        case 'ArrowDown':
          if (onArrowDown) {
            e.preventDefault();
            onArrowDown();
          }
          break;
        case 'ArrowLeft':
          if (onArrowLeft) {
            e.preventDefault();
            onArrowLeft();
          }
          break;
        case 'ArrowRight':
          if (onArrowRight) {
            e.preventDefault();
            onArrowRight();
          }
          break;
        case 'Enter':
          if (onEnter) {
            e.preventDefault();
            onEnter();
          }
          break;
        case ' ':
          if (onSpace) {
            e.preventDefault();
            onSpace();
          }
          break;
        case 'Escape':
          if (onEscape) {
            e.preventDefault();
            onEscape();
          }
          break;
        case 'Home':
          if (onHome) {
            e.preventDefault();
            onHome();
          }
          break;
        case 'End':
          if (onEnd) {
            e.preventDefault();
            onEnd();
          }
          break;
        case 'PageUp':
          if (onPageUp) {
            e.preventDefault();
            onPageUp();
          }
          break;
        case 'PageDown':
          if (onPageDown) {
            e.preventDefault();
            onPageDown();
          }
          break;
      }
    },
    [
      enabled,
      onArrowUp,
      onArrowDown,
      onArrowLeft,
      onArrowRight,
      onEnter,
      onSpace,
      onEscape,
      onHome,
      onEnd,
      onPageUp,
      onPageDown,
    ]
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    element.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref, handleKeyDown]);
}

/**
 * Hook for roving tabindex navigation (for lists, menus, toolbars)
 * Meets WCAG 2.4.3 Focus Order requirements
 */
export function useRovingTabIndex<T extends HTMLElement>(
  containerRef: RefObject<T>,
  itemSelector: string,
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    loop?: boolean;
    enabled?: boolean;
  } = {}
) {
  const { orientation = 'vertical', loop = true, enabled = true } = options;

  useEffect(() => {
    if (!enabled || !containerRef.current) {
      return;
    }

    const container = containerRef.current;
    let currentIndex = 0;

    const getItems = (): HTMLElement[] => {
      return Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
    };

    const updateTabIndex = (index: number) => {
      const items = getItems();
      items.forEach((item, i) => {
        if (i === index) {
          item.tabIndex = 0;
          item.focus();
        } else {
          item.tabIndex = -1;
        }
      });
      currentIndex = index;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const items = getItems();
      if (items.length === 0) {
        return;
      }

      let newIndex = currentIndex;
      let handled = false;

      switch (e.key) {
        case 'ArrowDown':
          if (orientation === 'vertical' || orientation === 'both') {
            newIndex = currentIndex + 1;
            handled = true;
          }
          break;
        case 'ArrowUp':
          if (orientation === 'vertical' || orientation === 'both') {
            newIndex = currentIndex - 1;
            handled = true;
          }
          break;
        case 'ArrowRight':
          if (orientation === 'horizontal' || orientation === 'both') {
            newIndex = currentIndex + 1;
            handled = true;
          }
          break;
        case 'ArrowLeft':
          if (orientation === 'horizontal' || orientation === 'both') {
            newIndex = currentIndex - 1;
            handled = true;
          }
          break;
        case 'Home':
          newIndex = 0;
          handled = true;
          break;
        case 'End':
          newIndex = items.length - 1;
          handled = true;
          break;
      }

      if (handled) {
        e.preventDefault();

        // Handle looping
        if (loop) {
          if (newIndex < 0) {
            newIndex = items.length - 1;
          }
          if (newIndex >= items.length) {
            newIndex = 0;
          }
        } else {
          newIndex = Math.max(0, Math.min(items.length - 1, newIndex));
        }

        updateTabIndex(newIndex);
      }
    };

    // Initialize first item
    updateTabIndex(0);

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, itemSelector, orientation, loop, enabled]);
}
