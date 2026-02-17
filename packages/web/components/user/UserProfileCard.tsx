'use client';

import { useState, useEffect, useRef } from 'react';
import { X, MessageCircle, Phone, Video, UserPlus, MoreVertical, Clock, AtSign } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api-client';

interface UserProfileCardProps {
  userId: string;
  serverId?: string;
  memberData?: {
    roles?: string[];
    joinedAt?: string;
    nickname?: string;
  };
  onClose: () => void;
}

interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  banner?: string;
  aboutMe?: string;
  createdAt: string;
  status?: 'online' | 'idle' | 'dnd' | 'offline';
  statusMessage?: string;
}

export default function UserProfileCard({ userId, serverId, memberData, onClose }: UserProfileCardProps) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const response = await apiClient.getUser(userId);
      if (response.success && response.data) {
        setProfile(response.data as unknown as UserProfile);
      }
      setLoading(false);
    };

    fetchProfile();

    // Close on outside click
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userId, onClose]);

  if (loading) {
    return (
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-background-elevated border-l border-border z-40 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-background-elevated border-l border-border z-40 p-4">
        <div className="text-center text-foreground-muted">User not found</div>
      </div>
    );
  }

  const isSelf = currentUser?.id === userId;
  const displayName = memberData?.nickname || profile.displayName || profile.username;

  const getStatusColor = () => {
    switch (profile.status) {
      case 'online':
        return 'bg-success';
      case 'idle':
        return 'bg-warning';
      case 'dnd':
        return 'bg-error';
      default:
        return 'bg-foreground-muted';
    }
  };

  return (
    <div
      ref={cardRef}
      className="fixed right-0 top-0 bottom-0 w-80 bg-background-elevated border-l border-border z-40 flex flex-col overflow-hidden"
    >
      {/* Banner */}
      <div className="h-24 relative">
        {profile.banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.banner}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-accent to-secondary" />
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Avatar */}
      <div className="px-4 -mt-10 relative z-10">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-accent border-4 border-background-elevated flex items-center justify-center overflow-hidden">
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-background">
                {profile.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {/* Status indicator */}
          <div
            className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-3 border-background-elevated ${getStatusColor()}`}
          />
        </div>
      </div>

      {/* Info */}
      <div className="px-4 pt-2 pb-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{displayName}</h3>
            <p className="text-sm text-foreground-muted">@{profile.username}</p>
          </div>
          <button className="p-1.5 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Status message */}
        {profile.statusMessage && (
          <p className="text-sm text-foreground-muted mt-2">{profile.statusMessage}</p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Actions */}
        {!isSelf && (
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded bg-accent text-background font-medium hover:bg-accent-hover transition-colors">
              <MessageCircle className="w-4 h-4" />
              Message
            </button>
            <button className="p-2 rounded bg-background-surface text-foreground-muted hover:text-foreground transition-colors">
              <Phone className="w-4 h-4" />
            </button>
            <button className="p-2 rounded bg-background-surface text-foreground-muted hover:text-foreground transition-colors">
              <Video className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* About Me */}
        {profile.aboutMe && (
          <div>
            <h4 className="text-xs font-semibold text-foreground-muted uppercase mb-2">About Me</h4>
            <p className="text-sm">{profile.aboutMe}</p>
          </div>
        )}

        {/* Member Info */}
        {serverId && memberData && (
          <div>
            <h4 className="text-xs font-semibold text-foreground-muted uppercase mb-2">Member Since</h4>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-foreground-muted" />
              {memberData.joinedAt
                ? new Date(memberData.joinedAt).toLocaleDateString()
                : 'Unknown'}
            </div>
          </div>
        )}

        {/* Account Created */}
        <div>
          <h4 className="text-xs font-semibold text-foreground-muted uppercase mb-2">Account Created</h4>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-foreground-muted" />
            {new Date(profile.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Note */}
        <div>
          <h4 className="text-xs font-semibold text-foreground-muted uppercase mb-2">Note</h4>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Click to add a note"
            rows={3}
            className="w-full px-3 py-2 text-sm bg-background-surface rounded border border-border focus:border-accent focus:outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
}
