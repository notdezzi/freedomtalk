import { forwardRef, type HTMLAttributes } from 'react';
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
            'relative rounded-full overflow-hidden bg-gray-700',
            isSpeaking && 'ring-2 ring-green-500 ring-offset-2 ring-offset-gray-900',
            sizeClasses[size]
          )}
        >
          {src ? (
            <img
              src={src}
              alt={alt}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className={cn(
                'flex items-center justify-center bg-gray-600 text-white font-medium',
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
              'absolute bottom-0 right-0 rounded-full border-2 border-gray-900',
              getStatusColor(status),
              statusSizes[size]
            )}
          />
        )}

        {(isMuted || isDeafened) && (
          <div
            className={cn(
              'absolute bottom-0 right-0 rounded-full bg-gray-900 flex items-center justify-center',
              statusSizes[size]
            )}
          >
            {isDeafened ? (
              <svg className="h-2 w-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="h-2 w-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
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
