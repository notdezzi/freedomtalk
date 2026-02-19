'use client';

import { cn } from '@/lib/utils';
import { Avatar, Button } from '@/components/ui';
import type { User, Role, Activity } from '@/types';
import type { FriendshipStatus } from '@/types';

export interface ProfilePanelProps {
  variant: 'sidebar' | 'modal' | 'dm-profile';
  user: User & {
    roles?: Role[];
    joinedAt?: string;
    activities?: Activity[];
    voiceChannel?: string;
  };
  friendshipStatus?: FriendshipStatus;
  onMessage?: () => void;
  onAddFriend?: () => void;
  onRemoveFriend?: () => void;
  onBlock?: () => void;
  className?: string;
}

export function ProfilePanel({
  variant,
  user,
  friendshipStatus = 'none',
  onMessage,
  onAddFriend,
  onRemoveFriend,
  onBlock,
  className,
}: ProfilePanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden',
        variant === 'sidebar' && 'h-full bg-background-elevated',
        variant === 'modal' && 'bg-background-elevated',
        variant === 'dm-profile' && 'h-full bg-background-elevated',
        className
      )}
    >
      {/* Banner - taller for modal to fit close button */}
      <div className={cn(
        "relative bg-background-surface",
        variant === 'modal' ? "h-24" : "h-16"
      )}>
        {user.banner && (
          <img
            src={user.banner}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {/* Avatar - positioned based on variant */}
      <div className={cn(
        "relative px-4",
        variant === 'modal' && "flex justify-end"
      )}>
        <Avatar
          src={user.avatar}
          alt={user.displayName || user.username}
          size="xl"
          status={user.status}
          showStatus
          className={cn(
            "border-4 border-background-elevated",
            variant === 'modal' ? "-mt-14" : "-mt-10"
          )}
        />
      </div>

      {/* User info */}
      <div className="px-4 pb-4">
        {/* Name - less margin for modal to move it up */}
        <div className={cn(
          variant === 'modal' ? "mt-0" : "mt-2"
        )}>
          <h2 className="text-xl font-bold text-white">
            {user.displayName || user.username}
          </h2>
          {user.displayName && (
            <p className="text-sm text-foreground-muted">{user.username}</p>
          )}
        </div>

        {/* Custom status */}
        {user.customStatus && (
          <p className="mt-2 text-sm text-foreground">{user.customStatus}</p>
        )}

        {/* Divider */}
        <div className="my-3 border-t border-border" />

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {friendshipStatus === 'friends' && onMessage && (
            <Button size="sm" onClick={onMessage}>
              Message
            </Button>
          )}
          {friendshipStatus === 'none' && onAddFriend && (
            <Button size="sm" onClick={onAddFriend}>
              Add Friend
            </Button>
          )}
          {friendshipStatus === 'pending-sent' && (
            <Button size="sm" variant="secondary" disabled>
              Friend Request Sent
            </Button>
          )}
          {friendshipStatus === 'friends' && onRemoveFriend && (
            <Button size="sm" variant="ghost" onClick={onRemoveFriend}>
              Remove Friend
            </Button>
          )}
        </div>

        {/* Bio */}
        {user.bio && (
          <>
            <div className="my-3 border-t border-border" />
            <div>
              <h3 className="text-xs font-semibold uppercase text-foreground-muted mb-1">
                About Me
              </h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {user.bio}
              </p>
            </div>
          </>
        )}

        {/* Roles (for server context) */}
        {user.roles && user.roles.length > 0 && (
          <>
            <div className="my-3 border-t border-border" />
            <div>
              <h3 className="text-xs font-semibold uppercase text-foreground-muted mb-1">
                Roles
              </h3>
              <div className="flex flex-wrap gap-1">
                {user.roles.map((role) => (
                  <span
                    key={role.id}
                    className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: role.color ? `${role.color.toString(16)}20` : '#99aab520',
                      color: role.color ? `#${role.color.toString(16)}` : '#99aab5',
                    }}
                  >
                    {role.name}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Member since */}
        {user.joinedAt && (
          <>
            <div className="my-3 border-t border-border" />
            <div>
              <h3 className="text-xs font-semibold uppercase text-foreground-muted mb-1">
                Member Since
              </h3>
              <p className="text-sm text-foreground">
                {new Date(user.joinedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </>
        )}

        {/* Note */}
        <div className="my-3 border-t border-border" />
        <div>
          <h3 className="text-xs font-semibold uppercase text-foreground-muted mb-1">
            Note
          </h3>
          <textarea
            placeholder="Click to add a note"
            className="w-full rounded bg-background-surface p-2 text-sm text-foreground placeholder:text-foreground-subtle resize-none focus:outline-none focus:ring-2 focus:ring-accent"
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}
