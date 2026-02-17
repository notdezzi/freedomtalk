'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

const themes = [
  { id: 'dark', name: 'Dark', bg: 'bg-zinc-900', accent: 'bg-indigo-500' },
  { id: 'light', name: 'Light', bg: 'bg-gray-100', accent: 'bg-indigo-500' },
];

const fontSizes = [
  { id: 'sm', name: 'Small', size: 'text-sm' },
  { id: 'md', name: 'Medium', size: 'text-base' },
  { id: 'lg', name: 'Large', size: 'text-lg' },
];

const accentColors = [
  { id: 'indigo', color: 'bg-indigo-500', hex: '#6366f1' },
  { id: 'purple', color: 'bg-purple-500', hex: '#a855f7' },
  { id: 'pink', color: 'bg-pink-500', hex: '#ec4899' },
  { id: 'red', color: 'bg-red-500', hex: '#ef4444' },
  { id: 'orange', color: 'bg-orange-500', hex: '#f97316' },
  { id: 'yellow', color: 'bg-yellow-500', hex: '#eab308' },
  { id: 'green', color: 'bg-green-500', hex: '#22c55e' },
  { id: 'teal', color: 'bg-teal-500', hex: '#14b8a6' },
  { id: 'cyan', color: 'bg-cyan-500', hex: '#06b6d4' },
  { id: 'blue', color: 'bg-blue-500', hex: '#3b82f6' },
];

export default function AppearanceSettingsTab() {
  const { theme, toggleTheme } = useUIStore();
  const [fontSize, setFontSize] = useState('md');
  const [accentColor, setAccentColor] = useState('indigo');

  return (
    <div className="space-y-8">
      {/* Theme */}
      <div>
        <h4 className="font-semibold mb-4">Theme</h4>
        <div className="flex gap-4">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                if ((t.id === 'dark') !== (theme === 'dark')) {
                  toggleTheme();
                }
              }}
              className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                (t.id === 'dark') === (theme === 'dark')
                  ? 'border-accent'
                  : 'border-border hover:border-foreground-muted'
              }`}
            >
              <div className={`w-full h-20 ${t.bg} rounded mb-2 flex items-end justify-center pb-2`}>
                <div className={`w-8 h-2 ${t.accent} rounded`} />
              </div>
              <p className="text-sm font-medium text-center">{t.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <h4 className="font-semibold mb-4">Chat Font Size</h4>
        <div className="flex gap-2">
          {fontSizes.map((fs) => (
            <button
              key={fs.id}
              onClick={() => setFontSize(fs.id)}
              className={`px-4 py-2 rounded border transition-colors ${
                fontSize === fs.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border hover:border-foreground-muted'
              }`}
            >
              <span className={fs.size}>Aa</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div>
        <h4 className="font-semibold mb-4">Accent Color</h4>
        <div className="flex gap-2 flex-wrap">
          {accentColors.map((ac) => (
            <button
              key={ac.id}
              onClick={() => setAccentColor(ac.id)}
              className={`w-10 h-10 rounded-full ${ac.color} flex items-center justify-center transition-transform hover:scale-110`}
              style={{ backgroundColor: ac.hex }}
            >
              {accentColor === ac.id && <Check className="w-5 h-5 text-white" />}
            </button>
          ))}
        </div>
      </div>

      {/* Message Display */}
      <div>
        <h4 className="font-semibold mb-4">Message Display</h4>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm">Show timestamps on messages</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm">Show avatars next to messages</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm">Compact mode (reduce spacing)</span>
          </label>
        </div>
      </div>
    </div>
  );
}
