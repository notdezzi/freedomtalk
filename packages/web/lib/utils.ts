/**
 * Utility functions for the web application
 */
import { clsx, type ClassValue } from "clsx";

/**
 * Combines class names conditionally using clsx
 * @param inputs - Class values to combine
 * @returns Combined class string
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format relative time (e.g., "5m ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return then.toLocaleDateString();
}

/**
 * Format time (e.g., "3:45 PM")
 * @param short - If true, returns only hour without minutes (e.g., "3 PM")
 */
export function formatTime(date: Date | string, short = false): string {
  const then = typeof date === "string" ? new Date(date) : date;
  if (short) {
    return then.toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true,
    });
  }
  return then.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format date (e.g., "Feb 17, 2026")
 */
export function formatDate(date: Date | string): string {
  const then = typeof date === "string" ? new Date(date) : date;
  return then.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Generate a snowflake ID (for client-side use only)
 */
export function generateSnowflake(): string {
  const timestamp = Date.now() - 1420070400000;
  const workerId = Math.floor(Math.random() * 32);
  const processId = Math.floor(Math.random() * 32);
  const sequence = Math.floor(Math.random() * 4096);

  return ((timestamp << 22) | (workerId << 17) | (processId << 12) | sequence).toString();
}
