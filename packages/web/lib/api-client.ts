/**
 * API Client for FreedomTalk Backend
 * Handles authentication tokens and error responses
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string;
    emailVerified: boolean;
    onboardingComplete?: boolean;
  };
  mfaRequired?: boolean;
  sessionId?: string;
}

export interface RegisterResponse {
  userId: string;
  username: string;
  email: string;
  message: string;
}

export interface SessionResponse {
  user: {
    id: string;
    username: string;
    email: string;
    emailVerified: boolean;
    mfaEnabled: boolean;
    accountStatus: string;
    displayName?: string;
    avatar?: string;
    onboardingComplete?: boolean;
  };
}

// API Response types
export interface ServerResponse {
  id: string;
  name: string;
  icon?: string;
  banner?: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  onlineCount?: number;
  isOwner?: boolean;
}

export interface MemberResponse {
  id: string;
  serverId: string;
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  roles: string[];
  joinedAt: string;
  isOwner: boolean;
  isOnline?: boolean;
  status?: string;
  customStatus?: string;
}

export interface InviteResponse {
  id: string;
  code: string;
  serverId?: string;
  server_id?: string;
  createdBy?: string;
  inviter_id?: string;
  maxUses: number;
  max_uses?: number;
  uses: number;
  expiresAt?: string;
  expires_at?: string;
  createdAt: string;
  created_at?: string;
}

export interface ChannelResponse {
  id: string;
  serverId: string;
  categoryId?: string;
  name: string;
  type: string;
  topic?: string;
  position: number;
  nsfw: boolean;
  rateLimitPerUser: number;
  bitrate?: number;
  userLimit?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryResponse {
  id: string;
  serverId: string;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface MessageAuthorResponse {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  bot?: boolean;
}

export interface MessageReactionResponse {
  emoji: { id?: string; name: string; animated?: boolean };
  count: number;
  me: boolean;
}

export interface DMChannelResponse {
  id: string;
  type: 'dm' | 'group_dm';
  name?: string;
  iconUrl?: string;
  ownerId?: string;
  recipients: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  }[];
  lastMessageId?: string;
  lastMessageAt?: string;
  createdAt: string;
}

export interface MessageResponse {
  id: string;
  channelId?: string;
  authorId: string;
  author?: MessageAuthorResponse;
  content: string;
  isEdited: boolean;
  editedAt?: string;
  isPinned: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  reactions?: MessageReactionResponse[];
  embeds?: unknown[];
  attachments?: unknown[];
}

// Token storage helpers (client-side only)
const TOKEN_KEY = 'freedomtalk_access_token';
const REFRESH_TOKEN_KEY = 'freedomtalk_refresh_token';

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredAccessToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredRefreshToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  getAccessToken(): string | null {
    return getStoredAccessToken();
  }

  setAccessToken(token: string | null) {
    setStoredAccessToken(token);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Only set Content-Type for requests with a body
    // For POST/PUT/PATCH without body, send empty object to avoid "Body cannot be empty" error
    const methodHasBody = ['POST', 'PUT', 'PATCH'].includes((options.method || 'GET').toUpperCase());
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    } else if (methodHasBody) {
      // Send empty object body for POST/PUT/PATCH without explicit body
      options.body = JSON.stringify({});
      headers['Content-Type'] = 'application/json';
    }

    // Add authorization header if we have a token
    const accessToken = getStoredAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Include cookies for refresh tokens
      });

      // Handle empty responses (204 No Content)
      if (response.status === 204) {
        return {
          success: true,
          data: undefined,
        };
      }

      // Handle empty body
      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } else {
        data = {};
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: 'UNKNOWN_ERROR',
            message: data.message || 'An unknown error occurred',
          },
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error occurred',
        },
      };
    }
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    const response = await this.request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data?.accessToken) {
      this.setAccessToken(response.data.accessToken);
      if (response.data.refreshToken) {
        setStoredRefreshToken(response.data.refreshToken);
      }
    }

    return response;
  }

  async register(username: string, email: string, password: string): Promise<ApiResponse<RegisterResponse>> {
    return this.request<RegisterResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    const refreshToken = getStoredRefreshToken();

    const response = await this.request<{ message: string }>('/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    // Clear tokens regardless of response
    this.setAccessToken(null);
    setStoredRefreshToken(null);

    return response;
  }

  async refreshTokens(): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    const refreshToken = getStoredRefreshToken();

    if (!refreshToken) {
      return {
        success: false,
        error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token available' },
      };
    }

    const response = await this.request<{ accessToken: string; refreshToken: string }>(
      '/api/v1/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );

    if (response.success && response.data) {
      this.setAccessToken(response.data.accessToken);
      setStoredRefreshToken(response.data.refreshToken);
    }

    return response;
  }

  async getSession(): Promise<ApiResponse<SessionResponse>> {
    return this.request<SessionResponse>('/api/v1/auth/session');
  }

  async completeOnboarding(): Promise<ApiResponse<{ message: string; onboardingComplete: boolean }>> {
    return this.request<{ message: string; onboardingComplete: boolean }>('/api/v1/auth/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async updateProfile(data: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
  }): Promise<ApiResponse<{ profile: { displayName: string; bio: string; avatarUrl: string }; message: string }>> {
    // Convert camelCase to snake_case for API
    const apiData: Record<string, unknown> = {};
    if (data.displayName !== undefined) apiData.display_name = data.displayName;
    if (data.bio !== undefined) apiData.bio = data.bio;
    if (data.avatarUrl !== undefined) apiData.avatar_url = data.avatarUrl;

    return this.request<{ profile: { displayName: string; bio: string; avatarUrl: string }; message: string }>('/api/v1/users/@me', {
      method: 'PUT',
      body: JSON.stringify(apiData),
    });
  }

  async verifyMfa(sessionId: string, code: string): Promise<ApiResponse<LoginResponse>> {
    const response = await this.request<LoginResponse>('/api/v1/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ sessionId, code }),
    });

    if (response.success && response.data?.accessToken) {
      this.setAccessToken(response.data.accessToken);
      if (response.data.refreshToken) {
        setStoredRefreshToken(response.data.refreshToken);
      }
    }

    return response;
  }

  async regenerateBackupCodes(): Promise<ApiResponse<{ backupCodes: string[] }>> {
    return this.request<{ backupCodes: string[] }>('/api/v1/auth/mfa/backup-codes', {
      method: 'POST',
    });
  }

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  async resendVerification(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/v1/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Generic HTTP methods
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // User endpoints
  async getCurrentUser(): Promise<ApiResponse<SessionResponse>> {
    return this.request<SessionResponse>('/api/v1/auth/session');
  }

  // Server endpoints
  async getServers(): Promise<ApiResponse<{ servers: ServerResponse[] }>> {
    return this.request<{ servers: ServerResponse[] }>('/api/v1/servers');
  }

  async getServer(serverId: string): Promise<ApiResponse<ServerResponse>> {
    return this.request<ServerResponse>(`/api/v1/servers/${serverId}`);
  }

  async createServer(data: { name: string; description?: string; iconUrl?: string }): Promise<ApiResponse<ServerResponse>> {
    return this.request<ServerResponse>('/api/v1/servers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateServer(serverId: string, data: Partial<{ name: string; description: string; iconUrl: string | null; bannerUrl: string | null }>): Promise<ApiResponse<ServerResponse>> {
    return this.request<ServerResponse>(`/api/v1/servers/${serverId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteServer(serverId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/v1/servers/${serverId}`, {
      method: 'DELETE',
    });
  }

  async joinServer(inviteCode: string): Promise<ApiResponse<{ server: ServerResponse; member: MemberResponse }>> {
    return this.request<{ server: ServerResponse; member: MemberResponse }>('/api/v1/servers/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    });
  }

  async previewInvite(code: string): Promise<ApiResponse<{
    invite: { code: string; expiresAt: string | null; maxUses: number | null; uses: number };
    server: { id: string; name: string; icon_url: string | null; member_count: number } | null;
    channel: { id: string; name: string; type: string } | null;
    inviter: { id: string; username: string; avatar: string | null } | null;
  }>> {
    return this.request(`/api/v1/servers/invite/${code}/preview`);
  }

  async leaveServer(serverId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/v1/servers/${serverId}/leave`, {
      method: 'POST',
    });
  }

  async updateServerPositions(positions: { id: string; position: number }[]): Promise<ApiResponse<{ servers: ServerResponse[] }>> {
    return this.request<{ servers: ServerResponse[] }>('/api/v1/servers/positions', {
      method: 'PATCH',
      body: JSON.stringify({ positions }),
    });
  }

  // Server members
  async getServerMembers(serverId: string): Promise<ApiResponse<{ members: MemberResponse[] }>> {
    return this.request<{ members: MemberResponse[] }>(`/api/v1/servers/${serverId}/members`);
  }

  async kickMember(serverId: string, userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/v1/servers/${serverId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  // Server invites
  async getInvites(serverId: string): Promise<ApiResponse<{ invites: InviteResponse[] }>> {
    return this.request<{ invites: InviteResponse[] }>(`/api/v1/servers/${serverId}/invites`);
  }

  async createInvite(serverId: string, data?: { maxUses?: number; expiresAt?: string }): Promise<ApiResponse<InviteResponse>> {
    return this.request<InviteResponse>(`/api/v1/servers/${serverId}/invites`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async deleteInvite(serverId: string, inviteId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/v1/servers/${serverId}/invites/${inviteId}`, {
      method: 'DELETE',
    });
  }

  // Channel endpoints
  async getChannels(serverId: string): Promise<ApiResponse<{ channels: ChannelResponse[]; categories: CategoryResponse[] }>> {
    return this.request<{ channels: ChannelResponse[]; categories: CategoryResponse[] }>(`/api/v1/servers/${serverId}/channels`);
  }

  async getChannel(serverId: string, channelId: string): Promise<ApiResponse<ChannelResponse>> {
    return this.request<ChannelResponse>(`/api/v1/servers/${serverId}/channels/${channelId}`);
  }

  async createChannel(serverId: string, data: {
    name: string;
    type: string;
    categoryId?: string;
    topic?: string;
    nsfw?: boolean;
    rateLimitPerUser?: number;
    bitrate?: number;
    userLimit?: number;
  }): Promise<ApiResponse<ChannelResponse>> {
    return this.request<ChannelResponse>(`/api/v1/servers/${serverId}/channels`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateChannel(serverId: string, channelId: string, data: Partial<{
    name: string;
    topic: string;
    position: number;
    nsfw: boolean;
    rateLimitPerUser: number;
    bitrate: number;
    userLimit: number;
  }>): Promise<ApiResponse<ChannelResponse>> {
    return this.request<ChannelResponse>(`/api/v1/servers/${serverId}/channels/${channelId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteChannel(serverId: string, channelId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/v1/servers/${serverId}/channels/${channelId}`, {
      method: 'DELETE',
    });
  }

  async updateChannelPositions(serverId: string, positions: { id: string; position: number; categoryId?: string | null }[]): Promise<ApiResponse<{ channels: ChannelResponse[] }>> {
    return this.request<{ channels: ChannelResponse[] }>(`/api/v1/servers/${serverId}/channels/positions`, {
      method: 'PATCH',
      body: JSON.stringify({ positions }),
    });
  }

  // Category endpoints
  async createCategory(serverId: string, data: { name: string; position?: number }): Promise<ApiResponse<CategoryResponse>> {
    return this.request<CategoryResponse>(`/api/v1/servers/${serverId}/categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(serverId: string, categoryId: string, data: Partial<{ name: string; position: number }>): Promise<ApiResponse<CategoryResponse>> {
    return this.request<CategoryResponse>(`/api/v1/servers/${serverId}/categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(serverId: string, categoryId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/v1/servers/${serverId}/categories/${categoryId}`, {
      method: 'DELETE',
    });
  }

  // Message endpoints
  async getMessages(params: { channelId?: string; before?: string; after?: string; limit?: number }): Promise<ApiResponse<MessageResponse[] | { messages: MessageResponse[]; hasMore: boolean }>> {
    const searchParams = new URLSearchParams();
    if (params.channelId) searchParams.set('channelId', params.channelId);
    if (params.before) searchParams.set('before', params.before);
    if (params.after) searchParams.set('after', params.after);
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request<MessageResponse[] | { messages: MessageResponse[]; hasMore: boolean }>(`/api/v1/messages${query ? `?${query}` : ''}`);
  }

  async getMessage(messageId: string): Promise<ApiResponse<MessageResponse>> {
    return this.request<MessageResponse>(`/api/v1/messages/${messageId}`);
  }

  async createMessage(data: { content: string; channelId: string }): Promise<ApiResponse<MessageResponse>> {
    return this.request<MessageResponse>('/api/v1/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMessage(messageId: string, content: string): Promise<ApiResponse<MessageResponse>> {
    return this.request<MessageResponse>(`/api/v1/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  }

  async deleteMessage(messageId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/v1/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  async pinMessage(messageId: string): Promise<ApiResponse<MessageResponse>> {
    return this.request<MessageResponse>(`/api/v1/messages/${messageId}/pin`, {
      method: 'POST',
    });
  }

  async unpinMessage(messageId: string): Promise<ApiResponse<MessageResponse>> {
    return this.request<MessageResponse>(`/api/v1/messages/${messageId}/pin`, {
      method: 'DELETE',
    });
  }

  // Reaction endpoints
  /**
   * Format emoji for API URL
   * Backend expects format: "unicode:😀" or "custom:123456789012345678"
   */
  private formatEmoji(emoji: string): string {
    // Custom emojis are 20-digit snowflake IDs
    const isUnicode = !/^\d{20}$/.test(emoji);
    return isUnicode ? `unicode:${emoji}` : `custom:${emoji}`;
  }

  async addReaction(messageId: string, emoji: string): Promise<ApiResponse<{ count: number }>> {
    const formattedEmoji = this.formatEmoji(emoji);
    return this.request<{ count: number }>(`/api/v1/messages/${messageId}/reactions/${encodeURIComponent(formattedEmoji)}`, {
      method: 'PUT',
    });
  }

  async removeReaction(messageId: string, emoji: string): Promise<ApiResponse<void>> {
    const formattedEmoji = this.formatEmoji(emoji);
    return this.request<void>(`/api/v1/messages/${messageId}/reactions/${encodeURIComponent(formattedEmoji)}/@me`, {
      method: 'DELETE',
    });
  }

  async getReactionUsers(messageId: string, emoji: string): Promise<ApiResponse<{ users: { id: string; username: string }[] }>> {
    const formattedEmoji = this.formatEmoji(emoji);
    return this.request<{ users: { id: string; username: string }[] }>(`/api/v1/messages/${messageId}/reactions/${encodeURIComponent(formattedEmoji)}`);
  }

  // DM Channel endpoints
  async getDMChannels(limit = 50, offset = 0): Promise<ApiResponse<{ dmChannels: DMChannelResponse[]; total: number }>> {
    return this.request<{ dmChannels: DMChannelResponse[]; total: number }>(`/api/v1/users/@me/channels?limit=${limit}&offset=${offset}`);
  }

  async createDM(recipientId: string): Promise<ApiResponse<DMChannelResponse>> {
    return this.request<DMChannelResponse>('/api/v1/users/@me/channels', {
      method: 'POST',
      body: JSON.stringify({ recipient_id: recipientId }),
    });
  }

  async createGroupDM(recipients: string[], name?: string, iconUrl?: string): Promise<ApiResponse<DMChannelResponse>> {
    return this.request<DMChannelResponse>('/api/v1/users/@me/channels', {
      method: 'POST',
      body: JSON.stringify({ recipients, name, icon_url: iconUrl }),
    });
  }

  async getDMChannel(channelId: string): Promise<ApiResponse<DMChannelResponse>> {
    return this.request<DMChannelResponse>(`/api/v1/channels/${channelId}`);
  }

  async updateGroupDM(channelId: string, data: { name?: string; iconUrl?: string | null }): Promise<ApiResponse<DMChannelResponse>> {
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.iconUrl !== undefined) body.icon_url = data.iconUrl;

    return this.request<DMChannelResponse>(`/api/v1/channels/${channelId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async leaveDM(channelId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/v1/channels/${channelId}`, {
      method: 'DELETE',
    });
  }

  async addDMParticipant(channelId: string, userId: string): Promise<ApiResponse<DMChannelResponse>> {
    return this.request<DMChannelResponse>(`/api/v1/channels/${channelId}/recipients/${userId}`, {
      method: 'PUT',
    });
  }

  async removeDMParticipant(channelId: string, userId: string): Promise<ApiResponse<DMChannelResponse>> {
    return this.request<DMChannelResponse>(`/api/v1/channels/${channelId}/recipients/${userId}`, {
      method: 'DELETE',
    });
  }

  async getDMMessages(channelId: string, params?: { before?: string; after?: string; limit?: number }): Promise<ApiResponse<{ messages: MessageResponse[]; hasMore: boolean }>> {
    const searchParams = new URLSearchParams();
    if (params?.before) searchParams.set('before', params.before);
    if (params?.after) searchParams.set('after', params.after);
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request<{ messages: MessageResponse[]; hasMore: boolean }>(`/api/v1/channels/${channelId}/messages${query ? `?${query}` : ''}`);
  }

  async createDMMessage(channelId: string, content: string): Promise<ApiResponse<MessageResponse>> {
    return this.request<MessageResponse>(`/api/v1/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // DM Notification Settings
  async getDMNotificationSettings(channelId: string): Promise<ApiResponse<{ isMuted: boolean; muteUntil: string | null; notificationLevel: string }>> {
    return this.request<{ isMuted: boolean; muteUntil: string | null; notificationLevel: string }>(
      `/api/v1/channels/${channelId}/notification-settings`
    );
  }

  async updateDMNotificationSettings(channelId: string, data: { isMuted?: boolean; notificationLevel?: string }): Promise<ApiResponse<{ isMuted: boolean; notificationLevel: string }>> {
    return this.request<{ isMuted: boolean; notificationLevel: string }>(
      `/api/v1/channels/${channelId}/notification-settings`,
      {
        method: 'PUT',
        body: JSON.stringify({ is_muted: data.isMuted, notification_level: data.notificationLevel }),
      }
    );
  }

  async muteDM(channelId: string, duration?: number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(
      `/api/v1/channels/${channelId}/mute`,
      {
        method: 'POST',
        body: JSON.stringify({ duration }),
      }
    );
  }

  async unmuteDM(channelId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(
      `/api/v1/channels/${channelId}/mute`,
      { method: 'DELETE' }
    );
  }

  // Search endpoints
  async searchUsers(query: string): Promise<ApiResponse<{ users: { id: string; username: string; displayName?: string; avatar?: string }[] }>> {
    return this.request<{ users: { id: string; username: string; displayName?: string; avatar?: string }[] }>('/api/v1/search/users', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  // Role endpoints
  async getRoles(serverId: string): Promise<ApiResponse<{ roles: { id: string; name: string; color: number; position: number; permissions: string; hoist: boolean; mentionable: boolean }[] }>> {
    return this.request<{ roles: { id: string; name: string; color: number; position: number; permissions: string; hoist: boolean; mentionable: boolean }[] }>(`/api/v1/servers/${serverId}/roles`);
  }

  async createRole(serverId: string, data: { name: string; permissions?: string; color?: number; hoist?: boolean; mentionable?: boolean }): Promise<ApiResponse<unknown>> {
    return this.request<unknown>(`/api/v1/servers/${serverId}/roles`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRole(serverId: string, roleId: string, data: { name?: string; permissions?: string; color?: number; hoist?: boolean; mentionable?: boolean }): Promise<ApiResponse<unknown>> {
    return this.request<unknown>(`/api/v1/servers/${serverId}/roles/${roleId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteRole(serverId: string, roleId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/v1/servers/${serverId}/roles/${roleId}`, {
      method: 'DELETE',
    });
  }

  // Ban endpoints
  async getBans(serverId: string): Promise<ApiResponse<{ bans: { userId: string; reason?: string; bannedAt: string; bannedBy: string }[] }>> {
    return this.request<{ bans: { userId: string; reason?: string; bannedAt: string; bannedBy: string }[] }>(`/api/v1/servers/${serverId}/bans`);
  }

  async banMember(serverId: string, userId: string, reason?: string): Promise<ApiResponse<unknown>> {
    return this.request<unknown>(`/api/v1/servers/${serverId}/bans/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async unbanMember(serverId: string, userId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/v1/servers/${serverId}/bans/${userId}`, {
      method: 'DELETE',
    });
  }

  // Member roles
  async setMemberRoles(serverId: string, userId: string, roleIds: string[]): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/v1/servers/${serverId}/members/${userId}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ roleIds }),
    });
  }

  // Voice endpoints
  async joinVoiceChannel(channelId: string): Promise<ApiResponse<{ sessionId: string; voiceState: unknown }>> {
    return this.request<{ sessionId: string; voiceState: unknown }>(`/api/v1/voice/channels/${channelId}/join`, {
      method: 'POST',
    });
  }

  async leaveVoiceChannel(channelId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/v1/voice/channels/${channelId}/leave`, {
      method: 'POST',
    });
  }

  async getVoiceChannelUsers(channelId: string): Promise<ApiResponse<{ users: unknown[] }>> {
    return this.request<{ users: unknown[] }>(`/api/v1/voice/channels/${channelId}`);
  }

  async updateVoiceState(sessionId: string, data: { selfMute?: boolean; selfDeaf?: boolean; selfVideo?: boolean; selfStream?: boolean }): Promise<ApiResponse<unknown>> {
    return this.request<unknown>(`/api/v1/voice/sessions/${sessionId}/state`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getChannelStreams(channelId: string): Promise<ApiResponse<{ streams: unknown[] }>> {
    return this.request<{ streams: unknown[] }>(`/api/v1/voice/channels/${channelId}/streams`);
  }

  // User endpoints
  async getUser(userId: string): Promise<ApiResponse<unknown>> {
    return this.request<unknown>(`/api/v1/users/${userId}`);
  }

  async updateUserProfile(data: { displayName?: string; aboutMe?: string; avatar?: string; banner?: string }): Promise<ApiResponse<unknown>> {
    return this.request<unknown>('/api/v1/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return this.request<void>('/api/v1/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Search endpoints
  async search(params: { query: string; type?: string; limit?: number }): Promise<ApiResponse<{ messages?: unknown[]; users?: unknown[]; servers?: unknown[] }>> {
    const searchParams = new URLSearchParams();
    searchParams.set('query', params.query);
    if (params.type) searchParams.set('type', params.type);
    if (params.limit) searchParams.set('limit', params.limit.toString());

    return this.request<{ messages?: unknown[]; users?: unknown[]; servers?: unknown[] }>(`/api/v1/search?${searchParams.toString()}`);
  }

  // Discovery endpoints
  async discoverServers(params?: { category?: string; query?: string; limit?: number; offset?: number }): Promise<ApiResponse<{ servers: unknown[]; total: number }>> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.query) searchParams.set('query', params.query);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    return this.request<{ servers: unknown[]; total: number }>(`/api/v1/discover/servers${query ? `?${query}` : ''}`);
  }

  // Friend endpoints
  async sendFriendRequest(targetUserId: string): Promise<ApiResponse<{ message: string; connection: unknown }>> {
    return this.request<{ message: string; connection: unknown }>('/api/v1/friends/request', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  }

  async acceptFriendRequest(requesterId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/v1/friends/accept', {
      method: 'POST',
      body: JSON.stringify({ requesterId }),
    });
  }

  async rejectFriendRequest(requesterId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/v1/friends/reject', {
      method: 'POST',
      body: JSON.stringify({ requesterId }),
    });
  }

  async cancelFriendRequest(targetUserId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/v1/friends/cancel', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  }

  async removeFriend(friendId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/v1/friends/${friendId}`, {
      method: 'DELETE',
    });
  }

  async blockUser(targetUserId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/v1/friends/block', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  }

  async unblockUser(targetUserId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/v1/friends/block/${targetUserId}`, {
      method: 'DELETE',
    });
  }

  async getFriends(): Promise<ApiResponse<{ friends: { id: string; username: string; displayName: string | null; avatarUrl: string | null; customStatus: string | null; friendSince: string }[] }>> {
    return this.request<{ friends: { id: string; username: string; displayName: string | null; avatarUrl: string | null; customStatus: string | null; friendSince: string }[] }>('/api/v1/friends');
  }

  async getPendingFriendRequests(): Promise<ApiResponse<{ incoming: { id: string; userId: string; username: string; displayName: string | null; avatarUrl: string | null; requestedAt: string }[]; outgoing: { id: string; userId: string; username: string; displayName: string | null; avatarUrl: string | null; requestedAt: string }[] }>> {
    return this.request<{ incoming: { id: string; userId: string; username: string; displayName: string | null; avatarUrl: string | null; requestedAt: string }[]; outgoing: { id: string; userId: string; username: string; displayName: string | null; avatarUrl: string | null; requestedAt: string }[] }>('/api/v1/friends/pending');
  }

  async getBlockedUsers(): Promise<ApiResponse<{ blocked: { id: string; username: string; displayName: string | null; avatarUrl: string | null }[] }>> {
    return this.request<{ blocked: { id: string; username: string; displayName: string | null; avatarUrl: string | null }[] }>('/api/v1/friends/blocked');
  }

  async searchFriendUsers(query: string): Promise<ApiResponse<{ results: { id: string; username: string; displayName: string | null; avatarUrl: string | null; isFriend: boolean; hasPendingRequest: boolean; isBlocked: boolean }[] }>> {
    return this.request<{ results: { id: string; username: string; displayName: string | null; avatarUrl: string | null; isFriend: boolean; hasPendingRequest: boolean; isBlocked: boolean }[] }>(`/api/v1/friends/search?q=${encodeURIComponent(query)}`);
  }

  async searchWithinFriends(query: string): Promise<ApiResponse<{ friends: { id: string; username: string; displayName: string | null; avatarUrl: string | null; customStatus: string | null; friendSince: string }[] }>> {
    return this.request<{ friends: { id: string; username: string; displayName: string | null; avatarUrl: string | null; customStatus: string | null; friendSince: string }[] }>(`/api/v1/friends/search-list?q=${encodeURIComponent(query)}`);
  }

  async getFriendshipStatus(targetUserId: string): Promise<ApiResponse<{ isFriend: boolean; hasIncomingRequest: boolean; hasOutgoingRequest: boolean; isBlocked: boolean }>> {
    return this.request<{ isFriend: boolean; hasIncomingRequest: boolean; hasOutgoingRequest: boolean; isBlocked: boolean }>(`/api/v1/friends/status/${targetUserId}`);
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_URL);

// Export class for testing
export { ApiClient };
