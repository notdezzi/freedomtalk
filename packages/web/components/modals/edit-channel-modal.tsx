'use client';

import { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';
import { useServerChannelsAndCategories } from '@/features/servers';
import { apiClient } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-provider';

interface EditChannelModalProps {
  serverId: string;
  channelId: string;
  onClose: () => void;
}

export function EditChannelModal({ serverId, channelId, onClose }: EditChannelModalProps) {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [nsfw, setNsfw] = useState(false);
  const [rateLimitPerUser, setRateLimitPerUser] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

  // Get channels from cache to find the current channel
  const { data: serverData } = useServerChannelsAndCategories(serverId);
  const channels = serverData?.channels || [];

  // Load channel data
  useEffect(() => {
    const loadChannel = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.getChannel(serverId, channelId);
        if (response.success && response.data) {
          const channel = response.data;
          setName(channel.name || '');
          setTopic(channel.topic || '');
          setNsfw(channel.nsfw || false);
          setRateLimitPerUser(channel.rateLimitPerUser || 0);
        } else {
          setError('Channel not found');
        }
      } catch (err) {
        setError('Failed to load channel');
      } finally {
        setIsLoading(false);
      }
    };

    if (serverId && channelId) {
      loadChannel();
    }
  }, [serverId, channelId]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Channel name is required');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await apiClient.updateChannel(serverId, channelId, {
        name: name.trim(),
        topic: topic.trim() || undefined,
        nsfw,
        rateLimitPerUser,
      });

      if (response.success) {
        // Invalidate channels query to refresh the list
        queryClient.invalidateQueries({
          queryKey: queryKeys.servers.channels(serverId)
        });
        onClose();
      } else {
        setError(response.error?.message || 'Failed to update channel');
      }
    } catch (err) {
      setError('Failed to update channel');
    } finally {
      setIsSaving(false);
    }
  };

  const channel = channels.find(c => c.id === channelId);
  const isVoice = channel?.type === 'voice';

  if (isLoading) {
    return (
      <Modal open onClose={onClose} className="max-w-md">
        <div className="p-6 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} className="max-w-md">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Edit Channel</h2>

        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
              Channel Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="channel-name"
            />
          </div>

          {!isVoice && (
            <>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
                  Topic
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="Channel topic (optional)"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
                  Slow Mode (seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  max="21600"
                  value={rateLimitPerUser}
                  onChange={(e) => setRateLimitPerUser(parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Users can only send a message every X seconds (0 = disabled)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="nsfw"
                  checked={nsfw}
                  onChange={(e) => setNsfw(e.target.checked)}
                  className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                />
                <label htmlFor="nsfw" className="text-sm text-gray-300">
                  NSFW Channel
                </label>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
