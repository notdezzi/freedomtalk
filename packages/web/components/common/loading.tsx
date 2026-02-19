import { cn } from '@/lib/utils';

export function Loading({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className="relative h-8 w-8">
        <div className="absolute inset-0 rounded-full border-2 border-border" />
        <div className="absolute inset-0 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    </div>
  );
}

export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative h-12 w-12 mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-background-surface" />
        <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
      {message && <p className="text-foreground text-sm">{message}</p>}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="relative mx-auto h-16 w-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-background-surface" />
          <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin" />
        </div>
        <p className="text-foreground-muted">Loading...</p>
      </div>
    </div>
  );
}
