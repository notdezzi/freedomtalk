'use client';

import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { Hash, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateChannel } from '@/features/channels';

interface CreateChannelModalProps {
  serverId: string;
  onClose: () => void;
}

export function CreateChannelModal({ serverId, onClose }: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'voice'>('text');
  const [error, setError] = useState('');

  const createChannel = useCreateChannel();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!serverId) {
      setError('Server ID is missing. Please try again from a server page.');
      return;
    }

    if (!name.trim()) {
      setError('Channel name is required');
      return;
    }

    if (name.length < 2 || name.length > 100) {
      setError('Channel name must be between 2 and 100 characters');
      return;
    }

    createChannel.mutate(
      {
        serverId,
        data: { name: name.trim(), type },
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err: any) => {
          setError(err.message || 'Failed to create channel');
        },
      }
    );
  };

  // Don't render if serverId is not provided
  if (!serverId) {
    return (
      <Modal open onClose={onClose} className="max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Error</h2>
          <p className="text-error mb-4">Unable to create channel: Server ID is missing.</p>
          <div className="flex justify-end">
            <Button onClick={onClose} variant="secondary">Close</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} className="max-w-md">
      <form onSubmit={handleSubmit} className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Create Channel</h2>

        {/* Channel type */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-foreground-muted uppercase mb-2 block">
            Channel Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('text')}
              className={cn(
                'flex items-center gap-3 p-3 rounded border transition-colors',
                type === 'text'
                  ? 'bg-background-surface border-border'
                  : 'bg-background-elevated border-border hover:border-border'
              )}
            >
              <Hash className="h-5 w-5 text-foreground-muted" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Text</p>
                <p className="text-xs text-foreground-muted">Send messages and files</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setType('voice')}
              className={cn(
                'flex items-center gap-3 p-3 rounded border transition-colors',
                type === 'voice'
                  ? 'bg-background-surface border-border'
                  : 'bg-background-elevated border-border hover:border-border'
              )}
            >
              <Volume2 className="h-5 w-5 text-foreground-muted" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Voice</p>
                <p className="text-xs text-foreground-muted">Hang out with voice and video</p>
              </div>
            </button>
          </div>
        </div>

        {/* Channel name */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-foreground-muted uppercase mb-2 block">
            Channel Name
          </label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle" />
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder={type === 'text' ? 'new-channel' : 'General'}
              className={cn(
                'w-full bg-background-surface text-foreground rounded pl-8 pr-3 py-2 border',
                error ? 'border-red-500' : 'border-border'
              )}
            />
          </div>
          {error && <p className="text-error text-sm mt-1">{error}</p>}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={createChannel.isPending}>
            {createChannel.isPending ? 'Creating...' : 'Create Channel'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
