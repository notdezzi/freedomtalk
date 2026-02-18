'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

/**
 * Hook to trap focus within a container element (for modals, dialogs, etc.)
 * @param active - Whether the focus trap is active
 * @returns ref to attach to the container element
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the previously focused element when trap activates
  useEffect(() => {
    if (active) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [active]);

  // Restore focus when trap deactivates
  useEffect(() => {
    if (!active && previousFocusRef.current) {
      // Small delay to ensure DOM is ready
      const timeout = setTimeout(() => {
        previousFocusRef.current?.focus();
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [active]);

  // Handle focus trapping
  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;

    // Get all focusable elements
    const getFocusableElements = (): HTMLElement[] => {
      const elements = container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      return Array.from(elements).filter(
        (el) => el.offsetParent !== null && !el.hasAttribute('aria-hidden')
      );
    };

    // Focus first element when trap activates
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab - focus previous element
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab - focus next element
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return containerRef;
}

/**
 * Hook to manage focus when a component mounts/unmounts
 * @param autoFocus - Whether to auto-focus on mount
 * @returns ref to attach to the element that should receive focus
 */
export function useAutoFocus<T extends HTMLElement>(autoFocus: boolean = true) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (autoFocus && ref.current) {
      // Small delay to ensure DOM is ready
      const timeout = setTimeout(() => {
        ref.current?.focus();
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [autoFocus]);

  return ref;
}

/**
 * Hook to announce changes to screen readers
 */
export function useAnnounce() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Create or get the announcement element
    let announcer = document.getElementById('sr-announcer');

    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'sr-announcer';
      announcer.setAttribute('aria-live', priority);
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      document.body.appendChild(announcer);
    }

    // Update the aria-live value if needed
    announcer.setAttribute('aria-live', priority);

    // Clear and set message (this triggers the announcement)
    announcer.textContent = '';
    const timeout = setTimeout(() => {
      announcer!.textContent = message;
    }, 50);

    return () => clearTimeout(timeout);
  }, []);

  return announce;
}

/**
 * Hook to manage roving tabindex for list/toolbar navigation
 */
export function useRovingTabIndex<T extends HTMLElement>(itemCount: number, orientation: 'horizontal' | 'vertical' = 'vertical') {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<T>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const keys = orientation === 'horizontal'
        ? { next: 'ArrowRight', prev: 'ArrowLeft' }
        : { next: 'ArrowDown', prev: 'ArrowUp' };

      switch (e.key) {
        case keys.next:
          e.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % itemCount);
          break;
        case keys.prev:
          e.preventDefault();
          setFocusedIndex((prev) => (prev - 1 + itemCount) % itemCount);
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(itemCount - 1);
          break;
      }
    },
    [itemCount, orientation]
  );

  const getTabIndex = useCallback(
    (index: number) => (index === focusedIndex ? 0 : -1),
    [focusedIndex]
  );

  return {
    containerRef,
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    getTabIndex,
  };
}
