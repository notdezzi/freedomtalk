/**
 * Users Service
 * User CRUD Operations
 * FreedomTalk Backend - Discord Clone
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { User } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateUserData {
  email: string;
  username: string;
  password: string;
  avatar_url?: string;
}

export interface UpdateUserData {
  username?: string;
  avatar_url?: string;
  status?: 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE';
  custom_status?: string;
}

export interface UserFilter {
  email?: string;
  username?: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(data: CreateUserData): Promise<User> {
  const { email, username, password, avatar_url } = data;

  // Check if email exists
  const existingEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (existingEmail) {
    throw new Error('EMAIL_EXISTS');
  }

  // Check if username exists
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUsername) {
    throw new Error('USERNAME_EXISTS');
  }

  // Hash password
  const password_hash = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      username,
      password_hash,
      avatar_url: avatar_url || null,
      status: 'ONLINE',
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  return user;
}

export async function getUserById(id: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { id },
  });
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { email },
  });
}

export async function getUserByUsername(username: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { username },
  });
}

export async function updateUser(
  id: string,
  data: UpdateUserData
): Promise<User> {
  return await prisma.user.update({
    where: { id },
    data: {
      ...data,
      updated_at: new Date(),
    },
  });
}

export async function updateUserStatus(
  id: string,
  status: 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE'
): Promise<User> {
  return await prisma.user.update({
    where: { id },
    data: {
      status,
      updated_at: new Date(),
    },
  });
}

export async function updateUserAvatar(id: string, avatar_url: string): Promise<User> {
  return await prisma.user.update({
    where: { id },
    data: {
      avatar_url,
      updated_at: new Date(),
    },
  });
}

export async function deleteUser(id: string): Promise<User> {
  return await prisma.user.delete({
    where: { id },
  });
}

export async function getUsersByFilter(filter: UserFilter): Promise<User[]> {
  const { email, username } = filter;

  return await prisma.user.findMany({
    where: {
      ...(email && { email: { contains: email, mode: 'insensitive' } }),
      ...(username && { username: { contains: username, mode: 'insensitive' } }),
    },
    take: 50,
    orderBy: {
      created_at: 'desc',
    },
  });
}

export async function countUsers(): Promise<number> {
  return await prisma.user.count();
}
