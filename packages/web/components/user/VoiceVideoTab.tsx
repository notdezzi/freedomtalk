'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Video, Volume2, Loader2, Check, AlertCircle, Monitor } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface MediaDevices {
  audioInput: MediaDeviceInfo[];
  audioOutput: MediaDeviceInfo[];
  videoInput: MediaDeviceInfo[];
}

interface VoiceSettings {
  inputDevice: string;
  outputDevice: string;
  videoDevice: string;
  inputVolume: number;
  outputVolume: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  automaticGainControl: boolean;
  videoMirrored: boolean;
}

const defaultSettings: VoiceSettings = {
  inputDevice: 'default',
  outputDevice: 'default',
  videoDevice: 'default',
  inputVolume: 100,
  outputVolume: 100,
  noiseSuppression: true,
  echoCancellation: true,
  automaticGainControl: true,
  videoMirrored: true,
};

export default function VoiceVideoTab() {
  const [devices, setDevices] = useState<MediaDevices>({
    audioInput: [],
    audioOutput: [],
    videoInput: [],
  });
  const [settings, setSettings] = useState<VoiceSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testingMic, setTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    fetchSettings();
    getMediaDevices();

    return () => {
      stopMicTest();
    };
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/v1/users/me/settings/voice');
      if (response.success && response.data) {
        setSettings({ ...defaultSettings, ...response.data });
      }
    } catch {
      // Use defaults if fetch fails
    } finally {
      setLoading(false);
    }
  };

  const getMediaDevices = async () => {
    try {
      // Request permissions first
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setHasPermission(true);

      const deviceList = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        audioInput: deviceList.filter((d) => d.kind === 'audioinput'),
        audioOutput: deviceList.filter((d) => d.kind === 'audiooutput'),
        videoInput: deviceList.filter((d) => d.kind === 'videoinput'),
      });
    } catch (err) {
      setHasPermission(false);
    }
  };

  const saveSettings = async (newSettings: VoiceSettings) => {
    setSaving(true);
    setSaved(false);
    try {
      await apiClient.patch('/api/v1/users/me/settings/voice', newSettings);
      setSettings(newSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Handle error silently
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof VoiceSettings>(key: K, value: VoiceSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const startMicTest = async () => {
    try {
      setTestingMic(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: settings.inputDevice !== 'default' ? settings.inputDevice : undefined,
          noiseSuppression: settings.noiseSuppression,
          echoCancellation: settings.echoCancellation,
          autoGainControl: settings.automaticGainControl,
        },
      });

      streamRef.current = stream;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setMicLevel(Math.min(100, (average / 128) * 100));
        animationRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err) {
      setTestingMic(false);
    }
  };

  const stopMicTest = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setTestingMic(false);
    setMicLevel(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-foreground-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Voice & Video</h4>
          <p className="text-sm text-foreground-muted">Configure your audio and video settings</p>
        </div>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saved && (
          <span className="text-sm text-accent flex items-center gap-1">
            <Check className="w-4 h-4" /> Saved
          </span>
        )}
      </div>

      {hasPermission === false && (
        <div className="p-4 rounded-lg bg-error/10 border border-error/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Permission Required</p>
              <p className="text-xs text-error/80 mt-1">
                Please allow access to your microphone and camera in your browser settings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Input Device */}
      <div className="card bg-background-surface space-y-4">
        <h5 className="font-medium text-sm uppercase text-foreground-muted flex items-center gap-2">
          <Mic className="w-4 h-4" /> Input Device
        </h5>

        <div>
          <label className="block text-sm font-medium mb-2">Microphone</label>
          <select
            value={settings.inputDevice}
            onChange={(e) => updateSetting('inputDevice', e.target.value)}
            className="input w-full"
          >
            <option value="default">Default</option>
            {devices.audioInput.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>

        {/* Mic Test */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={testingMic ? stopMicTest : startMicTest}
              className="btn btn-secondary text-sm"
            >
              {testingMic ? 'Stop Test' : 'Test Microphone'}
            </button>
          </div>
          {testingMic && (
            <div className="w-full h-4 bg-background-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-75"
                style={{ width: `${micLevel}%` }}
              />
            </div>
          )}
        </div>

        {/* Input Volume */}
        <div>
          <label className="block text-sm font-medium mb-2">Input Volume: {settings.inputVolume}%</label>
          <input
            type="range"
            min="0"
            max="200"
            value={settings.inputVolume}
            onChange={(e) => updateSetting('inputVolume', parseInt(e.target.value))}
            className="w-full accent-accent"
          />
        </div>

        {/* Audio Processing */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Noise Suppression</p>
              <p className="text-xs text-foreground-muted">Reduce background noise</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.noiseSuppression}
                onChange={(e) => updateSetting('noiseSuppression', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-background-elevated rounded-full peer peer-checked:bg-accent after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Echo Cancellation</p>
              <p className="text-xs text-foreground-muted">Prevent echo from speakers</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.echoCancellation}
                onChange={(e) => updateSetting('echoCancellation', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-background-elevated rounded-full peer peer-checked:bg-accent after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Automatic Gain Control</p>
              <p className="text-xs text-foreground-muted">Automatically adjust volume</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.automaticGainControl}
                onChange={(e) => updateSetting('automaticGainControl', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-background-elevated rounded-full peer peer-checked:bg-accent after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
        </div>
      </div>

      {/* Output Device */}
      <div className="card bg-background-surface space-y-4">
        <h5 className="font-medium text-sm uppercase text-foreground-muted flex items-center gap-2">
          <Volume2 className="w-4 h-4" /> Output Device
        </h5>

        <div>
          <label className="block text-sm font-medium mb-2">Speaker</label>
          <select
            value={settings.outputDevice}
            onChange={(e) => updateSetting('outputDevice', e.target.value)}
            className="input w-full"
          >
            <option value="default">Default</option>
            {devices.audioOutput.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Output Volume: {settings.outputVolume}%
          </label>
          <input
            type="range"
            min="0"
            max="200"
            value={settings.outputVolume}
            onChange={(e) => updateSetting('outputVolume', parseInt(e.target.value))}
            className="w-full accent-accent"
          />
        </div>
      </div>

      {/* Video Device */}
      <div className="card bg-background-surface space-y-4">
        <h5 className="font-medium text-sm uppercase text-foreground-muted flex items-center gap-2">
          <Video className="w-4 h-4" /> Video Device
        </h5>

        <div>
          <label className="block text-sm font-medium mb-2">Camera</label>
          <select
            value={settings.videoDevice}
            onChange={(e) => updateSetting('videoDevice', e.target.value)}
            className="input w-full"
          >
            <option value="default">Default</option>
            {devices.videoInput.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Mirror Video</p>
            <p className="text-xs text-foreground-muted">Flip your video horizontally</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.videoMirrored}
              onChange={(e) => updateSetting('videoMirrored', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-background-elevated rounded-full peer peer-checked:bg-accent after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>
      </div>

      {/* Screen Share */}
      <div className="card bg-background-surface space-y-4">
        <h5 className="font-medium text-sm uppercase text-foreground-muted flex items-center gap-2">
          <Monitor className="w-4 h-4" /> Screen Share
        </h5>

        <p className="text-sm text-foreground-muted">
          Screen sharing quality and frame rate can be adjusted when you start sharing your screen.
        </p>
      </div>
    </div>
  );
}
