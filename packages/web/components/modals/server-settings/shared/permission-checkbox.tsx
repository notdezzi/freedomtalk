'use client';

import { cn } from '@/lib/utils';
import type { PermissionState } from '@freedomtalk/shared';

export interface PermissionCheckboxProps {
  /** Current state of the checkbox */
  state: PermissionState;
  /** Callback when state changes */
  onChange: (state: PermissionState) => void;
  /** Label text for the permission */
  label: string;
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Optional description for the permission */
  description?: string;
}

/**
 * 3-state checkbox for permission editing.
 *
 * States cycle: Neutral (gray circle) -> Allow (green checkmark) -> Deny (red X) -> Neutral
 *
 * Visual indicators:
 * - Neutral: Gray circle outline
 * - Allow: Green checkmark
 * - Deny: Red X mark
 */
export function PermissionCheckbox({
  state,
  onChange,
  label,
  disabled = false,
  description,
}: PermissionCheckboxProps) {
  const handleClick = () => {
    if (disabled) return;

    // Cycle through states: neutral -> allow -> deny -> neutral
    const nextState: PermissionState =
      state === 'neutral' ? 'allow' : state === 'allow' ? 'deny' : 'neutral';

    onChange(nextState);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between py-2 px-3 rounded-lg',
        'transition-colors',
        !disabled && 'hover:bg-background-surface cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="checkbox"
      aria-checked={state === 'allow' ? true : state === 'deny' ? 'mixed' : false}
      aria-label={label}
      tabIndex={disabled ? -1 : 0}
    >
      <div className="flex-1 min-w-0">
        <span className="text-sm text-foreground font-medium">{label}</span>
        {description && (
          <p className="text-xs text-foreground-muted mt-0.5">{description}</p>
        )}
      </div>

      {/* State indicator */}
      <div
        className={cn(
          'flex-shrink-0 w-6 h-6 rounded flex items-center justify-center',
          'border-2 transition-all duration-150',
          // Neutral state - gray outline with empty circle
          state === 'neutral' && 'border-border bg-transparent',
          // Allow state - green with checkmark
          state === 'allow' && 'border-green-500 bg-green-500/20',
          // Deny state - red with X
          state === 'deny' && 'border-red-500 bg-red-500/20'
        )}
      >
        {state === 'neutral' && (
          <div className="w-2 h-2 rounded-full border border-border" />
        )}
        {state === 'allow' && (
          <svg
            className="w-4 h-4 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
        {state === 'deny' && (
          <svg
            className="w-4 h-4 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
