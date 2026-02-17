'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import ServerSidebar from '@/components/app/ServerSidebar';
import ChannelSidebar from '@/components/app/ChannelSidebar';
import MemberSidebar from '@/components/app/MemberSidebar';
import { DMSidebar } from '@/components/dm';
import ConnectionStatus from '@/components/app/ConnectionStatus';
import ContextMenuRenderer from '@/components/common/ContextMenuRenderer';
import { useUIStore } from '@/stores/uiStore';
import { useServerStore } from '@/stores/serverStore';
import { useChannelStore } from '@/stores/channelStore';
import { useMemberStore } from '@/stores/memberStore';
import { useMessageStore } from '@/stores/messageStore';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const { status: socketStatus, joinChannel, leaveChannel } = useSocket();
  const { isMobile, setIsMobile, isMemberSidebarOpen } = useUIStore();
  const { servers, currentServerId, setCurrentServer, fetchServers, isLoading: serversLoading } = useServerStore();
  const { getChannelsByServer, setCurrentChannel, currentChannelId, fetchChannels, loading: channelsLoading, serverChannels } = useChannelStore();
  const { fetchMembers, loading: membersLoading, members } = useMemberStore();
  const { fetchMessages, loading: messagesLoading, messages: messagesStore } = useMessageStore();
  const [mounted, setMounted] = useState(false);

  // Use refs to track what has been fetched to prevent duplicate requests
  const fetchedServersRef = useRef(false);
  const fetchedChannelsRef = useRef<Set<string>>(new Set());
  const fetchedMembersRef = useRef<Set<string>>(new Set());
  const fetchedMessagesRef = useRef<Set<string>>(new Set());
  const currentChannelRef = useRef<string | null>(null);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
    // Clear invalid persisted state (snowflake IDs are typically 18-20 characters)
    if (currentServerId && currentServerId.length < 15) {
      setCurrentServer(null);
    }
  }, []);

  // Handle mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  // Auth redirect
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch servers once when authenticated
  useEffect(() => {
    if (isAuthenticated && !fetchedServersRef.current && !serversLoading) {
      fetchedServersRef.current = true;
      fetchServers();
    }
  }, [isAuthenticated, serversLoading, fetchServers]);

  // Fetch channels and members when server changes (only once per server)
  useEffect(() => {
    // Validate serverId is a proper ID (20 characters for snowflake)
    if (currentServerId && currentServerId.length >= 15 && !channelsLoading[currentServerId] && !membersLoading[currentServerId]) {
      // Fetch channels if not already fetched
      if (!fetchedChannelsRef.current.has(currentServerId) && !serverChannels[currentServerId]) {
        fetchedChannelsRef.current.add(currentServerId);
        fetchChannels(currentServerId);
      }

      // Fetch members if not already fetched
      if (!fetchedMembersRef.current.has(currentServerId) && !members[currentServerId]) {
        fetchedMembersRef.current.add(currentServerId);
        fetchMembers(currentServerId);
      }
    }
  }, [currentServerId, channelsLoading, membersLoading, serverChannels, members, fetchChannels, fetchMembers]);

  // Navigate to first channel when server is selected and channels are loaded
  useEffect(() => {
    if (currentServerId && currentServerId.length >= 15 && serverChannels[currentServerId] && serverChannels[currentServerId].length > 0) {
      // Only navigate if we're on the server page (not already on a channel)
      if (pathname === `/app/servers/${currentServerId}` || pathname === '/app') {
        const { channels } = getChannelsByServer(currentServerId);
        const firstTextChannel = channels.find((c) => c.type === 'text');
        if (firstTextChannel && firstTextChannel.id !== currentChannelId) {
          setCurrentChannel(firstTextChannel.id);
          router.replace(`/app/servers/${currentServerId}/channels/${firstTextChannel.id}`);
        }
      }
    }
  }, [currentServerId, serverChannels, pathname, getChannelsByServer, currentChannelId, setCurrentChannel, router]);

  // Fetch messages when channel changes (only once per channel)
  useEffect(() => {
    // Validate channelId is a proper ID (snowflake IDs are typically 18-20 characters)
    if (currentChannelId &&
        currentChannelId.length >= 15 &&
        !messagesLoading[currentChannelId] &&
        !fetchedMessagesRef.current.has(currentChannelId) &&
        !messagesStore[currentChannelId]) {
      fetchedMessagesRef.current.add(currentChannelId);
      fetchMessages(currentChannelId);
    }
  }, [currentChannelId, messagesLoading, messagesStore, fetchMessages]);

  // Subscribe to channel room when channel changes
  useEffect(() => {
    if (socketStatus === 'connected' && currentChannelId && currentChannelRef.current !== currentChannelId) {
      // Leave previous channel
      if (currentChannelRef.current) {
        leaveChannel(currentChannelRef.current);
      }

      // Join new channel
      currentChannelRef.current = currentChannelId;
      joinChannel(currentChannelId);
    }

    return () => {
      if (currentChannelRef.current) {
        leaveChannel(currentChannelRef.current);
        currentChannelRef.current = null;
      }
    };
  }, [socketStatus, currentChannelId, joinChannel, leaveChannel]);

  if (!mounted || isLoading || !isAuthenticated || (serversLoading && servers.length === 0)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm text-foreground-muted">Loading...</p>
      </div>
    );
  }

  // Determine if we're on a DM route
  const isDMRoute = pathname.startsWith('/app/dms') || pathname === '/app';

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Server Sidebar */}
      <ServerSidebar />

      {/* DM Sidebar or Channel Sidebar */}
      {isDMRoute ? (
        <DMSidebar />
      ) : (
        <ChannelSidebar />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {children}
      </main>

      {/* Member Sidebar (only for server channels) */}
      {isMemberSidebarOpen && currentServerId && !isDMRoute && <MemberSidebar />}

      {/* Connection Status Indicator */}
      <ConnectionStatus />

      {/* Context Menus */}
      <ContextMenuRenderer />
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AppLayoutContent>{children}</AppLayoutContent>
    </Suspense>
  );
}
