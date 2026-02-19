import { useEffect, useCallback } from 'react';

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape key even in inputs
        if (e.key !== 'Escape') return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrl === (e.ctrlKey || e.metaKey);
        const shiftMatch = !!shortcut.shift === e.shiftKey;
        const altMatch = !!shortcut.alt === e.altKey;
        const metaMatch = !!shortcut.meta === e.metaKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function useRovingTabIndex(itemCount: number, orientation: 'horizontal' | 'vertical' = 'vertical') {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number, onFocus: (index: number) => void) => {
      let newIndex = currentIndex;

      switch (e.key) {
        case 'ArrowUp':
          if (orientation === 'vertical') {
            e.preventDefault();
            newIndex = currentIndex > 0 ? currentIndex - 1 : itemCount - 1;
          }
          break;
        case 'ArrowDown':
          if (orientation === 'vertical') {
            e.preventDefault();
            newIndex = currentIndex < itemCount - 1 ? currentIndex + 1 : 0;
          }
          break;
        case 'ArrowLeft':
          if (orientation === 'horizontal') {
            e.preventDefault();
            newIndex = currentIndex > 0 ? currentIndex - 1 : itemCount - 1;
          }
          break;
        case 'ArrowRight':
          if (orientation === 'horizontal') {
            e.preventDefault();
            newIndex = currentIndex < itemCount - 1 ? currentIndex + 1 : 0;
          }
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = itemCount - 1;
          break;
        default:
          return;
      }

      onFocus(newIndex);
    },
    [itemCount, orientation]
  );

  return { handleKeyDown };
}
