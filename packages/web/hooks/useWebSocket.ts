"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/auth.store";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface UseWebSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

// Helper to get access token from localStorage
function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("accessToken");
  } catch {
    return null;
  }
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Get access token for WebSocket authentication
    const accessToken = getAccessToken();
    if (!accessToken) {
      console.warn("[WebSocket] No access token available");
      return;
    }

    // Initialize socket connection with auth token
    socketRef.current = io(WS_URL, {
      path: "/socket.io",
      auth: {
        token: accessToken,
      },
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("[WebSocket] Connected");
      setIsConnected(true);
      options.onConnect?.();
    });

    socket.on("disconnect", (reason) => {
      console.log("[WebSocket] Disconnected:", reason);
      setIsConnected(false);
      options.onDisconnect?.();
    });

    socket.on("connect_error", (error) => {
      console.error("[WebSocket] Connection error:", error);
      options.onError?.(error);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated]);

  const subscribe = useCallback(<T extends unknown[]>(event: string, callback: (...args: T) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback as (...args: unknown[]) => void);
    }
  }, []);

  const unsubscribe = useCallback(<T extends unknown[]>(event: string, callback?: (...args: T) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback as (...args: unknown[]) => void);
    }
  }, []);

  const emit = useCallback((event: string, data: unknown) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    }
  }, [isConnected]);

  const joinRoom = useCallback((room: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("room:join", { room });
    }
  }, [isConnected]);

  const leaveRoom = useCallback((room: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("room:leave", { room });
    }
  }, [isConnected]);

  return {
    socket: socketRef.current,
    isConnected,
    subscribe,
    unsubscribe,
    emit,
    joinRoom,
    leaveRoom,
  };
}

// Singleton socket instance for use outside of React components
let globalSocket: Socket | null = null;

export function getSocket(): Socket | null {
  return globalSocket;
}

export function initSocket(): Socket {
  if (!globalSocket) {
    const accessToken = getAccessToken();
    globalSocket = io(WS_URL, {
      path: "/socket.io",
      auth: accessToken ? { token: accessToken } : undefined,
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return globalSocket;
}

export function disconnectSocket(): void {
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
  }
}
