import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface ContextMenuItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  onClick?: () => void;
}

export interface ContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  className?: string;
}

export function ContextMenu({ open, x, y, items, onClose, className }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (open && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const adjustedX = x + rect.width > window.innerWidth ? window.innerWidth - rect.width - 8 : x;
      const adjustedY = y + rect.height > window.innerHeight ? window.innerHeight - rect.height - 8 : y;
      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
    }
  }, [open, x, y]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className={cn(
        'fixed z-50 min-w-[180px] rounded-md bg-gray-800 py-1 shadow-lg ring-1 ring-black/5',
        'animate-in fade-in-0 zoom-in-95',
        className
      )}
      style={{ left: x, top: y }}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return <div key={`separator-${index}`} className="my-1 border-t border-gray-700" />;
        }

        return (
          <button
            key={item.id}
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              item.onClick?.();
              onClose();
            }}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-sm text-left',
              'hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed',
              item.danger ? 'text-red-400 hover:text-red-300' : 'text-gray-200'
            )}
          >
            {item.icon && <span className="h-4 w-4">{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
    </div>,
    document.body
  );
}
