'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
  Clock,
} from 'lucide-react';
import { useVoiceStore } from '@/stores/voiceStore';
import { apiClient } from '@/lib/api-client';
import { useSocket } from '@/hooks/useSocket';
import { getVoiceClient } from '@/lib/voice-client';

// Helper to get or create voice client
function getOrCreateVoiceClient() {
  return getVoiceClient();
}

interface DeviceOption {
  deviceId: string;
  label: string;
}

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
  const [callDuration, setCallDuration] = useState(0);
  const [audioInputDevices, setAudioInputDevices] = useState<DeviceOption[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<DeviceOption[]>([]);
  const [videoDevices, setVideoDevices] = useState<DeviceOption[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');
  const [selectedVideo, setSelectedVideo] = useState<string>('');

  const callStartRef = useRef<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Call duration timer
  useEffect(() => {
    if (isConnected && !callStartRef.current) {
      callStartRef.current = new Date();
      timerRef.current = setInterval(() => {
        if (callStartRef.current) {
          const elapsed = Math.floor((Date.now() - callStartRef.current.getTime()) / 1000);
          setCallDuration(elapsed);
        }
      }, 1000);
    }

    if (!isConnected) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      callStartRef.current = null;
      setCallDuration(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isConnected]);

  // Enumerate devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();

        const inputs: DeviceOption[] = [];
        const outputs: DeviceOption[] = [];
        const videos: DeviceOption[] = [];

        devices.forEach((device) => {
          const option = { deviceId: device.deviceId, label: device.label || `${device.kind}` };
          if (device.kind === 'audioinput') {
            inputs.push(option);
          } else if (device.kind === 'audiooutput') {
            outputs.push(option);
          } else if (device.kind === 'videoinput') {
            videos.push(option);
          }
        });

        setAudioInputDevices(inputs);
        setAudioOutputDevices(outputs);
        setVideoDevices(videos);

        // Set defaults
        if (inputs.length > 0 && !selectedAudioInput) {
          setSelectedAudioInput(inputs[0].deviceId);
        }
        if (outputs.length > 0 && !selectedAudioOutput) {
          setSelectedAudioOutput(outputs[0].deviceId);
        }
        if (videos.length > 0 && !selectedVideo) {
          setSelectedVideo(videos[0].deviceId);
        }
      } catch (error) {
        console.error('Failed to enumerate devices:', error);
      }
    };

    if (showSettings) {
      getDevices();
    }
  }, [showSettings]);

  // Format duration as HH:MM:SS
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMute = async () => {
    const newMute = !selfMute;
    setSelfMute(newMute);

    // Update WebRTC producer
    const voiceClient = getOrCreateVoiceClient();
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
    const voiceClient = getOrCreateVoiceClient();
    if (!voiceClient) return;

    const newVideo = !selfVideo;
    setSelfVideo(newVideo);

    try {
      if (newVideo) {
        await voiceClient.startVideo();
        // Update store with local video stream
        const stream = voiceClient.getLocalVideoStream();
        useVoiceStore.getState().setLocalVideoStream(stream);
      } else {
        await voiceClient.stopVideo();
        // Clear local video stream from store
        useVoiceStore.getState().setLocalVideoStream(null);
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
    const voiceClient = getOrCreateVoiceClient();
    if (!voiceClient) return;

    const newStream = !selfStream;
    setSelfStream(newStream);

    try {
      if (newStream) {
        await voiceClient.startScreenShare();
        // Update store with local screen stream
        const stream = voiceClient.getLocalScreenStream();
        useVoiceStore.getState().setLocalScreenStream(stream);
      } else {
        await voiceClient.stopScreenShare();
        // Clear local screen stream from store
        useVoiceStore.getState().setLocalScreenStream(null);
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
    const voiceClient = getOrCreateVoiceClient();
    if (voiceClient) {
      await voiceClient.leaveChannel();
    }

    if (currentChannelId) {
      await apiClient.leaveVoiceChannel(currentChannelId);
    }

    // Clear local streams from store
    useVoiceStore.getState().setLocalAudioStream(null);
    useVoiceStore.getState().setLocalVideoStream(null);
    useVoiceStore.getState().setLocalScreenStream(null);

    disconnectFromChannel();
  };

  // Count users including self
  const usersCount = users.length;

  return (
    <div className="relative h-20 bg-background-elevated border-t border-border flex items-center px-2 gap-1">
      {/* Connection Info */}
      <div className="flex-1 flex items-center gap-3 px-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <Wifi className="w-4 h-4 text-success" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-success">Voice Connected</span>
          <span className="text-xs text-foreground-muted flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {usersCount} {usersCount === 1 ? 'user' : 'users'}
            </span>
            <span className="flex items-center gap-1 text-success">
              <Clock className="w-3 h-3" />
              {formatDuration(callDuration)}
            </span>
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

        {/* Settings */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            showSettings
              ? 'bg-accent/20 text-accent hover:bg-accent/30'
              : 'bg-background-surface text-foreground-muted hover:text-foreground hover:bg-background-surface/80'
          }`}
          title="Voice Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Disconnect */}
        <button
          onClick={handleDisconnect}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-error/20 text-error hover:bg-error/30 transition-colors"
          title="Disconnect"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {/* Device Settings Modal */}
      {showSettings && (
        <div className="absolute bottom-20 left-2 right-2 bg-background-elevated rounded-lg shadow-xl border border-border p-4 z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Voice Settings</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-foreground-muted hover:text-foreground"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {/* Microphone */}
            <div>
              <label className="block text-xs text-foreground-muted mb-1">Microphone</label>
              <select
                value={selectedAudioInput}
                onChange={(e) => setSelectedAudioInput(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background rounded border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {audioInputDevices.length === 0 ? (
                  <option>No devices found</option>
                ) : (
                  audioInputDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Speaker */}
            <div>
              <label className="block text-xs text-foreground-muted mb-1">Speaker</label>
              <select
                value={selectedAudioOutput}
                onChange={(e) => setSelectedAudioOutput(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background rounded border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {audioOutputDevices.length === 0 ? (
                  <option>No devices found</option>
                ) : (
                  audioOutputDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Camera */}
            <div>
              <label className="block text-xs text-foreground-muted mb-1">Camera</label>
              <select
                value={selectedVideo}
                onChange={(e) => setSelectedVideo(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background rounded border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {videoDevices.length === 0 ? (
                  <option>No devices found</option>
                ) : (
                  videoDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
