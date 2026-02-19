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
        variant === 'sidebar' && 'h-full bg-gray-800',
        variant === 'modal' && 'w-80 rounded-lg bg-gray-800',
        variant === 'dm-profile' && 'h-full bg-gray-800',
        className
      )}
    >
      {/* Banner */}
      <div className="relative h-16 bg-gray-700">
        {user.banner && (
          <img
            src={user.banner}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {/* Avatar */}
      <div className="relative px-4">
        <Avatar
          src={user.avatar}
          alt={user.displayName || user.username}
          size="xl"
          status={user.status}
          showStatus
          className="-mt-10 border-4 border-gray-800"
        />
      </div>

      {/* User info */}
      <div className="px-4 pb-4">
        {/* Name */}
        <div className="mt-2">
          <h2 className="text-xl font-bold text-white">
            {user.displayName || user.username}
          </h2>
          {user.displayName && (
            <p className="text-sm text-gray-400">{user.username}</p>
          )}
        </div>

        {/* Custom status */}
        {user.customStatus && (
          <p className="mt-2 text-sm text-gray-300">{user.customStatus}</p>
        )}

        {/* Divider */}
        <div className="my-3 border-t border-gray-700" />

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
            <div className="my-3 border-t border-gray-700" />
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-400 mb-1">
                About Me
              </h3>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">
                {user.bio}
              </p>
            </div>
          </>
        )}

        {/* Roles (for server context) */}
        {user.roles && user.roles.length > 0 && (
          <>
            <div className="my-3 border-t border-gray-700" />
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-400 mb-1">
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
            <div className="my-3 border-t border-gray-700" />
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-400 mb-1">
                Member Since
              </h3>
              <p className="text-sm text-gray-300">
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
        <div className="my-3 border-t border-gray-700" />
        <div>
          <h3 className="text-xs font-semibold uppercase text-gray-400 mb-1">
            Note
          </h3>
          <textarea
            placeholder="Click to add a note"
            className="w-full rounded bg-gray-700 p-2 text-sm text-gray-300 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}
