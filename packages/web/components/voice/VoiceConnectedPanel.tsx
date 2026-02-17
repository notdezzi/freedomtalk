'use client';

import { useState, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorDown,
  Wifi,
  Users,
  Settings,
} from 'lucide-react';
import { useVoiceStore } from '@/stores/voiceStore';
import { apiClient } from '@/lib/api-client';
import { useSocket } from '@/hooks/useSocket';
import { getVoiceClient } from '@/lib/voice-client';

export default function VoiceConnectedPanel() {
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

  const [showSettings, setShowSettings] = useState(false);

  if (!isConnected || !currentChannelId) return null;

  const handleToggleMute = async () => {
    const newMute = !selfMute;
    setSelfMute(newMute);

    // Update WebRTC producer
    const voiceClient = getVoiceClient();
    if (voiceClient) {
      voiceClient.setMuted(newMute);
    }

    if (sessionId) {
      await apiClient.updateVoiceState(sessionId, { selfMute: newMute });
      updateVoiceState({ selfMute: newMute });
    }
  };

  const handleToggleDeaf = async () => {
    const newDeaf = !selfDeaf;
    setSelfDeaf(newDeaf);

    if (sessionId) {
      await apiClient.updateVoiceState(sessionId, { selfDeaf: newDeaf, selfMute: newDeaf || selfMute });
      updateVoiceState({ selfDeaf: newDeaf, selfMute: newDeaf || selfMute });
    }
  };

  const handleToggleVideo = async () => {
    const voiceClient = getVoiceClient();
    if (!voiceClient) return;

    const newVideo = !selfVideo;
    setSelfVideo(newVideo);

    try {
      if (newVideo) {
        await voiceClient.startVideo();
      } else {
        await voiceClient.stopVideo();
      }

      if (sessionId) {
        await apiClient.updateVoiceState(sessionId, { selfVideo: newVideo });
        updateVoiceState({ selfVideo: newVideo });
      }
    } catch (error) {
      console.error('Video toggle error:', error);
      setSelfVideo(!newVideo); // Revert on error
    }
  };

  const handleToggleStream = async () => {
    const voiceClient = getVoiceClient();
    if (!voiceClient) return;

    const newStream = !selfStream;
    setSelfStream(newStream);

    try {
      if (newStream) {
        await voiceClient.startScreenShare();
      } else {
        await voiceClient.stopScreenShare();
      }

      if (sessionId) {
        await apiClient.updateVoiceState(sessionId, { selfStream: newStream });
        updateVoiceState({ selfStream: newStream });
      }
    } catch (error) {
      console.error('Screen share toggle error:', error);
      setSelfStream(!newStream); // Revert on error
    }
  };

  const handleDisconnect = async () => {
    const voiceClient = getVoiceClient();
    if (voiceClient) {
      await voiceClient.leaveChannel();
    }

    if (currentChannelId) {
      await apiClient.leaveVoiceChannel(currentChannelId);
    }

    disconnectFromChannel();
  };

  // Count users including self
  const usersCount = users.length;

  return (
    <div className="h-20 bg-background-elevated border-t border-border flex items-center px-2 gap-1">
      {/* Connection Info */}
      <div className="flex-1 flex items-center gap-3 px-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <Wifi className="w-4 h-4 text-success" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-success">Voice Connected</span>
          <span className="text-xs text-foreground-muted flex items-center gap-1">
            <Users className="w-3 h-3" />
            {usersCount} {usersCount === 1 ? 'user' : 'users'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Mute */}
        <button
          onClick={handleToggleMute}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            selfMute
              ? 'bg-error/20 text-error hover:bg-error/30'
              : 'bg-background-surface text-foreground-muted hover:text-foreground hover:bg-background-surface/80'
          }`}
          title={selfMute ? 'Unmute' : 'Mute'}
        >
          {selfMute ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Deafen */}
        <button
          onClick={handleToggleDeaf}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            selfDeaf
              ? 'bg-error/20 text-error hover:bg-error/30'
              : 'bg-background-surface text-foreground-muted hover:text-foreground hover:bg-background-surface/80'
          }`}
          title={selfDeaf ? 'Undeafen' : 'Deafen'}
        >
          {selfDeaf ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Video */}
        <button
          onClick={handleToggleVideo}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            selfVideo
              ? 'bg-accent/20 text-accent hover:bg-accent/30'
              : 'bg-background-surface text-foreground-muted hover:text-foreground hover:bg-background-surface/80'
          }`}
          title={selfVideo ? 'Stop Video' : 'Start Video'}
        >
          {selfVideo ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={handleToggleStream}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            selfStream
              ? 'bg-accent/20 text-accent hover:bg-accent/30'
              : 'bg-background-surface text-foreground-muted hover:text-foreground hover:bg-background-surface/80'
          }`}
          title={selfStream ? 'Stop Screen Share' : 'Screen Share'}
        >
          {selfStream ? <MonitorDown className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-border mx-1" />

        {/* Disconnect */}
        <button
          onClick={handleDisconnect}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-error/20 text-error hover:bg-error/30 transition-colors"
          title="Disconnect"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
