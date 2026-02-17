"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { io } from "socket.io-client";
import { useAuthStore } from "@/stores/auth.store";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
function getAccessToken() {
    if (typeof window === "undefined")
        return null;
    try {
        return localStorage.getItem("accessToken");
    }
    catch {
        return null;
    }
}
export function useWebSocket(options = {}) {
    const socketRef = useRef(null);
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
        const accessToken = getAccessToken();
        if (!accessToken) {
            console.warn("[WebSocket] No access token available");
            return;
        }
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
    const subscribe = useCallback((event, callback) => {
        if (socketRef.current) {
            socketRef.current.on(event, callback);
        }
    }, []);
    const unsubscribe = useCallback((event, callback) => {
        if (socketRef.current) {
            socketRef.current.off(event, callback);
        }
    }, []);
    const emit = useCallback((event, data) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit(event, data);
        }
    }, [isConnected]);
    const joinRoom = useCallback((room) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit("room:join", { room });
        }
    }, [isConnected]);
    const leaveRoom = useCallback((room) => {
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
let globalSocket = null;
export function getSocket() {
    return globalSocket;
}
export function initSocket() {
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
export function disconnectSocket() {
    if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
    }
}
//# sourceMappingURL=useWebSocket.js.map