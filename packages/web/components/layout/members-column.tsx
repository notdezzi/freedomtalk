'use client';

import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores';
import { Users, X } from 'lucide-react';
import { Avatar } from '@/components/ui';
import type { ServerMember, UserStatus } from '@/types';

// Temporary mock data
const mockMembers: ServerMember[] = [
  { id: '1', serverId: '1', userId: '1', username: 'Alice', status: 'online', joinedAt: new Date().toISOString(), isOnline: true },
  { id: '2', serverId: '1', userId: '2', username: 'Bob', status: 'idle', joinedAt: new Date().toISOString(), isOnline: true },
  { id: '3', serverId: '1', userId: '3', username: 'Charlie', status: 'dnd', joinedAt: new Date().toISOString(), isOnline: true },
  { id: '4', serverId: '1', userId: '4', username: 'Diana', status: 'offline', joinedAt: new Date().toISOString(), isOnline: false },
  { id: '5', serverId: '1', userId: '5', username: 'Eve', status: 'offline', joinedAt: new Date().toISOString(), isOnline: false },
];

export function MembersColumn() {
  const isOpen = useUIStore((s) => s.isMembersSidebarOpen);
  const toggle = useUIStore((s) => s.toggleMembersSidebar);

  if (!isOpen) {
    return (
      <button
        onClick={toggle}
        className={cn(
          'w-12 bg-gray-800 border-l border-gray-700',
          'flex flex-col items-center justify-start pt-4',
          'text-gray-400 hover:text-white transition-colors'
        )}
        aria-label="Show members"
      >
        <Users className="h-5 w-5" />
      </button>
    );
  }

  const onlineMembers = mockMembers.filter((m) => m.isOnline);
  const offlineMembers = mockMembers.filter((m) => !m.isOnline);

  return (
    <aside
      className={cn(
        'flex w-[25%] min-w-[180px] max-w-[280px] flex-col',
        'bg-gray-800 border-l border-gray-700'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300">Members</h2>
        <button
          onClick={toggle}
          className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
          aria-label="Hide members"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Members list */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Online */}
        <div className="mb-4">
          <h3 className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">
            Online — {onlineMembers.length}
          </h3>
          {onlineMembers.map((member) => (
            <MemberItem key={member.id} member={member} />
          ))}
        </div>

        {/* Offline */}
        {offlineMembers.length > 0 && (
          <div>
            <h3 className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">
              Offline — {offlineMembers.length}
            </h3>
            {offlineMembers.map((member) => (
              <MemberItem key={member.id} member={member} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function MemberItem({ member }: { member: ServerMember }) {
  return (
    <button
      className={cn(
        'flex w-full items-center gap-2 rounded px-2 py-1.5',
        'text-gray-400 hover:bg-gray-700 hover:text-gray-200',
        !member.isOnline && 'opacity-50'
      )}
    >
      <Avatar
        src={member.avatar}
        alt={member.displayName || member.username}
        size="sm"
        status={member.status}
        showStatus
      />
      <span className="truncate text-sm">
        {member.displayName || member.username}
      </span>
    </button>
  );
}
