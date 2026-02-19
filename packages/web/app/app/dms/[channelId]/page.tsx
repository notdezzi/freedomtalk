'use client';

import { AppShell } from '@/components/layout';
import { MessageView } from '@/components/messaging';
import { useParams } from 'next/navigation';
import { useState } from 'react';

// Temporary mock data
const mockMessages = [
  {
    id: '1',
    channelId: 'dm-1',
    authorId: 'user-1',
    author: {
      id: 'user-1',
      username: 'Alice',
      displayName: 'Alice',
    },
    content: 'Hey! How are you?',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: '2',
    channelId: 'dm-1',
    authorId: 'user-2',
    author: {
      id: 'user-2',
      username: 'You',
      displayName: 'You',
    },
    content: "I'm doing great, thanks for asking!",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: '3',
    channelId: 'dm-1',
    authorId: 'user-1',
    author: {
      id: 'user-1',
      username: 'Alice',
      displayName: 'Alice',
    },
    content: 'Want to play some games later?',
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
];

export default function DMPage() {
  const params = useParams();
  const channelId = params.channelId as string;
  const [messages] = useState(mockMessages);

  const handleSend = (content: string, attachments?: File[]) => {
    console.log('Send DM:', content, attachments);
    // TODO: Implement message sending
  };

  return (
    <AppShell sectionName="Alice">
      <div className="flex h-full flex-col">
        {/* DM header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
              A
            </div>
            <span className="font-semibold text-white">Alice</span>
          </div>
        </div>

        {/* Messages */}
        <MessageView
          context="dm"
          channelId={channelId}
          messages={messages}
          onSend={handleSend}
          placeholder="Message @Alice"
        />
      </div>
    </AppShell>
  );
}
