'use client';

import Image from 'next/image';
import { cn, getAcronym } from '@/lib/utils';
import { Tooltip } from '@/components/ui';
import { Plus, Home } from 'lucide-react';
import type { UserStatus } from '@/types';
import { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DraggableAttributes,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface IconItem {
  id: string;
  icon?: string;
  acronym?: string;
  name: string;
  color?: string;
  unread?: number;
  hasNotification?: boolean;
  isOnline?: UserStatus;
}

export interface IconListProps {
  variant: 'servers' | 'dm-icons';
  items: IconItem[];
  activeId?: string;
  onItemClick: (id: string) => void;
  onItemContextMenu?: (e: React.MouseEvent, item: IconItem) => void;
  onReorder?: (items: IconItem[]) => void;
  showAddButton?: boolean;
  onAddClick?: () => void;
  showHomeButton?: boolean;
  onHomeClick?: () => void;
}

export function IconList({
  variant,
  items,
  activeId,
  onItemClick,
  onItemContextMenu,
  onReorder,
  showAddButton,
  onAddClick,
  showHomeButton,
  onHomeClick,
}: IconListProps) {
  const [activeDragId, setActiveId] = useState<string | null>(null);

  // Touch + keyboard accessible reordering (replaces HTML5 drag events)
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

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over || active.id === over.id || !onReorder) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {/* Home button for servers variant */}
      {variant === 'servers' && showHomeButton && (
        <Tooltip content="Direct Messages" position="right">
          <button
            onClick={onHomeClick}
            className={cn(
              'flex h-12 w-12 aspect-square items-center justify-center transition-all duration-200',
              'rounded-full bg-background-surface text-foreground hover:bg-background-hover hover:text-foreground hover:rounded-[16px]'
            )}
            aria-label="Direct Messages"
          >
            <Home className="h-6 w-6" />
          </button>
        </Tooltip>
      )}

      {/* Divider after home button */}
      {variant === 'servers' && showHomeButton && items.length > 0 && (
        <div className="h-0.5 w-8 rounded-full bg-background-surface" />
      )}

      {/* Items */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy} disabled={!onReorder}>
          {items.map((item) => (
            <SortableIconItem
              key={item.id}
              item={item}
              isActive={item.id === activeId}
              isDragging={activeDragId === item.id}
              reorderEnabled={!!onReorder}
              onClick={() => onItemClick(item.id)}
              onContextMenu={onItemContextMenu}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add button */}
      {showAddButton && (
        <Tooltip content={variant === 'servers' ? 'Add a Server' : 'Create DM'} position="right">
          <button
            onClick={onAddClick}
            className={cn(
              'flex h-12 w-12 items-center justify-center transition-all duration-200',
              'rounded-full bg-background-surface text-success hover:bg-success hover:text-white hover:rounded-[16px]'
            )}
            aria-label={variant === 'servers' ? 'Add a Server' : 'Create DM'}
          >
            <Plus className="h-6 w-6" />
          </button>
        </Tooltip>
      )}
    </div>
  );
}

function SortableIconItem({
  item,
  isActive,
  isDragging,
  reorderEnabled,
  onClick,
  onContextMenu,
}: {
  item: IconItem;
  isActive: boolean;
  isDragging: boolean;
  reorderEnabled: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent, item: IconItem) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id, disabled: !reorderEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative w-full flex justify-center">
      <IconListItem
        item={item}
        isActive={isActive}
        isDragging={isDragging}
        dragAttributes={reorderEnabled ? attributes : undefined}
        dragListeners={reorderEnabled ? listeners : undefined}
        onClick={onClick}
        onContextMenu={onContextMenu}
      />
    </div>
  );
}

function IconListItem({
  item,
  isActive,
  isDragging,
  dragAttributes,
  dragListeners,
  onClick,
  onContextMenu,
}: {
  item: IconItem;
  isActive: boolean;
  isDragging: boolean;
  dragAttributes?: DraggableAttributes;
  // SyntheticListenerMap is typed as a Map by dnd-kit but spreads as a plain object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragListeners?: any;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent, item: IconItem) => void;
}) {
  const showUnreadBadge = item.unread && item.unread > 0;
  const showNotificationDot = item.hasNotification && !showUnreadBadge;

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      onContextMenu(e, item);
    }
  };

  return (
    <Tooltip content={item.name} position="right">
      <div className="relative">
        {/* Active indicator */}
        <div
          className={cn(
            'absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 transition-all duration-200',
            'bg-foreground rounded-r-md',
            isActive ? 'h-10 w-1' : showNotificationDot ? 'h-2 w-1' : 'h-0 w-0'
          )}
        />

        <button
          onClick={onClick}
          onContextMenu={handleContextMenu}
          {...(dragAttributes || {})}
          {...(dragListeners || {})}
          className={cn(
            'relative flex h-12 w-12 items-center justify-center overflow-hidden',
            'transition-all duration-200 rounded-full hover:rounded-[16px]',
            isActive
              ? 'rounded-[16px] bg-accent'
              : 'bg-background-surface hover:bg-background-hover',
            isDragging && 'opacity-50 cursor-grabbing',
            dragListeners && 'touch-none'
          )}
          style={item.color && !isActive ? { backgroundColor: item.color } : undefined}
          aria-label={item.name}
          aria-current={isActive ? 'page' : undefined}
        >
          {item.icon ? (
            <Image
              src={item.icon}
              alt={item.name}
              width={48}
              height={48}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              className={cn(
                'text-sm font-semibold',
                isActive ? 'text-white' : 'text-foreground'
              )}
            >
              {item.acronym || getAcronym(item.name)}
            </span>
          )}

          {/* Status indicator for DM icons */}
          {item.isOnline && (
            <div
              className={cn(
                'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-rail',
                item.isOnline === 'online' && 'bg-success',
                item.isOnline === 'idle' && 'bg-warning',
                item.isOnline === 'dnd' && 'bg-error',
                (item.isOnline === 'offline' || item.isOnline === 'invisible') && 'bg-foreground-subtle'
              )}
            />
          )}
        </button>

        {/* Unread badge */}
        {showUnreadBadge && (
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center',
              'rounded-full bg-error px-1 text-xs font-bold text-foreground'
            )}
          >
            {item.unread! > 99 ? '99+' : item.unread}
          </div>
        )}
      </div>
    </Tooltip>
  );
}
