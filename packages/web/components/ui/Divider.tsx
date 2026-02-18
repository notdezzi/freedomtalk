'use client';

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  label?: string;
}

export default function Divider({
  orientation = 'horizontal',
  className = '',
  label,
}: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={`w-px h-full bg-border ${className}`}
      />
    );
  }

  if (label) {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        className={`flex items-center gap-4 ${className}`}
      >
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs font-medium text-foreground-muted">{label}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
    );
  }

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={`h-px w-full bg-border ${className}`}
    />
  );
}
