'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll focused option into view
  useEffect(() => {
    if (listRef.current && focusedIndex >= 0) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      const focusedItem = items[focusedIndex];
      if (focusedItem) {
        focusedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  const handleSelect = useCallback(
    (option: DropdownOption) => {
      if (option.disabled) return;
      onChange?.(option.value);
      setIsOpen(false);
      setFocusedIndex(-1);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (isOpen && focusedIndex >= 0) {
            handleSelect(options[focusedIndex]);
          } else {
            setIsOpen(!isOpen);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
            setFocusedIndex(0);
          } else {
            setFocusedIndex((prev) => {
              const nextIndex = prev + 1;
              // Skip disabled options
              while (nextIndex < options.length && options[nextIndex]?.disabled) {
                return nextIndex + 1;
              }
              return nextIndex < options.length ? nextIndex : prev;
            });
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (isOpen) {
            setFocusedIndex((prev) => {
              const nextIndex = prev - 1;
              // Skip disabled options
              while (nextIndex >= 0 && options[nextIndex]?.disabled) {
                return nextIndex - 1;
              }
              return nextIndex >= 0 ? nextIndex : 0;
            });
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
        case 'Tab':
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
      }
    },
    [disabled, isOpen, focusedIndex, options, handleSelect]
  );

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        aria-disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded bg-background-surface border transition-colors ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-border'
            : isOpen
            ? 'border-accent ring-1 ring-accent'
            : 'border-border hover:border-border-hover'
        }`}
      >
        <span className={selectedOption ? 'text-foreground' : 'text-foreground-muted'}>
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.icon}
              {selectedOption.label}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-foreground-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel || 'Options'}
          tabIndex={-1}
          className="absolute z-50 w-full mt-1 py-1 bg-background-elevated border border-border rounded-lg shadow-xl max-h-60 overflow-auto"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={value === option.value}
              aria-disabled={option.disabled}
              onClick={() => handleSelect(option)}
              className={`px-3 py-2 cursor-pointer transition-colors ${
                option.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : index === focusedIndex || value === option.value
                  ? 'bg-accent-muted text-accent'
                  : 'hover:bg-background-surface'
              }`}
            >
              <div className="flex items-center gap-2">
                {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                <div>
                  <p className="font-medium">{option.label}</p>
                  {option.description && (
                    <p className="text-xs text-foreground-muted">{option.description}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
