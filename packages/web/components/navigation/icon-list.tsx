'use client';

import { cn, getAcronym } from '@/lib/utils';
import { Tooltip } from '@/components/ui';
import { Plus, Home } from 'lucide-react';
import type { UserStatus } from '@/types';

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
  showAddButton,
  onAddClick,
  showHomeButton,
  onHomeClick,
}: IconListProps) {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      {/* Home button for servers variant */}
      {variant === 'servers' && showHomeButton && (
        <Tooltip content="Direct Messages" position="right">
          <button
            onClick={onHomeClick}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200',
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
      {items.map((item) => (
        <IconListItem
          key={item.id}
          item={item}
          isActive={item.id === activeId}
          onClick={() => onItemClick(item.id)}
        />
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
  onClick,
}: {
  item: IconItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const showUnreadBadge = item.unread && item.unread > 0;
  const showNotificationDot = item.hasNotification && !showUnreadBadge;

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
          className={cn(
            'relative flex h-12 w-12 items-center justify-center transition-all duration-200',
            'rounded-2xl hover:rounded-xl overflow-hidden',
            isActive
              ? 'rounded-xl bg-gray-600'
              : 'bg-gray-700 hover:bg-gray-600'
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
