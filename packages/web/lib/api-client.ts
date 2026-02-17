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
  serverId: string;
  createdBy: string;
  maxUses: number;
  uses: number;
  expiresAt?: string;
  createdAt: string;
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

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add authorization header if we have a token
    const accessToken = getStoredAccessToken();
    if (accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Include cookies for refresh tokens
      });

      const data = await response.json();

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

  async updateServer(serverId: string, data: Partial<{ name: string; description: string; icon: string; banner: string }>): Promise<ApiResponse<ServerResponse>> {
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

  async joinServer(inviteCode: string): Promise<ApiResponse<ServerResponse>> {
    return this.request<ServerResponse>(`/api/v1/servers/join/${inviteCode}`, {
      method: 'POST',
    });
  }

  async leaveServer(serverId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/v1/servers/${serverId}/leave`, {
      method: 'POST',
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

  async createChannel(serverId: string, data: { name: string; type: string; categoryId?: string; topic?: string }): Promise<ApiResponse<ChannelResponse>> {
    return this.request<ChannelResponse>(`/api/v1/servers/${serverId}/channels`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateChannel(serverId: string, channelId: string, data: Partial<{ name: string; topic: string; position: number }>): Promise<ApiResponse<ChannelResponse>> {
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
  async addReaction(messageId: string, emoji: string): Promise<ApiResponse<{ count: number }>> {
    return this.request<{ count: number }>(`/api/v1/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
      method: 'PUT',
    });
  }

  async removeReaction(messageId: string, emoji: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/v1/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`, {
      method: 'DELETE',
    });
  }

  async getReactionUsers(messageId: string, emoji: string): Promise<ApiResponse<{ users: { id: string; username: string }[] }>> {
    return this.request<{ users: { id: string; username: string }[] }>(`/api/v1/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_URL);

// Export class for testing
export { ApiClient };
