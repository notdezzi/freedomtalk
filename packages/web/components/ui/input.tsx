import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-lg border border-border bg-background-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle',
            'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors',
            error && 'border-error focus:ring-error/50 focus:border-error',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-error">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
