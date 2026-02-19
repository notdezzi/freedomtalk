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
          <h2 className="text-xl font-semibold text-white mb-4">Error</h2>
          <p className="text-red-400 mb-4">Unable to create channel: Server ID is missing.</p>
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
        <h2 className="text-xl font-semibold text-white mb-4">Create Channel</h2>

        {/* Channel type */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
            Channel Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('text')}
              className={cn(
                'flex items-center gap-3 p-3 rounded border transition-colors',
                type === 'text'
                  ? 'bg-gray-700 border-gray-600'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              )}
            >
              <Hash className="h-5 w-5 text-gray-400" />
              <div className="text-left">
                <p className="text-sm font-medium text-white">Text</p>
                <p className="text-xs text-gray-400">Send messages and files</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setType('voice')}
              className={cn(
                'flex items-center gap-3 p-3 rounded border transition-colors',
                type === 'voice'
                  ? 'bg-gray-700 border-gray-600'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              )}
            >
              <Volume2 className="h-5 w-5 text-gray-400" />
              <div className="text-left">
                <p className="text-sm font-medium text-white">Voice</p>
                <p className="text-xs text-gray-400">Hang out with voice and video</p>
              </div>
            </button>
          </div>
        </div>

        {/* Channel name */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
            Channel Name
          </label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder={type === 'text' ? 'new-channel' : 'General'}
              className={cn(
                'w-full bg-gray-700 text-white rounded pl-8 pr-3 py-2 border',
                error ? 'border-red-500' : 'border-gray-600'
              )}
            />
          </div>
          {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
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
