import { useState, useRef, useEffect, cloneElement, isValidElement, type KeyboardEvent as ReactKeyboardEvent, type ReactElement, type ReactNode } from 'react';
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
  trigger: ReactElement;
  items: DropdownItem[];
  align?: 'start' | 'end';
  direction?: 'up' | 'down';
  className?: string;
}

export function Dropdown({ trigger, items, align = 'start', direction = 'down', className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0, dropdownHeight: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevOpenRef = useRef(false);

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

  // Move focus into the menu once it renders; restore it to the trigger on close
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (open) {
      const frame = requestAnimationFrame(() => {
        const firstItem = dropdownRef.current?.querySelector<HTMLElement>(
          'button[role="menuitem"]:not(:disabled)'
        );
        firstItem?.focus();
      });
      return () => cancelAnimationFrame(frame);
    }
    if (wasOpen) {
      triggerRef.current?.focus();
    }
  }, [open]);

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

  // Arrow-key navigation across menu items (WAI-ARIA menu pattern)
  const handleMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const menuItems = Array.from(
      dropdownRef.current?.querySelectorAll<HTMLElement>('button[role="menuitem"]:not(:disabled)') ?? []
    );
    if (menuItems.length === 0) return;

    const currentIndex = menuItems.indexOf(document.activeElement as HTMLElement);
    const nextIndex =
      e.key === 'ArrowDown'
        ? (currentIndex + 1) % menuItems.length
        : (currentIndex - 1 + menuItems.length) % menuItems.length;
    menuItems[nextIndex].focus();
  };

  // The trigger element itself becomes the toggle button — this keeps it a
  // single <button> (no div-on-click) and carries the aria menu attributes.
  const triggerElement = isValidElement(trigger)
    ? cloneElement(trigger as ReactElement<any>, {
        ref: triggerRef,
        onClick: handleToggle,
        'aria-haspopup': 'menu',
        'aria-expanded': open,
      })
    : null;

  return (
    <>
      {triggerElement}

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            role="menu"
            aria-orientation="vertical"
            onKeyDown={handleMenuKeyDown}
            className={cn(
              'fixed z-50 min-w-[180px] rounded-lg py-1 shadow-md',
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
                tabIndex={-1}
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm text-left rounded-md mx-1',
                  'hover:bg-background-hover focus:bg-background-hover focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
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
