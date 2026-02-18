'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  Pin,
  User,
  Monitor,
  Settings,
  PictureInPicture2,
  PictureInPicture,
  Volume2,
} from 'lucide-react';
import { useVoiceStore, VoiceUser } from '@/stores/voiceStore';

interface VideoGridProps {
  channelId: string;
}

interface QualitySettings {
  resolution: '480p' | '720p' | '1080p';
  frameRate: 15 | 30 | 60;
}

const QUALITY_OPTIONS: Record<string, QualitySettings> = {
  low: { resolution: '480p', frameRate: 15 },
  medium: { resolution: '720p', frameRate: 30 },
  high: { resolution: '1080p', frameRate: 60 },
};

function VideoTile({ user, isFullscreen, onToggleFullscreen, isPinned, onTogglePin }: {
  user: VoiceUser;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isPinned: boolean;
  onTogglePin: () => void;
}) {
  const displayName = user.displayName || user.username;
  const [showControls, setShowControls] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle picture-in-picture
  const togglePip = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      if (document.pictureInPictureElement === videoRef.current) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
        setIsPipActive(true);
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  }, []);

  // Listen for PiP exit
  useEffect(() => {
    const handlePipExit = () => setIsPipActive(false);
    document.addEventListener('exitpictureinpicture', handlePipExit);
    return () => document.removeEventListener('exitpictureinpicture', handlePipExit);
  }, []);

  const isScreenShare = user.selfStream;

  return (
    <div
      className={`relative bg-background-surface rounded-lg overflow-hidden ${
        isFullscreen ? 'fixed inset-4 z-50' : 'aspect-video'
      } ${isPinned ? 'ring-2 ring-accent' : ''}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video or Placeholder */}
      {user.selfVideo && !videoError ? (
        <div className="w-full h-full flex items-center justify-center bg-background-surface">
          {/* Video element for PiP support */}
          <video
            ref={videoRef}
            className="hidden"
            autoPlay
            playsInline
            muted
          />
          {/* Placeholder for actual video */}
          <div className="text-center text-foreground-muted">
            <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Video stream</p>
          </div>
        </div>
      ) : isScreenShare ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          {/* Screen share placeholder */}
          <div className="text-center text-foreground-muted">
            <Monitor className="w-12 h-12 mx-auto mb-2 text-accent" />
            <p className="text-sm">Screen Share</p>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isScreenShare && <Monitor className="w-4 h-4 text-accent" />}
            {user.selfMute ? (
              <MicOff className="w-4 h-4 text-error" />
            ) : (
              <Mic className="w-4 h-4 text-foreground-muted" />
            )}
            <span className="text-sm text-white font-medium truncate">{displayName}</span>
          </div>
          {isScreenShare && (
            <Volume2 className="w-4 h-4 text-accent" />
          )}
        </div>
      </div>

      {/* Controls Overlay */}
      {showControls && (
        <div className="absolute top-2 right-2 flex gap-1">
          {!isScreenShare && (
            <button
              onClick={togglePip}
              className={`p-1.5 rounded transition-colors ${
                isPipActive
                  ? 'bg-accent text-white'
                  : 'bg-black/50 text-white hover:bg-black/70'
              }`}
              title={isPipActive ? 'Exit PiP' : 'Picture in Picture'}
            >
              {isPipActive ? (
                <PictureInPicture className="w-4 h-4" />
              ) : (
                <PictureInPicture2 className="w-4 h-4" />
              )}
            </button>
          )}
          <button
            onClick={onTogglePin}
            className={`p-1.5 rounded transition-colors ${
              isPinned
                ? 'bg-accent text-white'
                : 'bg-black/50 text-white hover:bg-black/70'
            }`}
            title={isPinned ? 'Unpin Video' : 'Pin Video'}
          >
            <Pin className="w-4 h-4" />
          </button>
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
        </div>
      )}

      {/* Pinned indicator */}
      {isPinned && !showControls && (
        <div className="absolute top-2 left-2">
          <Pin className="w-4 h-4 text-accent" />
        </div>
      )}
    </div>
  );
}

function ScreenShareTile({ user, isFullscreen, onToggleFullscreen }: {
  user: VoiceUser;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const displayName = user.displayName || user.username;
  const [showControls, setShowControls] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');

  return (
    <div
      className={`relative bg-gray-900 rounded-lg overflow-hidden ${
        isFullscreen ? 'fixed inset-4 z-50' : 'aspect-video'
      }`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Screen Share Content Placeholder */}
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center text-foreground-muted">
          <Monitor className="w-16 h-16 mx-auto mb-3 text-accent" />
          <p className="text-sm font-medium">{displayName}&apos;s Screen</p>
          <p className="text-xs mt-1">{QUALITY_OPTIONS[quality].resolution} @ {QUALITY_OPTIONS[quality].frameRate}fps</p>
        </div>
      </div>

      {/* Name Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-accent" />
          <span className="text-sm text-white font-medium truncate">
            {displayName} - Screen Share
          </span>
        </div>
      </div>

      {/* Controls Overlay */}
      {showControls && (
        <div className="absolute top-2 right-2 flex gap-1">
          {/* Quality Settings */}
          <div className="relative">
            <button
              onClick={() => setShowQualityMenu(!showQualityMenu)}
              className="p-1.5 rounded bg-black/50 text-white hover:bg-black/70 transition-colors"
              title="Quality Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            {showQualityMenu && (
              <div className="absolute top-full right-0 mt-1 bg-background-elevated rounded shadow-xl border border-border overflow-hidden z-10">
                <div className="p-2 text-xs text-foreground-muted border-b border-border">
                  Quality
                </div>
                {Object.entries(QUALITY_OPTIONS).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setQuality(key as 'low' | 'medium' | 'high');
                      setShowQualityMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-background-surface ${
                      quality === key ? 'text-accent' : 'text-foreground'
                    }`}
                  >
                    <div className="font-medium capitalize">{key}</div>
                    <div className="text-xs text-foreground-muted">
                      {value.resolution} @ {value.frameRate}fps
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

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
        </div>
      )}
    </div>
  );
}

export default function VideoGrid({ channelId }: VideoGridProps) {
  const { users, selfVideo, sessionId } = useVoiceStore();
  const [fullscreenUserId, setFullscreenUserId] = useState<string | null>(null);
  const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);

  // Get users with video or screen share enabled
  const videoUsers = users.filter((u) => u.selfVideo && !u.selfStream);
  const screenShareUsers = users.filter((u) => u.selfStream);

  // Add self if video is on
  const totalVideos = videoUsers.length + (selfVideo ? 1 : 0);
  const hasScreenShare = screenShareUsers.length > 0;

  if (totalVideos === 0 && !hasScreenShare) {
    return null;
  }

  // Calculate grid layout for video users
  const gridCols = totalVideos <= 1 ? 1 : totalVideos <= 4 ? 2 : 3;
  const gridRows = Math.ceil(totalVideos / gridCols);

  return (
    <div className="flex flex-col h-full">
      {/* Screen shares take priority at the top */}
      {hasScreenShare && (
        <div className="flex-1 p-2 border-b border-border">
          {screenShareUsers.map((user) => (
            <ScreenShareTile
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
        </div>
      )}

      {/* Video grid */}
      {totalVideos > 0 && (
        <div
          className={`${hasScreenShare ? 'h-1/3' : 'h-full'} grid gap-2 p-4`}
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
              isPinned={pinnedUserId === user.sessionId}
              onTogglePin={() =>
                setPinnedUserId(
                  pinnedUserId === user.sessionId ? null : user.sessionId
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
