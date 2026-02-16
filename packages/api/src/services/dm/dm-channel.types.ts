/**
 * DM Channel Types
 */

/**
 * DM Channel type enum
 */
export type DMChannelType = 'dm' | 'group_dm';

/**
 * DM Channel interface matching database schema
 */
export interface DMChannel {
  id: string;
  type: DMChannelType;
  name: string | null;
  icon_url: string | null;
  owner_id: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * DM Channel response for API
 */
export interface DMChannelResponse {
  id: string;
  type: DMChannelType;
  name: string | null;
  iconUrl: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  participants: DMChannelParticipantResponse[];
}

/**
 * DM Channel participant response for API
 */
export interface DMChannelParticipantResponse {
  id: string;
  userId: string;
  joinedAt: string;
  leftAt: string | null;
  isActive: boolean;
}

/**
 * Convert DM channel to API response format
 */
export function toDMChannelResponse(dmChannel: any, participants: any[]): DMChannelResponse {
  return {
    id: dmChannel.id,
    type: dmChannel.type,
    name: dmChannel.name,
    iconUrl: dmChannel.icon_url,
    ownerId: dmChannel.owner_id,
    createdAt: dmChannel.created_at.toISOString(),
    updatedAt: dmChannel.updated_at.toISOString(),
    participants: participants.map((p) => ({
      id: p.id,
      userId: p.user_id,
      joinedAt: p.joined_at.toISOString(),
      leftAt: p.left_at ? p.left_at.toISOString() : null,
      isActive: p.is_active,
    })),
  };
}
