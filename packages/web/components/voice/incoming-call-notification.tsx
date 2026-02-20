'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, PhoneOff, X } from 'lucide-react';
import { socketService } from '@/lib/socket';
import { useVoiceStore } from '@/stores';
import { useVoiceConnection } from '@/hooks';
import { cn } from '@/lib/utils';

interface IncomingCall {
  channelId: string;
  callerId: string;
  callerUsername: string;
  callerAvatar: string | null;
}

export function IncomingCallNotification() {
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const { isConnected, currentChannelId } = useVoiceStore();
  const { joinChannel, leaveChannel } = useVoiceConnection();

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleCallStarted = (data: IncomingCall) => {
      // Don't show notification if already in this call
      if (isConnected && currentChannelId === data.channelId) {
        return;
      }

      setIncomingCall(data);

      // Auto-dismiss after 30 seconds
      setTimeout(() => {
        setIncomingCall((current) => {
          if (current?.channelId === data.channelId) {
            return null;
          }
          return current;
        });
      }, 30000);
    };

    const handleCallEnded = (data: { channelId: string }) => {
      if (incomingCall?.channelId === data.channelId) {
        setIncomingCall(null);
      }
    };

    socket.on('dm:call_started', handleCallStarted);
    socket.on('dm:call_ended', handleCallEnded);

    return () => {
      socket.off('dm:call_started', handleCallStarted);
      socket.off('dm:call_ended', handleCallEnded);
    };
  }, [isConnected, currentChannelId, incomingCall?.channelId]);

  const handleAccept = useCallback(async () => {
    if (!incomingCall) return;

    // If already in another call, leave it first
    if (isConnected) {
      await leaveChannel();
    }

    // Navigate to the DM channel
    router.push(`/app/dms/${incomingCall.channelId}`);

    // Join the call
    try {
      await joinChannel(incomingCall.channelId);
    } catch (error) {
      console.error('Failed to join call:', error);
    }

    setIncomingCall(null);
  }, [incomingCall, isConnected, leaveChannel, joinChannel, router]);

  const handleDecline = useCallback(() => {
    setIncomingCall(null);
  }, []);

  const handleDismiss = useCallback(() => {
    setIncomingCall(null);
  }, []);

  if (!incomingCall) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-background-elevated border border-border rounded-lg shadow-lg p-4 w-80">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Phone className="h-5 w-5 text-success animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
            </div>
            <span className="text-sm font-medium text-foreground">Incoming Call</span>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded p-1 text-foreground-muted hover:bg-background-surface hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Caller info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-full bg-background-surface flex items-center justify-center text-lg font-semibold text-foreground">
            {incomingCall.callerUsername.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-foreground">{incomingCall.callerUsername}</p>
            <p className="text-sm text-foreground-muted">Wants to start a voice call</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDecline}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-colors',
              'bg-error/20 text-error hover:bg-error/30'
            )}
          >
            <PhoneOff className="h-4 w-4" />
            Decline
          </button>
          <button
            onClick={handleAccept}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-colors',
              'bg-success text-foreground hover:bg-success/80'
            )}
          >
            <Phone className="h-4 w-4" />
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
