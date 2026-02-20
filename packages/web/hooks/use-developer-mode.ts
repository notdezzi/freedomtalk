'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to check and manage developer mode status
 * Developer mode enables Copy ID options in context menus
 */
export function useDeveloperMode() {
  const [isEnabled, setIsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('developer-mode') === 'true';
    }
    return false;
  });

  useEffect(() => {
    // Listen for changes from other components
    const handleChange = (e: CustomEvent<boolean>) => {
      setIsEnabled(e.detail);
    };

    window.addEventListener('developer-mode-change', handleChange as EventListener);

    return () => {
      window.removeEventListener('developer-mode-change', handleChange as EventListener);
    };
  }, []);

  return isEnabled;
}

/**
 * Hook that returns Copy ID menu item if developer mode is enabled
 */
export function useCopyIdMenuItem(id: string | undefined, label: string) {
  const isDeveloperMode = useDeveloperMode();

  const copyId = useCallback(() => {
    if (id) {
      navigator.clipboard.writeText(id);
    }
  }, [id]);

  if (!isDeveloperMode || !id) {
    return null;
  }

  return {
    id: 'copy-id',
    label: `Copy ${label} ID`,
    icon: null,
    onClick: copyId,
  };
}
