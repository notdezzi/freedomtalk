'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import ServerSidebar from '@/components/app/ServerSidebar';
import ChannelSidebar from '@/components/app/ChannelSidebar';
import MemberSidebar from '@/components/app/MemberSidebar';
import UserPanel from '@/components/app/UserPanel';
import VoiceConnectedPanel from '@/components/voice/VoiceConnectedPanel';
import { DMSidebar } from '@/components/dm';
import ConnectionStatus from '@/components/app/ConnectionStatus';
import ContextMenuRenderer from '@/components/common/ContextMenuRenderer';
import { ToastContainer } from '@/components/common';
import { PinnedMessagesModal } from '@/components/messaging';
import { useUIStore } from '@/stores/uiStore';
import { useVoiceStore } from '@/stores/voiceStore';
import { useServerStore } from '@/stores/serverStore';
import { useChannelStore } from '@/stores/channelStore';
import { useMemberStore } from '@/stores/memberStore';
import { useMessageStore } from '@/stores/messageStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Users, MessageCircle } from 'lucide-react';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, isOnboardingComplete } = useAuth();
  const { status: socketStatus, joinChannel, leaveChannel } = useSocket();
  const { setIsMobile, isMemberSidebarOpen } = useUIStore();
  const { isConnected: isVoiceConnected } = useVoiceStore();
  const {
    servers,
    currentServerId,
    setCurrentServer,
    fetchServers,
    isLoading: serversLoading,
  } = useServerStore();
  const {
    getChannelsByServer,
    setCurrentChannel,
    currentChannelId,
    fetchChannels,
    loading: channelsLoading,
    serverChannels,
  } = useChannelStore();
  const { fetchMembers, loading: membersLoading, members } = useMemberStore();
  const { fetchMessages, loading: messagesLoading, messages: messagesStore } = useMessageStore();
  const [mounted, setMounted] = useState(false);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

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

  // Onboarding redirect - check after auth is confirmed
  useEffect(() => {
    if (!isLoading && isAuthenticated && !isOnboardingComplete) {
      router.push('/onboarding');
    }
  }, [isAuthenticated, isLoading, isOnboardingComplete, router]);

  // Fetch servers once when authenticated
  useEffect(() => {
    if (isAuthenticated && !fetchedServersRef.current && !serversLoading) {
      fetchedServersRef.current = true;
      fetchServers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, serversLoading]);

  // Fetch channels and members when server changes (only once per server)
  useEffect(() => {
    // Validate serverId is a proper ID (20 characters for snowflake)
    if (
      currentServerId &&
      currentServerId.length >= 15 &&
      !channelsLoading[currentServerId] &&
      !membersLoading[currentServerId]
    ) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentServerId, channelsLoading, membersLoading, serverChannels, members]);

  // Navigate to first channel when server is selected and channels are loaded
  useEffect(() => {
    if (
      currentServerId &&
      currentServerId.length >= 15 &&
      serverChannels[currentServerId] &&
      serverChannels[currentServerId].length > 0
    ) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentServerId, serverChannels, pathname, currentChannelId, router]);

  // Fetch messages when channel changes (only once per channel)
  useEffect(() => {
    // Skip temporary channel IDs and validate channelId is a proper snowflake ID
    if (
      currentChannelId &&
      !currentChannelId.startsWith('temp-') &&
      currentChannelId.length >= 15 &&
      !messagesLoading[currentChannelId] &&
      !fetchedMessagesRef.current.has(currentChannelId) &&
      !messagesStore[currentChannelId]
    ) {
      fetchedMessagesRef.current.add(currentChannelId);
      fetchMessages(currentChannelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChannelId, messagesLoading, messagesStore]);

  // Subscribe to channel room when channel changes
  useEffect(() => {
    // Skip temporary channel IDs
    if (
      socketStatus === 'connected' &&
      currentChannelId &&
      !currentChannelId.startsWith('temp-') &&
      currentChannelRef.current !== currentChannelId
    ) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketStatus, currentChannelId]);

  if (!mounted || isLoading || !isAuthenticated || (serversLoading && servers.length === 0)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm text-foreground-muted">Loading...</p>
      </div>
    );
  }

  // Determine current route type
  const isDMRoute =
    pathname.startsWith('/app/dms') || pathname === '/app' || pathname.startsWith('/app/discover');
  const currentServer = servers.find((s) => s.id === currentServerId);

  // Determine header title
  const getHeaderTitle = () => {
    if (pathname === '/app') return 'Friends';
    if (pathname.startsWith('/app/dms/')) return 'Direct Messages';
    if (pathname.startsWith('/app/discover')) return 'Discover';
    if (currentServerId && currentServer) return currentServer.name;
    return 'FreedomTalk';
  };

  // Determine if member sidebar should show
  const showMemberSidebar = isMemberSidebarOpen && currentServerId && !isDMRoute;

  return (
    <div className="h-screen grid grid-rows-[auto_1fr] grid-cols-[1fr_5fr] bg-background overflow-hidden">
      {/* Header Row - spans all columns */}
      <header className="col-span-2 h-8 flex items-center justify-center px-4 bg-background-elevated border-b border-border">
        <div className="flex items-center gap-2">
          {currentServer?.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentServer.icon} alt="" className="w-4 h-4 rounded-full object-cover" />
          ) : isDMRoute ? (
            <MessageCircle className="w-3 h-3 text-accent" />
          ) : (
            <Users className="w-3 h-3 text-accent" />
          )}
          <h1 className="font-light text-sm truncate">{getHeaderTitle()}</h1>
        </div>
      </header>

      {/* Combined Sidebar Column - Server + Channel/DM with User Panel at bottom */}
      <div className="h-full min-h-0 flex flex-col bg-background-elevated">
        {/* Top section: Server sidebar and Channel sidebar side by side */}
        <div className="flex-1 min-h-0 flex ">
          {/* Server Sidebar */}
          <ServerSidebar/>
          {/* Channel/DM Sidebar */}
          <div className="flex-4 min-w-0 flex flex-col border-r border-border overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              {isDMRoute ? <DMSidebar /> : <ChannelSidebar />}
            </div>
          </div>
        </div>
            {/* Voice Connected Panel (when in voice) */}
            {isVoiceConnected && <VoiceConnectedPanel />}
        {/* User Panel at bottom - centered across both sidebars */}
        <UserPanel />
      </div>

      {/* Main Content Area + Member Sidebar */}
      <div className="h-full min-h-0 flex overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 min-w-0 flex flex-col bg-background overflow-hidden">
          {children}
        </main>
        {/* Member Sidebar (conditional) */}
        {showMemberSidebar && <MemberSidebar />}
      </div>

      {/* Connection Status Indicator */}
      <ConnectionStatus />

      {/* Context Menus */}
      <ContextMenuRenderer />

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Pinned Messages Modal */}
      <PinnedMessagesModal />
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
