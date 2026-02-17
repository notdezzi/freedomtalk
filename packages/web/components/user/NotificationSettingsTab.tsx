'use client';

import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';

export default function NotificationSettingsTab() {
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(true);
  const [sounds, setSounds] = useState(true);

  return (
    <div className="space-y-8">
      {/* Enable Notifications */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">Enable Notifications</h4>
          <p className="text-sm text-foreground-muted">
            Receive notifications for messages and mentions
          </p>
        </div>
        <button
          onClick={() => setEnableNotifications(!enableNotifications)}
          className={`w-12 h-6 rounded-full transition-colors ${
            enableNotifications ? 'bg-accent' : 'bg-foreground-muted'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white transition-transform ${
              enableNotifications ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {enableNotifications && (
        <>
          {/* Desktop Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Desktop Notifications</h4>
              <p className="text-sm text-foreground-muted">
                Show notifications on your desktop
              </p>
            </div>
            <button
              onClick={() => setDesktopNotifications(!desktopNotifications)}
              className={`w-12 h-6 rounded-full transition-colors ${
                desktopNotifications ? 'bg-accent' : 'bg-foreground-muted'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  desktopNotifications ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Sounds */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Notification Sounds</h4>
              <p className="text-sm text-foreground-muted">
                Play a sound when you receive a notification
              </p>
            </div>
            <button
              onClick={() => setSounds(!sounds)}
              className={`w-12 h-6 rounded-full transition-colors ${
                sounds ? 'bg-accent' : 'bg-foreground-muted'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  sounds ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Notification Types */}
          <div>
            <h4 className="font-semibold mb-4">Notification Types</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm">Direct messages</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm">Mentions (@username)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm">@everyone and @here</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm">All messages in servers</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm">Friend requests</span>
              </label>
            </div>
          </div>

          {/* Suppress Notifications */}
          <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <h4 className="font-semibold text-warning mb-2">Suppress Notifications</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm">Suppress @everyone and @here</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm">Suppress all role mentions</span>
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
