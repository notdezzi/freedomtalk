'use client';

import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { MemberResponse, RoleResponse } from '@/lib/api-client';
import { Search, Users } from 'lucide-react';
import { MemberCard } from './member-card';

interface MemberListProps {
  members: MemberResponse[];
  roles: RoleResponse[];
  selectedMemberId: string | null;
  onSelectMember: (member: MemberResponse) => void;
  isLoading?: boolean;
}

export function MemberList({
  members,
  roles,
  selectedMemberId,
  onSelectMember,
  isLoading
}: MemberListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter members by search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;

    const query = searchQuery.toLowerCase();
    return members.filter(member => {
      const username = member.username?.toLowerCase() || '';
      const displayName = member.displayName?.toLowerCase() || '';
      return username.includes(query) || displayName.includes(query);
    });
  }, [members, searchQuery]);

  // Sort members: online first, then alphabetically
  const sortedMembers = useMemo(() => {
    return [...filteredMembers].sort((a, b) => {
      // Online members first
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1;
      }
      // Then alphabetically by display name
      const nameA = a.displayName || a.username || '';
      const nameB = b.displayName || b.username || '';
      return nameA.localeCompare(nameB);
    });
  }, [filteredMembers]);

  const handleMemberClick = useCallback((member: MemberResponse) => {
    onSelectMember(member);
  }, [onSelectMember]);

  return (
    <div className="flex flex-col h-full">
      {/* Search header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5 text-sm text-foreground-muted whitespace-nowrap">
          <Users className="h-4 w-4" />
          <span>{members.length}</span>
        </div>
      </div>

      {/* Members list */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-background-surface">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : sortedMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-foreground-subtle">
            <Users className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">
              {searchQuery ? 'No members found' : 'No members in this server'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedMembers.map(member => (
              <MemberCard
                key={member.id}
                member={member}
                roles={roles}
                isSelected={selectedMemberId === member.id}
                onClick={() => handleMemberClick(member)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
