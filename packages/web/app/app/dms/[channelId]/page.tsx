'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDMStore } from '@/stores/dmStore';
import { useMessageStore } from '@/stores/messageStore';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { MessageList, MessageInput } from '@/components/messaging';
import { Loader2, Users, Phone, Video, Pin, Bell, BellOff, UserPlus } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function DMChannelPage() {
  const params = useParams();
  const router = useRouter();
  const channelId = params.channelId as string;
  const { user } = useAuth();
  const { channels, getChannel, getChannelName, getChannelIcon, fetchChannels, setCurrentChannel, updateChannelMuted } = useDMStore();
  const { fetchMessages, loading, messages } = useMessageStore();
  const { isConnected, joinChannel, leaveChannel } = useSocket();
  const [loadingChannel, setLoadingChannel] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // Use ref to track fetched channels to prevent duplicate requests
  const fetchedMessagesRef = useRef<Set<string>>(new Set());
  const hasLoadedChannelRef = useRef(false);

  const channel = getChannel(channelId);

  useEffect(() => {
    // Only load channel once
    if (hasLoadedChannelRef.current) return;

    const loadChannel = async () => {
      hasLoadedChannelRef.current = true;
      if (channels.length === 0) {
        await fetchChannels();
      }
      setCurrentChannel(channelId);
      setLoadingChannel(false);
    };

    loadChannel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // Fetch notification settings
  useEffect(() => {
    const fetchNotificationSettings = async () => {
      if (channelId) {
        try {
          const response = await apiClient.getDMNotificationSettings(channelId);
          if (response.success && response.data) {
            setIsMuted(response.data.isMuted);
          }
        } catch (error) {
          console.error('Failed to fetch notification settings:', error);
        }
      }
    };

    fetchNotificationSettings();
  }, [channelId]);

  // Fetch messages when channel is loaded (only once per channel)
  useEffect(() => {
    // Skip if already fetched, currently loading, or messages already exist
    if (
      channel &&
      !loading[channelId] &&
      !fetchedMessagesRef.current.has(channelId) &&
      !messages[channelId]
    ) {
      fetchedMessagesRef.current.add(channelId);
      fetchMessages(channelId, undefined, true); // isDM = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, channelId, loading, messages]);

  // Join/leave room for real-time updates
  useEffect(() => {
    if (isConnected && channelId) {
      joinChannel(channelId);

      return () => {
        leaveChannel(channelId);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, channelId]);

  const handleToggleMute = async () => {
    try {
      if (isMuted) {
        await apiClient.unmuteDM(channelId);
        setIsMuted(false);
        updateChannelMuted(channelId, false);
      } else {
        await apiClient.muteDM(channelId);
        setIsMuted(true);
        updateChannelMuted(channelId, true);
      }
    } catch (error) {
      console.error('Failed to toggle mute:', error);
    }
  };

  if (loadingChannel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background">
        <div className="text-foreground-muted text-lg">Channel not found</div>
        <button
          onClick={() => router.push('/app')}
          className="mt-4 px-4 py-2 bg-accent text-background rounded hover:bg-accent-hover"
        >
          Go back
        </button>
      </div>
    );
  }

  const channelName = getChannelName(channel);
  const channelIcon = getChannelIcon(channel);

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border bg-background-elevated shrink-0">
        <div className="flex items-center gap-3">
          {/* Icon */}
          {channel.type === 'group_dm' ? (
            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
              {channelIcon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={channelIcon}
                  alt=""
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <Users className="w-3.5 h-3.5 text-accent" />
              )}
            </div>
          ) : (
            <div
              className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-background cursor-pointer hover:opacity-80"
              onClick={() => {
                // Open user profile for the other user in the DM
                const otherUser = channel.recipients.find(r => r.id !== user?.id);
                if (otherUser) {
                  // TODO: Open user profile modal
                }
              }}
            >
              {channelIcon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={channelIcon}
                  alt=""
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                channelName.charAt(0).toUpperCase()
              )}
            </div>
          )}

          {/* Name - clickable to open profile for DMs */}
          <span
            className={`font-semibold ${channel.type !== 'group_dm' ? 'cursor-pointer hover:underline' : ''}`}
            onClick={() => {
              if (channel.type !== 'group_dm') {
                const otherUser = channel.recipients.find(r => r.id !== user?.id);
                if (otherUser) {
                  // TODO: Open user profile modal
                }
              }
            }}
          >
            {channelName}
          </span>

          {channel.type === 'group_dm' && (
            <span className="text-xs text-foreground-muted">
              ({channel.recipients.length + 1} members)
            </span>
          )}

          <div className="h-6 w-px bg-border mx-2" />

          {/* Quick actions */}
          <button
            className="p-1.5 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
            title="Start Call"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
            title="Start Video"
          >
            <Video className="w-4 h-4" />
          </button>
          {channel.type === 'group_dm' && (
            <button
              className="p-1.5 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
              title="Add Members"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
            title="Pinned Messages"
          >
            <Pin className="w-4 h-4" />
          </button>
          <button
            onClick={handleToggleMute}
            className={`p-1.5 rounded hover:bg-background-surface transition-colors ${
              isMuted ? 'text-error' : 'text-foreground-muted hover:text-foreground'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <BellOff className="w-4 h-4" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Messages */}
      <MessageList channelId={channelId} />

      {/* Input */}
      <MessageInput channelId={channelId} isDM />
    </div>
  );
}
