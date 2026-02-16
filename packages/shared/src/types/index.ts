/**
 * Shared TypeScript types and interfaces
 */

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Message types
export interface Message {
  id: string;
  content: string;
  authorId: string;
  channelId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Channel types
export interface Channel {
  id: string;
  name: string;
  serverId: string;
  type: 'text' | 'voice';
  createdAt: Date;
  updatedAt: Date;
}

// Server types
export interface Server {
  id: string;
  name: string;
  ownerId: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

