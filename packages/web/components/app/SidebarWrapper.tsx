'use client';

import { ReactNode } from 'react';
import { useVoiceStore } from '@/stores/voiceStore';
import { useSocket } from '@/hooks/useSocket';
import { apiClient } from '@/lib/api-client';
import UserPanel from './UserPanel';

interface SidebarWrapperProps {
  children: ReactNode;
}

export default function SidebarWrapper({ children }: SidebarWrapperProps) {
  const {
    isConnected,
    currentChannelId,
    sessionId,
    selfMute,
    selfDeaf,
    selfVideo,
    selfStream,
    users,
    disconnectFromChannel,
    setSelfMute,
    setSelfDeaf,
    setSelfVideo,
    setSelfStream,
  } = useVoiceStore();

  const { updateVoiceState } = useSocket();

  const handleToggleMute = async () => {
    const newMute = !selfMute;
    setSelfMute(newMute);
    if (sessionId) {
      await apiClient.updateVoiceState(sessionId, { selfMute: newMute });
      updateVoiceState({ selfMute: newMute });
    }
  };

  const handleToggleDeaf = async () => {
    const newDeaf = !selfDeaf;
    const newMute = newDeaf ? true : selfMute;
    setSelfDeaf(newDeaf);
    if (sessionId) {
      await apiClient.updateVoiceState(sessionId, { selfDeaf: newDeaf, selfMute: newMute });
      updateVoiceState({ selfDeaf: newDeaf, selfMute: newMute });
    }
  };

  const handleToggleVideo = async () => {
    const newVideo = !selfVideo;
    setSelfVideo(newVideo);
    if (sessionId) {
      await apiClient.updateVoiceState(sessionId, { selfVideo: newVideo });
      updateVoiceState({ selfVideo: newVideo });
    }
  };

  const handleToggleStream = async () => {
    const newStream = !selfStream;
    setSelfStream(newStream);
    if (sessionId) {
      await apiClient.updateVoiceState(sessionId, { selfStream: newStream });
      updateVoiceState({ selfStream: newStream });
    }
  };

  const handleDisconnect = async () => {
    if (currentChannelId) {
      await apiClient.leaveVoiceChannel(currentChannelId);
      disconnectFromChannel();
    }
  };

  const usersCount = users.length;

  return (
    <div className="w-60 bg-background-elevated flex flex-col h-full border-r border-border">
      {/* Sidebar content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {children}
      </div>

      {/* Bottom panel - Voice Connected + User */}
      <div className="flex-shrink-0 border-t border-border">
        {/* Voice Connected Panel (when connected) */}
        {isConnected && currentChannelId && (
          <div className="bg-background-surface/50 p-2">
            {/* Connection status */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-medium text-success">Voice Connected</span>
              <span className="text-xs text-foreground-muted ml-auto">
                {usersCount} {usersCount === 1 ? 'user' : 'users'}
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={handleToggleMute}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                  selfMute
                    ? 'bg-error/20 text-error hover:bg-error/30'
                    : 'bg-background-surface text-foreground-muted hover:text-foreground hover:bg-background-elevated'
                }`}
                title={selfMute ? 'Unmute' : 'Mute'}
              >
                {selfMute ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                    <line x1="8" x2="16" y1="22" y2="22" />
                    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                    <line x1="8" x2="16" y1="22" y2="22" />
                  </svg>
                )}
              </button>

              <button
                onClick={handleToggleDeaf}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                  selfDeaf
                    ? 'bg-error/20 text-error hover:bg-error/30'
                    : 'bg-background-surface text-foreground-muted hover:text-foreground hover:bg-background-elevated'
                }`}
                title={selfDeaf ? 'Undeafen' : 'Deafen'}
              >
                {selfDeaf ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                  </svg>
                )}
              </button>

              <button
                onClick={handleToggleVideo}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                  selfVideo
                    ? 'bg-accent/20 text-accent hover:bg-accent/30'
                    : 'bg-background-surface text-foreground-muted hover:text-foreground hover:bg-background-elevated'
                }`}
                title={selfVideo ? 'Stop Video' : 'Start Video'}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 8-6 4 6 4V8Z" />
                  <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
                </svg>
              </button>

              <button
                onClick={handleToggleStream}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                  selfStream
                    ? 'bg-accent/20 text-accent hover:bg-accent/30'
                    : 'bg-background-surface text-foreground-muted hover:text-foreground hover:bg-background-elevated'
                }`}
                title={selfStream ? 'Stop Screen Share' : 'Screen Share'}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="3" rx="2" />
                  <line x1="8" x2="16" y1="21" y2="21" />
                  <line x1="12" x2="12" y1="17" y2="21" />
                </svg>
              </button>

              <div className="w-px h-5 bg-border mx-0.5" />

              <button
                onClick={handleDisconnect}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-error/20 text-error hover:bg-error/30 transition-colors"
                title="Disconnect"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27" />
                  <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* User Panel */}
        <UserPanel />
      </div>
    </div>
  );
}
