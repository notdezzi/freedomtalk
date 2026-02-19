'use client';

import { cn } from '@/lib/utils';
import { IconList } from '@/components/navigation/icon-list';
import { ItemList } from '@/components/navigation/item-list';
import { UserPanel } from './user-panel';
import { useUIStore } from '@/stores';
import { Home, Plus } from 'lucide-react';

// Temporary mock data - will be replaced with real data from React Query
const mockServers = [
  { id: '1', name: 'FreedomTalk', acronym: 'FT', color: '#5865F2', unread: 3 },
  { id: '2', name: 'Gaming Hub', acronym: 'GH', color: '#57F287' },
  { id: '3', name: 'Music Lovers', acronym: 'ML', color: '#FEE75C', unread: 1 },
];

const mockChannels = [
  { id: '1', name: 'general', type: 'text' as const, unread: true },
  { id: '2', name: 'random', type: 'text' as const },
  { id: '3', name: 'General', type: 'voice' as const },
];

export function NavigationColumn() {
  const activeModal = useUIStore((s) => s.activeModal);
  const openModal = useUIStore((s) => s.openModal);

  return (
    <nav
      className={cn(
        'flex w-[25%] min-w-[200px] max-w-[280px] flex-col',
        'bg-gray-800 border-r border-gray-700'
      )}
    >
      {/* Top section: Server list + Channel list */}
      <div className="flex flex-1 overflow-hidden">
        {/* Server list - 1/4 width */}
        <div className="flex w-[20%] min-w-[48px] flex-col items-center gap-2 overflow-y-auto bg-gray-900 py-3">
          <IconList
            variant="servers"
            items={mockServers.map((s) => ({
              id: s.id,
              name: s.name,
              acronym: s.acronym,
              color: s.color,
              unread: s.unread,
            }))}
            activeId="1"
            onItemClick={(id) => console.log('Server clicked:', id)}
            showAddButton
            onAddClick={() => openModal('create-server')}
          />
        </div>

        {/* Channel/DM list - 3/4 width */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <ItemList
            variant="channels"
            items={mockChannels}
            activeId="1"
            onItemClick={(item) => console.log('Channel clicked:', item.id)}
            headerComponent={
              <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
                Channels
              </div>
            }
          />
        </div>
      </div>

      {/* User Panel - Bottom */}
      <UserPanel />
    </nav>
  );
}
