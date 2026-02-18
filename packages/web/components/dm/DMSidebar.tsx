'use client';

import { useState, useEffect } from 'react';
import { MessageSquarePlus, Users, AtSign, Search, X } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useDMStore } from '@/stores/dmStore';
import { useFriendStore } from '@/stores/friendStore';
import { useAuth } from '@/hooks/useAuth';
import CreateDMModal from './CreateDMModal';

export default function DMSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { channels, currentChannelId, fetchChannels, setCurrentChannel, getChannelName, getChannelIcon } = useDMStore();
  const friendStore = useFriendStore();
  const incomingRequests = friendStore?.incomingRequests ?? [];
  const fetchPendingRequests = friendStore?.fetchPendingRequests;
  const [showCreateDM, setShowCreateDM] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchChannels();
      if (fetchPendingRequests) {
        fetchPendingRequests();
      }
    }
  }, [user, fetchChannels, fetchPendingRequests]);

  const handleChannelClick = (channelId: string) => {
    setCurrentChannel(channelId);
    // Clear server selection when navigating to DMs
    const { setCurrentServer } = require('@/stores/serverStore').useServerStore.getState();
    setCurrentServer(null);
    router.push(`/app/dms/${channelId}`);
  };

  const filteredChannels = channels.filter((channel) => {
    if (!searchQuery) return true;
    const name = getChannelName(channel).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <>
      {/* Header */}
      <div className="p-3 flex items-center justify-between border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <AtSign className="w-5 h-5 text-foreground-muted" />
          <span className="font-semibold">Direct Messages</span>
        </div>
        <button
          onClick={() => setShowCreateDM(true)}
          className="p-1.5 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
          title="Create DM"
        >
          <MessageSquarePlus className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
      <div className="p-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search DMs..."
            className="w-full pl-8 pr-8 py-1.5 text-sm bg-background-surface rounded border border-border focus:border-accent focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto">
        {/* Friends Button */}
        <button
          onClick={() => router.push('/app')}
          className={`w-full flex items-center gap-3 px-3 py-2 mx-1 rounded hover:bg-background-surface transition-colors ${
            pathname === '/app' ? 'bg-background-surface' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <Users className="w-4 h-4 text-accent" />
          </div>
          <span className="text-sm font-medium">Friends</span>
          {incomingRequests.length > 0 && (
            <span className="ml-auto w-5 h-5 rounded-full bg-accent text-background text-xs flex items-center justify-center">
              {incomingRequests.length > 9 ? '9+' : incomingRequests.length}
            </span>
          )}
        </button>

        <div className="mt-2">
          <div className="px-3 py-1 text-xs font-semibold text-foreground-muted uppercase">
            Direct Messages
          </div>

          {filteredChannels.length === 0 ? (
            <div className="px-3 py-4 text-sm text-foreground-muted text-center">
              {searchQuery ? 'No DMs found' : 'No direct messages yet'}
            </div>
          ) : (
            filteredChannels.map((channel) => {
              const name = getChannelName(channel);
              const icon = getChannelIcon(channel);
              const isActive = currentChannelId === channel.id;

              return (
                <button
                  key={channel.id}
                  onClick={() => handleChannelClick(channel.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 mx-1 rounded transition-colors ${
                    isActive
                      ? 'bg-background-surface'
                      : 'hover:bg-background-surface/50'
                  }`}
                >
                  {channel.type === 'group_dm' ? (
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                      {icon ? (
                        <img
                          src={icon}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Users className="w-4 h-4 text-accent" />
                      )}
                    </div>
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-background"
                    >
                      {icon ? (
                        <img
                          src={icon}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        name.charAt(0).toUpperCase()
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium truncate">{name}</div>
                    {channel.type === 'group_dm' && (
                      <div className="text-xs text-foreground-muted">
                        {channel.recipients.length + 1} members
                      </div>
                    )}
                  </div>
                  {channel.unreadCount && channel.unreadCount > 0 && (
                    <div className="w-5 h-5 rounded-full bg-accent text-background text-xs flex items-center justify-center">
                      {channel.unreadCount > 9 ? '9+' : channel.unreadCount}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Create DM Modal */}
      {showCreateDM && (
        <CreateDMModal onClose={() => setShowCreateDM(false)} />
      )}
    </>
  );
}
