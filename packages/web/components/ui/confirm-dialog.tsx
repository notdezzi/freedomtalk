'use client';

import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import { Modal } from './modal';
import { Button } from './button';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

export interface PromptOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  inputPlaceholder?: string;
  inputDefaultValue?: string;
}

type DialogResult = boolean | string | null;

interface ConfirmState {
  open: boolean;
  options: ((ConfirmOptions | PromptOptions) & { isPrompt?: boolean }) | null;
  resolve: ((value: DialogResult) => void) | null;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: Omit<PromptOptions, 'showInput'>) => Promise<string | null>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirmDialog() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider');
  }
  return context;
}

const variantConfig: Record<ConfirmVariant, { icon: typeof AlertTriangle; iconColor: string; confirmVariant: 'primary' | 'danger' }> = {
  danger: { icon: XCircle, iconColor: 'text-error', confirmVariant: 'danger' },
  warning: { icon: AlertTriangle, iconColor: 'text-yellow-500', confirmVariant: 'primary' },
  info: { icon: Info, iconColor: 'text-blue-500', confirmVariant: 'primary' },
  success: { icon: CheckCircle, iconColor: 'text-green-500', confirmVariant: 'primary' },
};

function ConfirmDialogComponent({
  open,
  options,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  options: ((ConfirmOptions | PromptOptions) & { isPrompt?: boolean }) | null;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
}) {
  const [inputValue, setInputValue] = useState('');

  if (!options) return null;

  const config = variantConfig[options.variant || 'info'];
  const Icon = config.icon;
  const isPrompt = options.isPrompt;

  const handleConfirm = () => {
    if (isPrompt) {
      onConfirm(inputValue);
    } else {
      onConfirm();
    }
  };

  return (
    <Modal open={open} onClose={onCancel} size="sm">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className={cn('flex-shrink-0', config.iconColor)}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">{options.title}</h3>
            <p className="mt-2 text-sm text-foreground-muted">{options.message}</p>

            {isPrompt && (
              <input
                type="text"
                className="mt-4 w-full rounded-md border border-border bg-background-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={'inputPlaceholder' in options ? options.inputPlaceholder : undefined}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                autoFocus
              />
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            {options.cancelLabel || 'Cancel'}
          </Button>
          <Button
            variant={config.confirmVariant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
          >
            {options.confirmLabel || 'Confirm'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    options: null,
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, options: { ...options, isPrompt: false }, resolve: resolve as (value: DialogResult) => void });
    });
  }, []);

  const prompt = useCallback((options: Omit<PromptOptions, 'showInput'>): Promise<string | null> => {
    return new Promise((resolve) => {
      setState({ open: true, options: { ...options, isPrompt: true }, resolve: resolve as (value: DialogResult) => void });
    });
  }, []);

  const handleConfirm = useCallback((value?: string) => {
    if (state.resolve) {
      if (state.options?.isPrompt) {
        state.resolve(value ?? '');
      } else {
        state.resolve(true);
      }
    }
    setState((prev) => ({ ...prev, open: false, resolve: null }));
  }, [state.resolve, state.options]);

  const handleCancel = useCallback(() => {
    if (state.resolve) {
      state.resolve(null);
    }
    setState((prev) => ({ ...prev, open: false, resolve: null }));
  }, [state.resolve]);

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}
      <ConfirmDialogComponent
        open={state.open}
        options={state.options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}
