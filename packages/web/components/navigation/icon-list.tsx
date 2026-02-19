'use client';

import { cn, getAcronym } from '@/lib/utils';
import { Tooltip } from '@/components/ui';
import { Plus, Home } from 'lucide-react';
import type { UserStatus } from '@/types';
import { useState, useRef } from 'react';

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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    dragNodeRef.current = e.target as HTMLDivElement;
    e.dataTransfer.effectAllowed = 'move';
    // Add a slight delay to allow the drag image to be captured
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnd = () => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1';
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex || !onReorder) {
      setDragOverIndex(null);
      return;
    }

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);

    onReorder(newItems);
    setDragOverIndex(null);
  };

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {/* Home button for servers variant */}
      {variant === 'servers' && showHomeButton && (
        <Tooltip content="Direct Messages" position="right">
          <button
            onClick={onHomeClick}
            className={cn(
              'flex h-12 w-12 aspect-square items-center justify-center rounded-2xl transition-all duration-200',
              'bg-gray-700 text-gray-300 hover:bg-green-600 hover:text-white hover:rounded-xl'
            )}
            aria-label="Direct Messages"
          >
            <Home className="h-6 w-6" />
          </button>
        </Tooltip>
      )}

      {/* Divider after home button */}
      {variant === 'servers' && showHomeButton && items.length > 0 && (
        <div className="h-0.5 w-8 rounded-full bg-gray-700" />
      )}

      {/* Items */}
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable={!!onReorder}
          onDragStart={(e) => handleDragStart(e, index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          className={cn(
            'relative w-full flex justify-center',
            dragOverIndex === index && draggedIndex !== null && draggedIndex < index && 'translate-y-2',
            dragOverIndex === index && draggedIndex !== null && draggedIndex > index && '-translate-y-2',
          )}
        >
          {/* Drop indicator above */}
          {dragOverIndex === index && draggedIndex !== null && draggedIndex > index && (
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-10 h-1 bg-white rounded-full" />
          )}
          <IconListItem
            item={item}
            isActive={item.id === activeId}
            isDragging={draggedIndex === index}
            onClick={() => onItemClick(item.id)}
            onContextMenu={onItemContextMenu}
          />
          {/* Drop indicator below */}
          {dragOverIndex === index && draggedIndex !== null && draggedIndex < index && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-1 bg-white rounded-full" />
          )}
        </div>
      ))}

      {/* Add button */}
      {showAddButton && (
        <Tooltip content={variant === 'servers' ? 'Add a Server' : 'Create DM'} position="right">
          <button
            onClick={onAddClick}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200',
              'bg-gray-700 text-green-500 hover:bg-green-600 hover:text-white hover:rounded-xl'
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

function IconListItem({
  item,
  isActive,
  isDragging,
  onClick,
  onContextMenu,
}: {
  item: IconItem;
  isActive: boolean;
  isDragging: boolean;
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
            'bg-white rounded-r-md',
            isActive ? 'h-10 w-1' : showNotificationDot ? 'h-2 w-1' : 'h-0 w-0'
          )}
        />

        <button
          onClick={onClick}
          onContextMenu={handleContextMenu}
          className={cn(
            'relative flex h-12 w-12 items-center justify-center transition-all duration-200',
            'rounded-2xl hover:rounded-xl overflow-hidden',
            isActive
              ? 'rounded-xl bg-gray-600'
              : 'bg-gray-700 hover:bg-gray-600',
            isDragging && 'opacity-50 cursor-grabbing'
          )}
          style={item.color ? { backgroundColor: isActive ? item.color : undefined } : undefined}
          aria-label={item.name}
          aria-current={isActive ? 'page' : undefined}
        >
          {item.icon ? (
            <img
              src={item.icon}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              className={cn(
                'text-sm font-semibold',
                isActive || item.color ? 'text-white' : 'text-gray-300'
              )}
            >
              {item.acronym || getAcronym(item.name)}
            </span>
          )}

          {/* Status indicator for DM icons */}
          {item.isOnline && (
            <div
              className={cn(
                'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-gray-900',
                item.isOnline === 'online' && 'bg-green-500',
                item.isOnline === 'idle' && 'bg-yellow-500',
                item.isOnline === 'dnd' && 'bg-red-500',
                (item.isOnline === 'offline' || item.isOnline === 'invisible') && 'bg-gray-500'
              )}
            />
          )}
        </button>

        {/* Unread badge */}
        {showUnreadBadge && (
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center',
              'rounded-full bg-red-500 px-1 text-xs font-bold text-white'
            )}
          >
            {item.unread! > 99 ? '99+' : item.unread}
          </div>
        )}
      </div>
    </Tooltip>
  );
}
