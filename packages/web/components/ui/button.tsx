import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          // Variants
          {
            'bg-accent text-background hover:bg-accent-hover focus-visible:ring-accent':
              variant === 'primary',
            'bg-background-surface text-foreground hover:bg-background-elevated focus-visible:ring-accent border border-border':
              variant === 'secondary',
            'bg-transparent text-foreground-muted hover:bg-background-surface hover:text-foreground focus-visible:ring-accent':
              variant === 'ghost',
            'bg-error text-foreground hover:bg-error/80 focus-visible:ring-error':
              variant === 'danger',
            'text-accent underline-offset-4 hover:underline focus-visible:ring-accent':
              variant === 'link',
          },
          // Sizes
          {
            'h-8 px-3 text-sm rounded-lg': size === 'sm',
            'h-10 px-4 text-sm rounded-lg': size === 'md',
            'h-12 px-6 text-base rounded-xl': size === 'lg',
            'h-10 w-10 p-0 rounded-lg': size === 'icon',
          },
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
