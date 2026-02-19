import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 300,
  className,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const gap = 8;

        let x = rect.left + rect.width / 2;
        let y = rect.top - gap;

        switch (position) {
          case 'bottom':
            y = rect.bottom + gap;
            break;
          case 'left':
            x = rect.left - gap;
            y = rect.top + rect.height / 2;
            break;
          case 'right':
            x = rect.right + gap;
            y = rect.top + rect.height / 2;
            break;
        }

        setCoords({ x, y });
        setVisible(true);
      }
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
    left: '-translate-x-full -translate-y-1/2',
    right: '-translate-y-1/2',
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>

      {visible &&
        createPortal(
          <div
            role="tooltip"
            className={cn(
              'fixed z-50 px-2.5 py-1.5 text-xs font-medium text-foreground bg-background-elevated border border-border rounded-lg shadow-xl',
              'pointer-events-none animate-in fade-in-0 zoom-in-95',
              positionClasses[position],
              className
            )}
            style={{
              left: coords.x,
              top: coords.y,
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
