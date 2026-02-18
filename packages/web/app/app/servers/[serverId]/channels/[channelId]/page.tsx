'use client';

import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { MessageList, MessageInput } from '@/components/messaging';
import VoiceChannelView from '@/components/voice/VoiceChannelView';
import { useChannelStore } from '@/stores/channelStore';
import { useServerStore } from '@/stores/serverStore';

export default function ChannelPage() {
  const params = useParams();
  const serverId = params.serverId as string;
  const channelId = params.channelId as string;

  const { setCurrentChannel, getChannel } = useChannelStore();
  const { setCurrentServer } = useServerStore();

  // Track if we've set the current context
  const contextSetRef = useRef(false);

  // Set current server and channel context (only once)
  useEffect(() => {
    if (!contextSetRef.current) {
      contextSetRef.current = true;
      setCurrentServer(serverId);
      setCurrentChannel(channelId);
    }
  }, [serverId, channelId, setCurrentServer, setCurrentChannel]);

  const channel = getChannel(channelId);

  // Show loading or not found state
  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Channel not found</h2>
          <p className="text-foreground-muted">
            This channel doesn&apos;t exist or you don&apos;t have access to it.
          </p>
        </div>
      </div>
    );
  }

  // Type-based routing: Voice channels render VoiceChannelView
  if (channel.type === 'voice') {
    return (
      <VoiceChannelView channelId={channelId} serverId={serverId} />
    );
  }

  // Text channels render MessageList + MessageInput
  return (
    <div className="flex-1 flex flex-col">
      <MessageList channelId={channelId} serverId={serverId} />
      <MessageInput channelId={channelId} serverId={serverId} />
    </div>
  );
}
