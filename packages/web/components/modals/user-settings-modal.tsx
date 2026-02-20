'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { apiClient } from '@/lib/api-client';
import {
  User,
  Mic,
  Volume2,
  Video,
  VideoOff,
  Shield,
  Key,
  Camera,
  Save,
  Loader2,
  Check,
  X,
  LogOut,
  Code,
  Copy,
} from 'lucide-react';

interface UserSettingsModalProps {
  onClose: () => void;
}

type SettingsSection = 'my-account' | 'security' | 'voice-video' | 'advanced';

export function UserSettingsModal({ onClose }: UserSettingsModalProps) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const [activeSection, setActiveSection] = useState<SettingsSection>('my-account');

  // Developer mode state
  const [developerMode, setDeveloperMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('developer-mode') === 'true';
    }
    return false;
  });

  // Update localStorage when developer mode changes
  useEffect(() => {
    localStorage.setItem('developer-mode', String(developerMode));
    // Dispatch custom event for other components to listen to
    window.dispatchEvent(new CustomEvent('developer-mode-change', { detail: developerMode }));
  }, [developerMode]);

  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Voice/Video settings state
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInput, setSelectedInput] = useState<string>('');
  const [selectedOutput, setSelectedOutput] = useState<string>('');
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Initialize profile data
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatar || '');
    }
  }, [user]);

  // Cleanup video stream on unmount or section change
  const stopVideoStream = useCallback(() => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVideoEnabled(false);
    setVideoError(null);
  }, []);

  // Cleanup mic test
  const stopMicTest = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsMicTesting(false);
    setMicLevel(0);
  }, []);

  // Stop video when leaving voice-video section
  useEffect(() => {
    if (activeSection !== 'voice-video') {
      stopVideoStream();
      stopMicTest();
    }
  }, [activeSection, stopVideoStream, stopMicTest]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVideoStream();
      stopMicTest();
    };
  }, [stopVideoStream, stopMicTest]);

  // Start video preview
  const startVideoPreview = async () => {
    setVideoError(null);

    // Stop any existing stream first
    stopVideoStream();

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoStreamRef.current = stream;

      // Enable video first to render the video element
      setIsVideoEnabled(true);
    } catch (error) {
      console.error('Failed to start video:', error);
      setVideoError('Could not access camera. Please check permissions.');
      setIsVideoEnabled(false);
    }
  };

  // Attach video stream when video element becomes available
  useEffect(() => {
    if (isVideoEnabled && videoStreamRef.current && videoRef.current) {
      videoRef.current.srcObject = videoStreamRef.current;
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          videoRef.current.play().catch(err => {
            console.error('Failed to play video:', err);
            setVideoError('Failed to start video playback');
          });
        }
      };
    }
  }, [isVideoEnabled]);

  // Start mic test
  const startMicTest = async () => {
    if (isMicTesting) {
      stopMicTest();
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedInput ? { deviceId: { exact: selectedInput } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      micStreamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsMicTesting(true);

      const updateLevel = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average level
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setMicLevel(Math.min(100, average * 2)); // Scale to 0-100

        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (error) {
      console.error('Failed to start mic test:', error);
    }
  };

  // Load available media devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Only request audio permission initially, video will be requested on demand
        // This prevents the camera from turning on immediately when opening settings
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the temporary stream immediately - we just needed permission
        stream.getTracks().forEach(track => track.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();

        setInputDevices(devices.filter((d) => d.kind === 'audioinput'));
        setOutputDevices(devices.filter((d) => d.kind === 'audiooutput'));
        setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));

        // Load saved preferences from localStorage
        const savedInput = localStorage.getItem('voice-input-device');
        const savedOutput = localStorage.getItem('voice-output-device');
        const savedVideo = localStorage.getItem('voice-video-device');

        if (savedInput) setSelectedInput(savedInput);
        else {
          const defaultInput = devices.find((d) => d.kind === 'audioinput');
          if (defaultInput) setSelectedInput(defaultInput.deviceId);
        }

        if (savedOutput) setSelectedOutput(savedOutput);
        else {
          const defaultOutput = devices.find((d) => d.kind === 'audiooutput');
          if (defaultOutput) setSelectedOutput(defaultOutput.deviceId);
        }

        if (savedVideo) setSelectedVideo(savedVideo);
        else {
          const defaultVideo = devices.find((d) => d.kind === 'videoinput');
          if (defaultVideo) setSelectedVideo(defaultVideo.deviceId);
        }
      } catch (error) {
        console.error('Failed to enumerate devices:', error);
      }
    };

    if (activeSection === 'voice-video') {
      loadDevices();
    }
  }, [activeSection]);

  // Save device preferences
  useEffect(() => {
    if (selectedInput) localStorage.setItem('voice-input-device', selectedInput);
    if (selectedOutput) localStorage.setItem('voice-output-device', selectedOutput);
    if (selectedVideo) localStorage.setItem('voice-video-device', selectedVideo);
  }, [selectedInput, selectedOutput, selectedVideo]);

  const handleProfileSave = async () => {
    setIsSavingProfile(true);
    setProfileMessage(null);

    try {
      const response = await apiClient.updateProfile({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });

      if (response.success && response.data) {
        // Update local user state
        setUser({
          ...user!,
          displayName: response.data.profile.displayName,
          avatar: response.data.profile.avatarUrl,
        });
        setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        setProfileMessage({ type: 'error', text: response.error?.message || 'Failed to update profile' });
      }
    } catch (error) {
      setProfileMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setIsChangingPassword(true);
    setPasswordMessage(null);

    try {
      const response = await apiClient.changePassword(currentPassword, newPassword);

      if (response.success) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage({ type: 'error', text: response.error?.message || 'Failed to change password' });
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const sections = [
    { id: 'my-account' as const, label: 'My Account', icon: <User className="h-4 w-4" /> },
    { id: 'security' as const, label: 'Security', icon: <Shield className="h-4 w-4" /> },
    { id: 'voice-video' as const, label: 'Voice & Video', icon: <Mic className="h-4 w-4" /> },
    { id: 'advanced' as const, label: 'Advanced', icon: <Code className="h-4 w-4" /> },
  ];

  return (
    <Modal open onClose={onClose} className="!p-0 !max-w-4xl !bg-background-elevated">
      <div className="flex h-[600px]">
        {/* Sidebar */}
        <div className="w-56 bg-background flex flex-col">
          <div className="p-4">
            <h2 className="text-xs font-semibold text-foreground-muted uppercase tracking-wide mb-2">
              User Settings
            </h2>
          </div>
          <nav className="flex-1 px-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 rounded text-sm text-left',
                  'transition-colors',
                  activeSection === section.id
                    ? 'bg-background-surface text-foreground'
                    : 'text-foreground-muted hover:text-foreground hover:bg-background-surface/50'
                )}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </nav>

          {/* Divider */}
          <div className="mx-4 border-t border-border" />

          {/* Logout button */}
          <div className="p-2">
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 rounded text-sm text-left text-error hover:bg-error/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeSection === 'my-account' && (
            <div className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-6">My Account</h3>

              {/* User info card with avatar */}
              <div className="bg-background rounded-lg p-4 mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="h-20 w-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-background-surface flex items-center justify-center text-2xl font-semibold text-foreground">
                        {(user?.displayName || user?.username || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-1.5 bg-background-surface hover:bg-background-surface/80 rounded-full transition-colors"
                    >
                      <Camera className="h-4 w-4 text-foreground" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-foreground">
                      {user?.displayName || user?.username}
                    </p>
                    <p className="text-sm text-foreground-muted">@{user?.username}</p>
                  </div>
                </div>
              </div>

              {/* Editable fields */}
              <div className="space-y-4">
                <div className="bg-background rounded-lg p-4">
                  <label className="text-xs font-semibold text-foreground-muted uppercase mb-2 block">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-background-surface text-foreground rounded px-3 py-2 border border-border focus:border-accent focus:outline-none"
                    placeholder={user?.username}
                  />
                </div>

                <div className="bg-background rounded-lg p-4">
                  <label className="text-xs font-semibold text-foreground-muted uppercase mb-2 block">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full bg-background-surface text-foreground rounded px-3 py-2 border border-border focus:border-accent focus:outline-none resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className="bg-background rounded-lg p-4">
                  <label className="text-xs font-semibold text-foreground-muted uppercase mb-2 block">
                    Email
                  </label>
                  <p className="text-foreground">{user?.email || 'Not set'}</p>
                  <p className="text-xs text-foreground-subtle mt-1">
                    Email can only be changed through account recovery
                  </p>
                </div>

                {profileMessage && (
                  <div
                    className={cn(
                      'p-3 rounded flex items-center gap-2',
                      profileMessage.type === 'success' ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
                    )}
                  >
                    {profileMessage.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    {profileMessage.text}
                  </div>
                )}

                <button
                  onClick={handleProfileSave}
                  disabled={isSavingProfile}
                  className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-foreground rounded text-sm transition-colors"
                >
                  {isSavingProfile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-6">Security</h3>

              {/* Change Password */}
              <div className="bg-background rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="h-5 w-5 text-foreground-muted" />
                  <h4 className="text-sm font-medium text-foreground">Change Password</h4>
                </div>

                <div className="space-y-3">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-background-surface text-foreground rounded px-3 py-2 border border-border focus:border-accent focus:outline-none"
                    placeholder="Current password"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-background-surface text-foreground rounded px-3 py-2 border border-border focus:border-accent focus:outline-none"
                    placeholder="New password"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-background-surface text-foreground rounded px-3 py-2 border border-border focus:border-accent focus:outline-none"
                    placeholder="Confirm new password"
                  />
                </div>

                {passwordMessage && (
                  <div
                    className={cn(
                      'mt-3 p-3 rounded flex items-center gap-2',
                      passwordMessage.type === 'success' ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
                    )}
                  >
                    {passwordMessage.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    {passwordMessage.text}
                  </div>
                )}

                <button
                  onClick={handlePasswordChange}
                  disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="mt-3 flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-foreground rounded text-sm transition-colors"
                >
                  {isChangingPassword ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Key className="h-4 w-4" />
                  )}
                  Change Password
                </button>
              </div>

              {/* 2FA Status */}
              <div className="bg-background rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-foreground-muted" />
                    <div>
                      <h4 className="text-sm font-medium text-foreground">Two-Factor Authentication</h4>
                      <p className="text-xs text-foreground-subtle">
                        {user?.has2FA ? '2FA is currently enabled' : '2FA is currently disabled'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      user?.has2FA ? 'bg-success/20 text-success' : 'bg-background-surface text-foreground-muted'
                    )}
                  >
                    {user?.has2FA ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs text-foreground-subtle mt-3">
                  Two-factor authentication settings coming soon...
                </p>
              </div>
            </div>
          )}

          {activeSection === 'voice-video' && (
            <div className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-6">Voice & Video</h3>

              {/* Input Device */}
              <div className="bg-background rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="h-4 w-4 text-foreground-muted" />
                  <label className="text-sm font-medium text-foreground">Input Device</label>
                </div>
                <select
                  value={selectedInput}
                  onChange={(e) => setSelectedInput(e.target.value)}
                  className="w-full bg-background-surface text-foreground rounded px-3 py-2 text-sm border border-border focus:border-accent focus:outline-none"
                >
                  {inputDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${inputDevices.indexOf(device) + 1}`}
                    </option>
                  ))}
                  {inputDevices.length === 0 && (
                    <option value="">No microphones found</option>
                  )}
                </select>

                {/* Mic Test Button and Level */}
                <div className="mt-3">
                  <button
                    onClick={startMicTest}
                    className={cn(
                      'px-3 py-1.5 rounded text-sm transition-colors',
                      isMicTesting
                        ? 'bg-error hover:bg-error/80 text-foreground'
                        : 'bg-background-surface hover:bg-background-surface/80 text-foreground'
                    )}
                  >
                    {isMicTesting ? 'Stop Test' : 'Test Microphone'}
                  </button>

                  {/* Audio Level Indicator */}
                  {isMicTesting && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-foreground-muted">Level:</span>
                        <div className="flex-1 h-3 bg-background-surface rounded-full overflow-hidden">
                          <div
                            className="h-full bg-success transition-all duration-75"
                            style={{ width: `${micLevel}%` }}
                          />
                        </div>
                      </div>
                      {micLevel > 10 && (
                        <p className="text-xs text-success mt-1">Microphone is working!</p>
                      )}
                      {micLevel < 5 && (
                        <p className="text-xs text-foreground-subtle mt-1">Try speaking into your microphone</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Output Device */}
              <div className="bg-background rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="h-4 w-4 text-foreground-muted" />
                  <label className="text-sm font-medium text-foreground">Output Device</label>
                </div>
                <select
                  value={selectedOutput}
                  onChange={(e) => setSelectedOutput(e.target.value)}
                  className="w-full bg-background-surface text-foreground rounded px-3 py-2 text-sm border border-border focus:border-accent focus:outline-none"
                >
                  {outputDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Speaker ${outputDevices.indexOf(device) + 1}`}
                    </option>
                  ))}
                  {outputDevices.length === 0 && (
                    <option value="">No speakers found</option>
                  )}
                </select>
              </div>

              {/* Video Device */}
              <div className="bg-background rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="h-4 w-4 text-foreground-muted" />
                  <label className="text-sm font-medium text-foreground">Camera</label>
                </div>
                <select
                  value={selectedVideo}
                  onChange={(e) => {
                    setSelectedVideo(e.target.value);
                    // Restart video preview with new device
                    if (isVideoEnabled) {
                      stopVideoStream();
                      startVideoPreview();
                    }
                  }}
                  className="w-full bg-background-surface text-foreground rounded px-3 py-2 text-sm border border-border focus:border-accent focus:outline-none"
                >
                  {videoDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                    </option>
                  ))}
                  {videoDevices.length === 0 && (
                    <option value="">No cameras found</option>
                  )}
                </select>
              </div>

              {/* Video Preview */}
              <div className="bg-background rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-foreground">Video Preview</h4>
                  <button
                    onClick={isVideoEnabled ? stopVideoStream : startVideoPreview}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors',
                      isVideoEnabled
                        ? 'bg-error hover:bg-error/80 text-foreground'
                        : 'bg-success hover:bg-success/80 text-foreground'
                    )}
                  >
                    {isVideoEnabled ? (
                      <>
                        <VideoOff className="h-4 w-4" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4" />
                        Start
                      </>
                    )}
                  </button>
                </div>

                <div className="aspect-video bg-background-surface rounded overflow-hidden relative">
                  {isVideoEnabled ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Video className="h-12 w-12 text-foreground-subtle mb-2" />
                      <p className="text-sm text-foreground-subtle">
                        {videoError || 'Click Start to preview your camera'}
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-foreground-subtle mt-2">
                  Camera preview is only visible to you
                </p>
              </div>
            </div>
          )}

          {/* Advanced Section */}
          {activeSection === 'advanced' && (
            <div className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-6">Advanced</h3>

              <div className="space-y-6">
                {/* Developer Mode */}
                <div className="bg-background-surface rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Code className="h-5 w-5 text-foreground-muted" />
                        <h4 className="text-sm font-medium text-foreground">Developer Mode</h4>
                      </div>
                      <p className="text-sm text-foreground-muted mb-3">
                        Enables additional context menu options like Copy ID for channels, servers, users, and roles.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-foreground-subtle">
                        <Copy className="h-3 w-3" />
                        <span>Copy IDs will appear in right-click menus</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setDeveloperMode(!developerMode)}
                      className={cn(
                        'relative w-12 h-6 rounded-full transition-colors',
                        developerMode ? 'bg-accent' : 'bg-background-elevated'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                          developerMode ? 'translate-x-7' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="bg-background-surface/50 rounded-lg p-4 border border-border">
                  <h4 className="text-sm font-medium text-foreground mb-2">About Developer Mode</h4>
                  <ul className="text-xs text-foreground-muted space-y-1 list-disc list-inside">
                    <li>Copy Channel ID, Server ID, User ID, Role ID from context menus</li>
                    <li>Useful for bot development and API testing</li>
                    <li>IDs are unique identifiers for each entity</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
