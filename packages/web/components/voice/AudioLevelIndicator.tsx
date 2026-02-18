'use client';

import { useEffect, useRef, useState } from 'react';

interface AudioLevelIndicatorProps {
  audioTrack?: MediaStreamTrack | null;
  className?: string;
  barCount?: number;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * AudioLevelIndicator - Visualizes audio levels from a WebRTC audio track
 * Shows animated bars that respond to the user's microphone input
 */
export default function AudioLevelIndicator({
  audioTrack,
  className = '',
  barCount = 3,
  size = 'md',
}: AudioLevelIndicatorProps) {
  const [audioLevel, setAudioLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (!audioTrack) {
      setAudioLevel(0);
      return;
    }

    const stream = new MediaStream([audioTrack]);

    // Create audio context and analyser
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    analyserRef.current = analyser;
    audioContextRef.current = audioContext;
    sourceRef.current = source;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      // Calculate average level from frequency data
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalizedLevel = Math.min(average / 128, 1); // Normalize to 0-1

      setAudioLevel(normalizedLevel);
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      source.disconnect();
      audioContext.close();
    };
  }, [audioTrack]);

  // Size configurations
  const sizeConfig = {
    sm: { width: 'w-3', height: 'h-2', gap: 'gap-0.5' },
    md: { width: 'w-4', height: 'h-3', gap: 'gap-1' },
    lg: { width: 'w-5', height: 'h-4', gap: 'gap-1' },
  };

  const config = sizeConfig[size];

  // Generate bars with staggered heights based on audio level
  const bars = Array.from({ length: barCount }, (_, i) => {
    // Each bar responds slightly differently to create a natural look
    const barMultiplier = 0.5 + (i / barCount) * 0.5;
    const height = Math.max(0.2, audioLevel * barMultiplier);
    const isActive = audioLevel > 0.1;

    return (
      <div
        key={i}
        className={`${config.width} rounded-full transition-all duration-75 ${
          isActive ? 'bg-success' : 'bg-foreground-muted/30'
        }`}
        style={{
          height: `${Math.max(4, height * parseFloat(config.height.replace('h-', '')) * 4)}px`,
        }}
      />
    );
  });

  return (
    <div className={`flex items-end ${config.gap} ${className}`}>
      {bars}
    </div>
  );
}

/**
 * SpeakingRing - Shows a ring around an avatar when speaking
 */
interface SpeakingRingProps {
  audioTrack?: MediaStreamTrack | null;
  children: React.ReactNode;
  className?: string;
}

export function SpeakingRing({ audioTrack, children, className = '' }: SpeakingRingProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!audioTrack) {
      setIsSpeaking(false);
      return;
    }

    const stream = new MediaStream([audioTrack]);
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    analyserRef.current = analyser;
    audioContextRef.current = audioContext;
    sourceRef.current = source;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const checkSpeaking = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const isCurrentlySpeaking = average > 20; // Threshold for speaking detection

      if (isCurrentlySpeaking) {
        setIsSpeaking(true);
        if (speakingTimeoutRef.current) {
          clearTimeout(speakingTimeoutRef.current);
        }
        // Keep showing speaking state for a bit after audio stops
        speakingTimeoutRef.current = setTimeout(() => {
          setIsSpeaking(false);
        }, 200);
      }

      animationFrameRef.current = requestAnimationFrame(checkSpeaking);
    };

    checkSpeaking();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }
      source.disconnect();
      audioContext.close();
    };
  }, [audioTrack]);

  return (
    <div className={`relative ${className}`}>
      {/* Speaking ring */}
      <div
        className={`absolute inset-0 rounded-full border-2 transition-all duration-150 ${
          isSpeaking
            ? 'border-success opacity-100 scale-110'
            : 'border-transparent opacity-0 scale-100'
        }`}
        style={{
          boxShadow: isSpeaking ? '0 0 8px rgba(52, 211, 153, 0.5)' : 'none',
        }}
      />
      {children}
    </div>
  );
}
