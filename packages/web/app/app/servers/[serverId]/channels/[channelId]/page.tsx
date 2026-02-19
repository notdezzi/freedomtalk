'use client';

import { AppShell } from '@/components/layout';
import { MessageView } from '@/components/messaging';
import { useParams } from 'next/navigation';
import { useState } from 'react';

// Temporary mock data
const mockMessages = [
  {
    id: '1',
    channelId: 'channel-1',
    serverId: 'server-1',
    authorId: 'user-1',
    author: {
      id: 'user-1',
      username: 'Alice',
      displayName: 'Alice',
    },
    content: 'Welcome to the server!',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: '2',
    channelId: 'channel-1',
    serverId: 'server-1',
    authorId: 'user-2',
    author: {
      id: 'user-2',
      username: 'Bob',
      displayName: 'Bob',
    },
    content: 'Thanks for having me here!',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: '3',
    channelId: 'channel-1',
    serverId: 'server-1',
    authorId: 'user-3',
    author: {
      id: 'user-3',
      username: 'Charlie',
      displayName: 'Charlie',
    },
    content: 'Hey everyone! 👋',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];

export default function ChannelPage() {
  const params = useParams();
  const serverId = params.serverId as string;
  const channelId = params.channelId as string;
  const [messages] = useState(mockMessages);

  const handleSend = (content: string, attachments?: File[]) => {
    console.log('Send message:', content, attachments);
    // TODO: Implement message sending
  };

  return (
    <AppShell sectionName="general">
      <div className="flex h-full flex-col">
        {/* Channel header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">#</span>
            <span className="font-semibold text-white">general</span>
          </div>
        </div>

        {/* Messages */}
        <MessageView
          context="server"
          channelId={channelId}
          messages={messages}
          onSend={handleSend}
        />
      </div>
    </AppShell>
  );
}
