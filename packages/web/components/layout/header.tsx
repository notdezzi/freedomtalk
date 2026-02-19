'use client';

import { cn } from '@/lib/utils';

interface HeaderProps {
  sectionName: string;
  actions?: React.ReactNode;
}

export function Header({ sectionName, actions }: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 h-8 flex-shrink-0',
        'flex items-center justify-center',
        'border-b border-border bg-background-elevated shadow-sm'
      )}
    >
      <h1 className="text-md font-weight-[300] text-foreground">{sectionName}</h1>

      {actions && (
        <div className="absolute right-4 flex items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
