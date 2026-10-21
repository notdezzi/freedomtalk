'use client';

import { useState } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { useSendFriendRequest } from '@/features/friends';
import { toast } from '@/stores/toast-store';

interface AddFriendModalProps {
  onClose: () => void;
}

export function AddFriendModal({ onClose }: AddFriendModalProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const sendFriendRequest = useSendFriendRequest();

  const handleSend = () => {
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Please enter a username');
      return;
    }

    setError('');
    setSuccess('');

    sendFriendRequest.mutate(trimmed, {
      onSuccess: () => {
        setSuccess(`Friend request sent to @${trimmed}`);
        toast.success(`Friend request sent to @${trimmed}`);
        setUsername('');
      },
      onError: (err: any) => {
        const message =
          err?.message === 'User not found'
            ? 'User not found. Check the spelling and try again.'
            : err?.message || 'Failed to send friend request';
        setError(message);
        toast.error(message);
      },
    });
  };

  return (
    <Modal open onClose={onClose} title="Add Friend" size="md">
      <div className="py-4">
        <p className="text-foreground-muted text-sm mb-4">
          You can add friends with their username.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase mb-2">
              Username
            </label>
            <Input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
                setSuccess('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !sendFriendRequest.isPending) {
                  handleSend();
                }
              }}
              placeholder="Enter a username"
              error={error}
              disabled={sendFriendRequest.isPending}
            />
          </div>

          {success && (
            <p className="text-sm text-success">{success}</p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={handleSend}
              loading={sendFriendRequest.isPending}
              disabled={!username.trim()}
            >
              Send Friend Request
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
