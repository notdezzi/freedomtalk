'use client';

import { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';
import { AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-provider';
import { useServerChannelsAndCategories } from '@/features/servers';
import { useRouter } from 'next/navigation';

interface DeleteChannelModalProps {
  serverId: string;
  channelId: string;
  onClose: () => void;
}

export function DeleteChannelModal({ serverId, channelId, onClose }: DeleteChannelModalProps) {
  const [confirmName, setConfirmName] = useState('');
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const queryClient = useQueryClient();
  const router = useRouter();

  // Get channel data from cache
  const { data: serverData } = useServerChannelsAndCategories(serverId);
  const channel = serverData?.channels?.find(c => c.id === channelId);

  const handleDelete = async () => {
    if (!channel) {
      setError('Channel not found');
      return;
    }

    if (confirmName !== channel.name) {
      setError(`Please type "${channel.name}" to confirm`);
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const response = await apiClient.deleteChannel(serverId, channelId);

      if (response.success) {
        // Invalidate channels query to refresh the list
        queryClient.invalidateQueries({
          queryKey: queryKeys.servers.channels(serverId)
        });
        // Navigate to first channel
        router.push(`/app/servers/${serverId}/channels/first`);
        onClose();
      } else {
        setError(response.error?.message || 'Failed to delete channel');
      }
    } catch (err) {
      setError('Failed to delete channel');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!channel) {
    return (
      <Modal open onClose={onClose} className="max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Error</h2>
          <p className="text-error mb-4">Channel not found.</p>
          <div className="flex justify-end">
            <Button onClick={onClose} variant="secondary">Close</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} className="max-w-md">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-error/20 rounded-full">
            <AlertTriangle className="h-6 w-6 text-error" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Delete Channel</h2>
        </div>

        <p className="text-foreground-muted mb-4">
          Are you sure you want to delete <span className="text-foreground font-semibold">#{channel.name}</span>?
          This action cannot be undone and will permanently delete all messages in this channel.
        </p>

        <div className="mb-4">
          <label className="text-xs font-semibold text-foreground-muted uppercase mb-2 block">
            Type "{channel.name}" to confirm
          </label>
          <input
            type="text"
            value={confirmName}
            onChange={(e) => {
              setConfirmName(e.target.value);
              setError('');
            }}
            className="w-full bg-background-surface text-foreground rounded px-3 py-2 border border-border focus:border-red-500 focus:outline-none"
            placeholder={channel.name}
          />
        </div>

        {error && (
          <p className="text-error text-sm mb-4">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={confirmName !== channel.name || isDeleting}
            className="bg-error hover:bg-error/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete Channel'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
