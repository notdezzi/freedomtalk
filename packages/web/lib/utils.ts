/**
 * Utility functions for the web application
 */

/**
 * Combines class names conditionally
 * @param classes - Class names to combine
 * @returns Combined class string
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

