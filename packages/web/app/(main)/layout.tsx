"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Plus, Compass, Download, Settings, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";
import { useDMStore } from "@/stores/dm.store";
import { useWebSocket } from "@/hooks";
import { Avatar, Spinner } from "@/components/ui";
import { CreateDMModal } from "@/components/chat";
import api from "@/lib/api";
import type { DMChannel } from "@/types";
import { cn } from "@/lib/utils";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, fetchUser, logout } = useAuthStore();
  const { channels, setChannels, activeChannelId } = useDMStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCreateDM, setShowCreateDM] = useState(false);

  // Add app-layout class to body for overflow hidden
  useEffect(() => {
    document.body.classList.add("app-layout");
    return () => {
      document.body.classList.remove("app-layout");
    };
  }, []);

  // Initialize WebSocket
  useWebSocket({
    onConnect: () => {
      console.log("WebSocket connected");
    },
    onDisconnect: () => {
      console.log("WebSocket disconnected");
    },
  });

  // Check auth status on mount - always verify tokens on page load/refresh
  useEffect(() => {
    // Always call fetchUser to verify stored tokens are still valid
    // fetchUser handles the case where tokens don't exist
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  // Redirect to login if not authenticated (after fetch attempt completes)
  useEffect(() => {
    // Only redirect after we've finished loading and confirmed not authenticated
    if (!isAuthenticated && !isLoading) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch DM channels
  useEffect(() => {
    if (isAuthenticated) {
      api.get<DMChannel[]>("/users/@me/channels")
        .then((channels) => {
          if (Array.isArray(channels)) {
            setChannels(channels);
          }
        })
        .catch(console.error);
    }
  }, [isAuthenticated, setChannels]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-normal)]">
      {/* Server list sidebar */}
      <div className="w-[72px] bg-[var(--bg-tertiary)] flex flex-col items-center py-3 gap-2 overflow-y-auto scrollbar-thin">
        {/* Home button */}
        <Link
          href="/dm"
          className={cn(
            "w-12 h-12 rounded-[24px] flex items-center justify-center transition-all duration-200",
            "bg-[var(--brand-primary)] text-white",
            "hover:rounded-[16px]"
          )}
        >
          <MessageSquare className="w-6 h-6" />
        </Link>

        <div className="w-8 h-[2px] bg-[var(--bg-secondary-alt)] rounded-full my-1" />

        {/* Add server button */}
        <button
          className={cn(
            "w-12 h-12 rounded-[24px] flex items-center justify-center transition-all duration-200",
            "bg-[var(--bg-primary)] text-[var(--status-green)]",
            "hover:rounded-[16px] hover:bg-[var(--status-green)] hover:text-white"
          )}
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Explore button */}
        <button
          className={cn(
            "w-12 h-12 rounded-[24px] flex items-center justify-center transition-all duration-200",
            "bg-[var(--bg-primary)] text-[var(--status-green)]",
            "hover:rounded-[16px] hover:bg-[var(--status-green)] hover:text-white"
          )}
        >
          <Compass className="w-6 h-6" />
        </button>
      </div>

      {/* Channel sidebar */}
      <div className="w-60 bg-[var(--bg-secondary)] flex flex-col">
        {/* Header */}
        <div className="h-12 px-4 flex items-center border-b border-[var(--border-default)] shadow-sm">
          <span className="font-semibold text-white truncate">
            Direct Messages
          </span>
        </div>

        {/* Search/Add DM */}
        <div className="p-2">
          <button
            onClick={() => setShowCreateDM(true)}
            className={cn(
              "w-full h-9 px-2 flex items-center gap-2 rounded",
              "bg-[var(--bg-tertiary)] text-[var(--text-muted)]",
              "hover:text-[var(--text-normal)] transition-colors"
            )}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Find or start a conversation</span>
          </button>
        </div>

        {/* DM List */}
        <div className="flex-1 overflow-y-auto px-2 scrollbar-thin">
          {(channels || []).map((channel) => (
            <Link
              key={channel.id}
              href={`/dm/${channel.id}`}
              className={cn(
                "flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer",
                "hover:bg-[var(--bg-modifier-hover)] transition-colors",
                activeChannelId === channel.id && "bg-[var(--bg-modifier-selected)]"
              )}
            >
              <Avatar
                src={channel.type === "dm" ? channel.recipients[0]?.avatar : channel.icon}
                alt={channel.type === "dm" ? channel.recipients[0]?.username : channel.name || "Group"}
                size="sm"
                status={channel.type === "dm" ? "online" : undefined}
              />
              <span className={cn(
                "text-sm truncate",
                activeChannelId === channel.id ? "text-white" : "text-[var(--channel-text)]"
              )}>
                {channel.type === "dm"
                  ? channel.recipients[0]?.username
                  : channel.name}
              </span>
            </Link>
          ))}

          {channels.length === 0 && (
            <div className="text-center py-8 text-[var(--text-muted)] text-sm">
              No direct messages yet
            </div>
          )}
        </div>

        {/* User panel */}
        <div className="h-[52px] bg-[var(--bg-tertiary)] px-2 flex items-center gap-2 relative">
          <div
            className="flex items-center gap-2 flex-1 rounded px-1 py-1 hover:bg-[var(--bg-modifier-hover)] cursor-pointer"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <Avatar src={user.avatar} alt={user.username} size="sm" status="online" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {user.username}
              </div>
              <div className="text-xs text-[var(--text-muted)] truncate">
                Online
              </div>
            </div>
          </div>

          {/* User menu dropdown */}
          {showUserMenu && (
            <div className="absolute bottom-full left-2 right-2 mb-2 bg-[var(--surface-floating)] rounded-lg shadow-lg p-1 border border-[var(--border-default)]">
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  // TODO: Open settings
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-[var(--text-normal)] hover:bg-[var(--bg-modifier-hover)]"
              >
                <Settings className="w-4 h-4" />
                User Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-[var(--text-danger)] hover:bg-[var(--bg-modifier-hover)]"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>

      {/* Create DM Modal */}
      <CreateDMModal
        isOpen={showCreateDM}
        onClose={() => setShowCreateDM(false)}
      />
    </div>
  );
}
