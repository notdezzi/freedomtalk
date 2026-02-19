/**
 * DM Privacy types
 */

export type DmPrivacyLevel = 'open' | 'friends_only' | 'none';

export interface DmPrivacySettings {
  dmPrivacyLevel: DmPrivacyLevel;
}
