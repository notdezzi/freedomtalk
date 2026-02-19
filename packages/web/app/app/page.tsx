'use client';

import { AppShell } from '@/components/layout';
import { MessageView } from '@/components/messaging';
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
    content: 'Hey! Welcome to the app!',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: '2',
    channelId: 'dm-1',
    authorId: 'user-2',
    author: {
      id: 'user-2',
      username: 'Bob',
      displayName: 'Bob',
    },
    content: 'Thanks! This looks great!',
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
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
    content: 'Let me know if you need anything!',
    createdAt: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
  },
];

export default function AppPage() {
  const [messages] = useState(mockMessages);

  return (
    <AppShell sectionName="Friends">
      <div className="flex h-full flex-col">
        {/* Friends list header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <div className="flex gap-4">
            <button className="text-white font-medium">Online</button>
            <button className="text-gray-400 hover:text-white">All</button>
            <button className="text-gray-400 hover:text-white">Pending</button>
            <button className="text-gray-400 hover:text-white">Blocked</button>
            <button className="text-green-500 hover:text-green-400">Add Friend</button>
          </div>
        </div>

        {/* Friends list content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-center text-gray-400 mt-20">
            <h2 className="text-xl font-semibold mb-2">Welcome to FreedomTalk!</h2>
            <p>Click on a friend to start a conversation, or add new friends.</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
