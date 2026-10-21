import { forwardRef, type HTMLAttributes } from 'react';
import Image from 'next/image';
import { cn, getStatusColor, getAcronym } from '@/lib/utils';
import type { UserStatus } from '@/types';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: UserStatus;
  showStatus?: boolean;
  isSpeaking?: boolean;
  isDeafened?: boolean;
  isMuted?: boolean;
}

const sizeClasses = {
  xs: 'h-4 w-4',
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-20 w-20',
};

// Pixel dimensions for next/image (must match sizeClasses)
const sizePixels = {
  xs: 16,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 80,
};

const statusSizes = {
  xs: 'h-1 w-1',
  sm: 'h-1.5 w-1.5',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-4 w-4',
};

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      src,
      alt = '',
      size = 'md',
      status,
      showStatus = false,
      isSpeaking,
      isDeafened,
      isMuted,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn('relative inline-flex shrink-0', className)}
        {...props}
      >
        <div
          className={cn(
            'relative rounded-full overflow-hidden bg-background-surface',
            isSpeaking && 'ring-2 ring-success ring-offset-2 ring-offset-background',
            sizeClasses[size]
          )}
        >
          {src ? (
            <Image
              src={src}
              alt={alt}
              width={sizePixels[size]}
              height={sizePixels[size]}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className={cn(
                'flex items-center justify-center bg-background-elevated text-foreground font-medium',
                sizeClasses[size],
                size === 'xs' && 'text-[6px]',
                size === 'sm' && 'text-[8px]',
                size === 'md' && 'text-xs',
                size === 'lg' && 'text-sm',
                size === 'xl' && 'text-2xl'
              )}
            >
              {alt ? getAcronym(alt) : '?'}
            </div>
          )}
        </div>

        {showStatus && status && (
          <div
            className={cn(
              'absolute bottom-0 right-0 rounded-full border-2 border-background',
              getStatusColor(status),
              statusSizes[size]
            )}
          />
        )}

        {(isMuted || isDeafened) && (
          <div
            role="img"
            aria-label={isDeafened ? 'Deafened' : 'Muted'}
            className={cn(
              'absolute bottom-0 right-0 rounded-full bg-background flex items-center justify-center',
              statusSizes[size]
            )}
          >
            {isDeafened ? (
              // Deafened: headphones-style icon with a diagonal strike line
              <svg
                className="h-2 w-2 text-error"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  d="M4 13v-2a6 6 0 1112 0v2"
                  strokeLinecap="round"
                />
                <rect x="2.5" y="11.5" width="3.5" height="5" rx="1" fill="currentColor" stroke="none" />
                <rect x="14" y="11.5" width="3.5" height="5" rx="1" fill="currentColor" stroke="none" />
                <line x1="2" y1="18" x2="18" y2="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg className="h-2 w-2 text-error" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export { Avatar };
