'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Header } from './header';
import { NavigationColumn } from './navigation-column';
import { MembersColumn } from './members-column';
import { useUIStore } from '@/stores';

interface AppShellProps {
  children: ReactNode;
  sectionName: string;
}

export function AppShell({ children, sectionName }: AppShellProps) {
  const isMembersSidebarOpen = useUIStore((s) => s.isMembersSidebarOpen);

  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white">
      {/* Header Row - Sticky */}
      <Header sectionName={sectionName} />

      {/* Content Row */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Column - Sticky, 4/16 width */}
        <NavigationColumn />

        {/* Content Column - 8/16 width (expands when members hidden) */}
        <main
          className={cn(
            'flex-1 overflow-hidden transition-all duration-300',
            isMembersSidebarOpen ? 'w-[50%]' : 'w-[75%]'
          )}
        >
          {children}
        </main>

        {/* Members Column - Sticky, 4/16 width, toggleable */}
        <MembersColumn />
      </div>
    </div>
  );
}
