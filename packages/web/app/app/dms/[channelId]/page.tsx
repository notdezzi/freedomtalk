'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDMStore } from '@/stores/dmStore';
import { useMessageStore } from '@/stores/messageStore';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { MessageList, MessageInput } from '@/components/messaging';
import { Loader2, Users, Phone, Video, Pin, Bell, BellOff, UserPlus, Settings } from 'lucide-react';

export default function DMChannelPage() {
  const params = useParams();
  const router = useRouter();
  const channelId = params.channelId as string;
  const { user } = useAuth();
  const { channels, getChannel, getChannelName, getChannelIcon, fetchChannels, setCurrentChannel } = useDMStore();
  const { fetchMessages, loading, messages } = useMessageStore();
  const { isConnected, sendMessage, joinChannel, leaveChannel } = useSocket();
  const [loadingChannel, setLoadingChannel] = useState(true);

  // Use ref to track fetched channels to prevent duplicate requests
  const fetchedMessagesRef = useRef<Set<string>>(new Set());

  const channel = getChannel(channelId);

  useEffect(() => {
    const loadChannel = async () => {
      if (channels.length === 0) {
        await fetchChannels();
      }
      setCurrentChannel(channelId);
      setLoadingChannel(false);
    };

    loadChannel();
  }, [channelId, channels.length, fetchChannels, setCurrentChannel]);

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
      fetchMessages(channelId);
    }
  }, [channel, channelId, loading, messages, fetchMessages]);

  // Join/leave room for real-time updates
  useEffect(() => {
    if (isConnected && channelId) {
      joinChannel(channelId);

      return () => {
        leaveChannel(channelId);
      };
    }
  }, [isConnected, channelId, joinChannel, leaveChannel]);

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
              className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-background"
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

          {/* Name */}
          <span className="font-semibold">{channelName}</span>

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
            className="p-1.5 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
            title="Notifications"
          >
            {channel.isMuted ? (
              <BellOff className="w-4 h-4" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
          </button>
          <button
            className="p-1.5 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
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
