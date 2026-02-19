'use client';

import React, { useMemo, useCallback, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';
import type { RoleResponse } from '@/lib/api-client';

export interface RoleListProps {
  /** List of roles to display */
  roles: RoleResponse[];
  /** Currently selected role ID */
  selectedRoleId?: string;
  /** Callback when a role is selected */
  onSelectRole: (roleId: string) => void;
  /** Callback when roles are reordered */
  onReorderRoles: (positions: { id: string; position: number }[]) => void;
  /** Whether the list is in a loading state */
  isLoading?: boolean;
  /** Optional class name */
  className?: string;
}

/**
 * Sortable role item component
 */
interface SortableRoleItemProps {
  role: RoleResponse;
  isSelected: boolean;
  onSelect: () => void;
  isEveryone: boolean;
  memberCount?: number;
}

function SortableRoleItem({
  role,
  isSelected,
  onSelect,
  isEveryone,
  memberCount,
}: SortableRoleItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: role.id,
    disabled: isEveryone, // @everyone cannot be reordered
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Convert color number to hex
  const colorHex = role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99AAB5';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
        isSelected && 'bg-accent/20 text-accent',
        !isSelected && 'hover:bg-background-surface text-foreground-muted hover:text-foreground',
        isDragging && 'opacity-50 bg-background-surface'
      )}
      onClick={onSelect}
    >
      {/* Drag handle - not shown for @everyone */}
      {!isEveryone && (
        <div
          {...attributes}
          {...listeners}
          className={cn(
            'flex-shrink-0 cursor-grab active:cursor-grabbing text-foreground-subtle hover:text-foreground',
            'touch-none'
          )}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Color indicator */}
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: colorHex }}
      />

      {/* Role name */}
      <span className="flex-1 text-sm font-medium truncate">
        {role.name}
      </span>

      {/* Member count */}
      {memberCount !== undefined && (
        <span className="text-xs text-foreground-subtle">
          {memberCount}
        </span>
      )}
    </div>
  );
}

/**
 * Drag overlay for showing the dragged item
 */
interface DragOverlayItemProps {
  role: RoleResponse;
}

function DragOverlayItem({ role }: DragOverlayItemProps) {
  const colorHex = role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99AAB5';

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-background-elevated shadow-lg border border-border">
      <GripVertical className="h-4 w-4 text-foreground-subtle" />
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: colorHex }}
      />
      <span className="text-sm font-medium text-foreground">{role.name}</span>
    </div>
  );
}

/**
 * Role list component with drag-and-drop reordering.
 *
 * Displays a list of roles sorted by position. The @everyone role is always
 * at the bottom and cannot be reordered. Dragging a role updates its position.
 */
export function RoleList({
  roles,
  selectedRoleId,
  onSelectRole,
  onReorderRoles,
  isLoading,
  className,
}: RoleListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Separate @everyone role and regular roles
  const { everyoneRole, sortableRoles } = useMemo(() => {
    const everyone = roles.find(r => r.name === '@everyone');
    const sortable = roles.filter(r => r.name !== '@everyone');
    // Sort by position (higher position = displayed first)
    sortable.sort((a, b) => b.position - a.position);
    return { everyoneRole: everyone, sortableRoles: sortable };
  }, [roles]);

  // IDs for sortable context
  const sortableIds = useMemo(() => sortableRoles.map(r => r.id), [sortableRoles]);

  // Track active drag item
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeRole = useMemo(
    () => sortableRoles.find(r => r.id === activeId),
    [sortableRoles, activeId]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) {
        return;
      }

      // Find old and new indices
      const oldIndex = sortableRoles.findIndex(r => r.id === active.id);
      const newIndex = sortableRoles.findIndex(r => r.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      // Reorder locally to get new positions
      const reordered = arrayMove(sortableRoles, oldIndex, newIndex);

      // Calculate new positions
      // The position is based on the index in the reversed list
      // (first item has highest position)
      const positions = reordered.map((role, index) => ({
        id: role.id,
        position: reordered.length - index, // Higher index in display = lower position value
      }));

      onReorderRoles(positions);
    },
    [sortableRoles, onReorderRoles]
  );

  if (isLoading) {
    return (
      <div className={cn('space-y-1', className)}>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-9 bg-background-surface rounded-md animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <p className="text-sm text-foreground-muted">No roles found</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => setActiveId(active.id as string)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className={cn('space-y-0.5', className)}>
        {/* Sortable roles */}
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          {sortableRoles.map(role => (
            <SortableRoleItem
              key={role.id}
              role={role}
              isSelected={selectedRoleId === role.id}
              onSelect={() => onSelectRole(role.id)}
              isEveryone={false}
            />
          ))}
        </SortableContext>

        {/* @everyone role - always at bottom, not sortable */}
        {everyoneRole && (
          <>
            <div className="my-2 border-t border-border" />
            <SortableRoleItem
              role={everyoneRole}
              isSelected={selectedRoleId === everyoneRole.id}
              onSelect={() => onSelectRole(everyoneRole.id)}
              isEveryone={true}
            />
          </>
        )}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeRole && <DragOverlayItem role={activeRole} />}
      </DragOverlay>
    </DndContext>
  );
}
