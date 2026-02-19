import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface DropdownItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick?: () => void;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'start' | 'end';
  direction?: 'up' | 'down';
  className?: string;
}

export function Dropdown({ trigger, items, align = 'start', direction = 'down', className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0, dropdownHeight: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        x: align === 'end' ? rect.right : rect.left,
        y: rect.top, // Use top for both directions
        dropdownHeight: 0,
      });
    }
    setOpen(!open);
  };

  // Measure dropdown height after render for upward direction
  useEffect(() => {
    if (open && direction === 'up' && dropdownRef.current) {
      const dropdownHeight = dropdownRef.current.offsetHeight;
      setPosition((prev) => ({ ...prev, dropdownHeight }));
    }
  }, [open, direction]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
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
  }, [open]);

  return (
    <>
      <div ref={triggerRef} onClick={handleToggle} className="inline-block">
        {trigger}
      </div>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            role="menu"
            className={cn(
              'fixed z-50 min-w-[180px] rounded-lg py-1 shadow-xl',
              'bg-background-elevated border border-border',
              className
            )}
            style={{
              left: align === 'end' ? position.x - 180 : position.x,
              top: direction === 'up' ? position.y - position.dropdownHeight - 4 : position.y + 36, // 36 is approx trigger height
            }}
          >
            {items.map((item) => (
              <button
                key={item.id}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm text-left rounded-md mx-1',
                  'hover:bg-background-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                  item.danger ? 'text-error hover:bg-error/10' : 'text-foreground'
                )}
              >
                {item.icon && <span className="h-4 w-4">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
