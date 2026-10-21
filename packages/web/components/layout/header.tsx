'use client';

import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import { useUIStore } from '@/stores';

interface HeaderProps {
  sectionName: string;
  actions?: React.ReactNode;
}

export function Header({ sectionName, actions }: HeaderProps) {
  const isMobileNavOpen = useUIStore((s) => s.isMobileNavOpen);
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 h-12 flex-shrink-0',
        'flex items-center justify-center',
        'border-b border-border bg-list'
      )}
    >
      <button
        onClick={() => setMobileNavOpen(!isMobileNavOpen)}
        className="absolute left-2 rounded p-2 text-foreground-muted transition-colors hover:text-foreground lg:hidden"
        aria-label="Toggle navigation"
        aria-expanded={isMobileNavOpen}
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="text-sm font-semibold text-foreground">{sectionName}</h1>

      {actions && (
        <div className="absolute right-4 flex items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
