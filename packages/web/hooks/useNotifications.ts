import { useCallback, useEffect, useRef, useState } from 'react';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  mentions: boolean;
  directMessages: boolean;
  serverMessages: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  sound: true,
  desktop: true,
  mentions: true,
  directMessages: true,
  serverMessages: false,
};

const STORAGE_KEY = 'freedomtalk-notification-settings';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setSettings(JSON.parse(stored));
        } catch {
          // Ignore parse errors
        }
      }

      // Check notification permission
      if ('Notification' in window) {
        setPermission(Notification.permission);
      }
    }
  }, []);

  // Create audio element for notification sound
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio('/sounds/notification.mp3');
      audioRef.current.volume = 0.5;
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return 'denied' as NotificationPermission;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  // Play notification sound
  const playSound = useCallback(() => {
    if (settings.sound && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore play errors (browser may block autoplay)
      });
    }
  }, [settings.sound]);

  // Show desktop notification
  const showNotification = useCallback(
    async (options: NotificationOptions) => {
      if (!settings.enabled || !settings.desktop) return;

      // Check/request permission
      let currentPermission = permission;
      if (currentPermission === 'default') {
        currentPermission = await requestPermission();
      }

      if (currentPermission !== 'granted') return;

      // Don't show if window is focused and tab is visible
      if (document.hasFocus() && document.visibilityState === 'visible') {
        return;
      }

      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192x192.png',
        tag: options.tag,
      });

      if (options.onClick) {
        notification.onclick = () => {
          options.onClick!();
          notification.close();
          window.focus();
        };
      }

      // Play sound
      playSound();

      return notification;
    },
    [settings.enabled, settings.desktop, permission, requestPermission, playSound]
  );

  // Notify for message
  const notifyMessage = useCallback(
    (data: {
      channelId: string;
      channelName: string;
      serverName?: string;
      authorName: string;
      content: string;
      isDirectMessage?: boolean;
      isMention?: boolean;
    }) => {
      const { channelName, serverName, authorName, content, isDirectMessage, isMention } = data;

      // Check if we should notify
      if (isDirectMessage && !settings.directMessages) return;
      if (!isDirectMessage && isMention && !settings.mentions) return;
      if (!isDirectMessage && !isMention && !settings.serverMessages) return;

      const title = isDirectMessage
        ? authorName
        : `${authorName} (#${channelName})`;

      const body = isDirectMessage
        ? content
        : serverName
        ? `${serverName} - ${content}`
        : content;

      showNotification({
        title,
        body: body.slice(0, 100),
        tag: `message-${data.channelId}`,
      });
    },
    [settings, showNotification]
  );

  // Update settings
  const updateSettings = useCallback(
    (updates: Partial<NotificationSettings>) => {
      setSettings((prev) => {
        const newSettings = { ...prev, ...updates };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
        return newSettings;
      });
    },
    []
  );

  return {
    permission,
    settings,
    requestPermission,
    showNotification,
    notifyMessage,
    playSound,
    updateSettings,
  };
}
