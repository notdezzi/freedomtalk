interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export default function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-foreground-muted/20';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

// Pre-built skeleton components
export function MessageSkeleton() {
  return (
    <div className="flex gap-3 p-4">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton width={100} height={16} />
          <Skeleton width={60} height={12} />
        </div>
        <Skeleton width="80%" height={14} />
      </div>
    </div>
  );
}

export function ChannelSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-1.5">
          <Skeleton width={16} height={16} />
          <Skeleton width={120 + Math.random() * 60} height={14} />
        </div>
      ))}
    </div>
  );
}

export function ServerListSkeleton() {
  return (
    <div className="flex flex-col gap-2 py-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex justify-center">
          <Skeleton variant="circular" width={48} height={48} />
        </div>
      ))}
    </div>
  );
}

export function MemberSkeleton() {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <Skeleton variant="circular" width={32} height={32} />
      <div className="flex-1">
        <Skeleton width={80 + Math.random() * 40} height={14} />
      </div>
    </div>
  );
}
