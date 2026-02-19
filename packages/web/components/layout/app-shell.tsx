'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Header } from './header';
import { NavigationColumn } from './navigation-column';
import { MembersColumn } from './members-column';
import { useUIStore, useVoiceStore } from '@/stores';

interface AppShellProps {
  children: ReactNode;
  sectionName: string;
  serverId?: string;
}

export function AppShell({ children, sectionName, serverId }: AppShellProps) {
  const isMembersSidebarOpen = useUIStore((s) => s.isMembersSidebarOpen);
  const isConnectedToVoice = useVoiceStore((s) => s.isConnected);

  // Hide members column when in voice
  const showMembersColumn = isMembersSidebarOpen && !isConnectedToVoice;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Header Row - Sticky */}
      <Header sectionName={sectionName} />

      {/* Content Row */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Column - Sticky, 4/16 width */}
        <NavigationColumn />

        {/* Content Column - expands when members hidden or in voice */}
        <main
          className={cn(
            'flex-1 overflow-hidden transition-all duration-300',
            showMembersColumn ? 'w-[50%]' : 'w-[75%]'
          )}
        >
          {children}
        </main>

        {/* Members Column - Sticky, 4/16 width, toggleable, hidden when in voice */}
        {showMembersColumn && <MembersColumn serverId={serverId} />}
      </div>
    </div>
  );
}
