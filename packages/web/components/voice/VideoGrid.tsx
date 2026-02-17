'use client';

import { useState } from 'react';
import { Mic, MicOff, Maximize2, Minimize2, Pin, User } from 'lucide-react';
import { useVoiceStore, VoiceUser } from '@/stores/voiceStore';

interface VideoGridProps {
  channelId: string;
}

function VideoTile({ user, isFullscreen, onToggleFullscreen }: {
  user: VoiceUser;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const displayName = user.displayName || user.username;
  const [showControls, setShowControls] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // For now, show placeholder since we don't have actual video streams
  // In a full implementation, this would render a <video> element with the stream

  return (
    <div
      className={`relative bg-background-surface rounded-lg overflow-hidden ${
        isFullscreen ? 'fixed inset-4 z-50' : 'aspect-video'
      }`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video or Placeholder */}
      {user.selfVideo && !videoError ? (
        <div className="w-full h-full flex items-center justify-center bg-background-surface">
          {/* Placeholder for actual video */}
          <div className="text-center text-foreground-muted">
            <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Video stream</p>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center overflow-hidden">
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-background">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Name Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          {user.selfMute ? (
            <MicOff className="w-4 h-4 text-error" />
          ) : (
            <Mic className="w-4 h-4 text-foreground-muted" />
          )}
          <span className="text-sm text-white font-medium truncate">{displayName}</span>
        </div>
      </div>

      {/* Controls Overlay */}
      {showControls && (
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 rounded bg-black/50 text-white hover:bg-black/70 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            className="p-1.5 rounded bg-black/50 text-white hover:bg-black/70 transition-colors"
            title="Pin Video"
          >
            <Pin className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function VideoGrid({ channelId }: VideoGridProps) {
  const { users, selfVideo, sessionId } = useVoiceStore();
  const [fullscreenUserId, setFullscreenUserId] = useState<string | null>(null);

  // Get users with video enabled
  const videoUsers = users.filter((u) => u.selfVideo);

  // Add self if video is on (would need current user data)
  // For now, just show other users

  if (videoUsers.length === 0 && !selfVideo) {
    return null;
  }

  // Calculate grid layout
  const totalVideos = videoUsers.length + (selfVideo ? 1 : 0);
  const gridCols = totalVideos <= 1 ? 1 : totalVideos <= 4 ? 2 : 3;
  const gridRows = Math.ceil(totalVideos / gridCols);

  return (
    <div
      className={`grid gap-2 p-4 ${
        fullscreenUserId ? '' : 'h-full'
      }`}
      style={{
        gridTemplateColumns: fullscreenUserId ? '1fr' : `repeat(${gridCols}, 1fr)`,
        gridTemplateRows: fullscreenUserId ? '1fr' : `repeat(${gridRows}, 1fr)`,
      }}
    >
      {videoUsers.map((user) => (
        <VideoTile
          key={user.sessionId}
          user={user}
          isFullscreen={fullscreenUserId === user.sessionId}
          onToggleFullscreen={() =>
            setFullscreenUserId(
              fullscreenUserId === user.sessionId ? null : user.sessionId
            )
          }
        />
      ))}

      {/* Self video tile would go here with actual WebRTC implementation */}
    </div>
  );
}
