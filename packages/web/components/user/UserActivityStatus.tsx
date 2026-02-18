'use client';

import { Joystick, Music, Video, Code, FileText, Globe, Monitor } from 'lucide-react';

// Activity types matching shared types
export type ActivityType = 'game' | 'music' | 'streaming' | 'custom' | 'code' | 'document' | 'browser';

export interface Activity {
  type: ActivityType;
  name: string;
  details?: string;
  state?: string;
  timestamps?: {
    start?: Date;
    end?: Date;
  };
  assets?: {
    largeImage?: string;
    largeText?: string;
    smallImage?: string;
    smallText?: string;
  };
  emoji?: string;
}

interface UserActivityStatusProps {
  activities: Activity[];
  className?: string;
  compact?: boolean;
}

// Icon mapping for activity types
const activityIcons: Record<ActivityType, typeof Joystick | null> = {
  game: Joystick,
  music: Music,
  streaming: Video,
  custom: null, // Uses emoji
  code: Code,
  document: FileText,
  browser: Globe,
};

// Color mapping for activity types
const activityColors: Record<ActivityType, string> = {
  game: 'text-success',
  music: 'text-secondary',
  streaming: 'text-error',
  custom: 'text-foreground-muted',
  code: 'text-accent',
  document: 'text-foreground-muted',
  browser: 'text-warning',
};

// Activity type labels
const activityLabels: Record<ActivityType, string> = {
  game: 'Playing',
  music: 'Listening to',
  streaming: 'Streaming',
  custom: '',
  code: 'Developing',
  document: 'Editing',
  browser: 'Browsing',
};

/**
 * UserActivityStatus - Displays a user's activity status
 * Shows "Playing...", "Listening to...", etc. with appropriate icons
 */
export default function UserActivityStatus({
  activities,
  className = '',
  compact = false,
}: UserActivityStatusProps) {
  if (!activities || activities.length === 0) {
    return null;
  }

  // Filter out invisible activities and take the first visible one
  const visibleActivity = activities.find(a => a.type !== 'custom') || activities[0];

  if (!visibleActivity) {
    return null;
  }

  const Icon = activityIcons[visibleActivity.type];
  const colorClass = activityColors[visibleActivity.type];
  const label = activityLabels[visibleActivity.type];

  // Calculate elapsed time for activities with start timestamp
  const getElapsedTime = () => {
    if (!visibleActivity.timestamps?.start) return null;

    const start = new Date(visibleActivity.timestamps.start);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);

    if (elapsed < 60) return `${elapsed}s`;
    if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m`;
    if (elapsed < 86400) return `${Math.floor(elapsed / 3600)}h`;
    return `${Math.floor(elapsed / 86400)}d`;
  };

  const elapsedTime = getElapsedTime();

  if (compact) {
    return (
      <div className={`flex items-center gap-1 text-xs ${colorClass} ${className}`}>
        {visibleActivity.emoji ? (
          <span>{visibleActivity.emoji}</span>
        ) : Icon ? (
          <Icon className="w-3 h-3" />
        ) : null}
        <span className="truncate">
          {label} {visibleActivity.name}
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Main activity line */}
      <div className="flex items-center gap-2">
        {visibleActivity.emoji ? (
          <span className="text-sm">{visibleActivity.emoji}</span>
        ) : Icon ? (
          <Icon className={`w-4 h-4 ${colorClass}`} />
        ) : null}
        <span className={`text-sm font-medium ${colorClass}`}>
          {label} {visibleActivity.name}
        </span>
        {elapsedTime && (
          <span className="text-xs text-foreground-muted">
            for {elapsedTime}
          </span>
        )}
      </div>

      {/* Details line */}
      {visibleActivity.details && (
        <p className="text-xs text-foreground-muted truncate pl-6">
          {visibleActivity.details}
        </p>
      )}

      {/* State line */}
      {visibleActivity.state && (
        <p className="text-xs text-foreground-subtle truncate pl-6">
          {visibleActivity.state}
        </p>
      )}
    </div>
  );
}

/**
 * ActivityIcon - Just the icon for an activity type
 */
export function ActivityIcon({
  type,
  className = '',
}: {
  type: ActivityType;
  className?: string;
}) {
  const Icon = activityIcons[type];
  const colorClass = activityColors[type];

  if (!Icon) return null;

  return <Icon className={`w-4 h-4 ${colorClass} ${className}`} />;
}

/**
 * MultipleActivities - Shows multiple activities in a stacked layout
 */
export function MultipleActivities({
  activities,
  className = '',
  maxVisible = 3,
}: {
  activities: Activity[];
  className?: string;
  maxVisible?: number;
}) {
  const visibleActivities = activities.slice(0, maxVisible);
  const hiddenCount = activities.length - maxVisible;

  if (visibleActivities.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {visibleActivities.map((activity, index) => (
        <UserActivityStatus
          key={`${activity.type}-${activity.name}-${index}`}
          activities={[activity]}
          compact
        />
      ))}
      {hiddenCount > 0 && (
        <p className="text-xs text-foreground-muted">
          +{hiddenCount} more activities
        </p>
      )}
    </div>
  );
}
