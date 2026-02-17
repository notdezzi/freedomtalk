"use client";

import React from "react";
import Link from "next/link";
import { useDMStore } from "@/stores/dm.store";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";
import { MessageSquare, Users } from "lucide-react";

export default function DMListPage() {
  const { channels } = useDMStore();

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="h-12 px-4 flex items-center border-b border-[var(--border-default)] shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[var(--brand-primary)] flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white">Friends</span>
        </div>
        <div className="flex-1" />
      </div>

      {/* Content */}
      <div className="flex-1 flex">
        {/* Sidebar tabs */}
        <div className="w-60 p-2 border-r border-[var(--border-default)]">
          <div className="space-y-0.5">
            <Link
              href="/dm"
              className={cn(
                "flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer",
                "bg-[var(--bg-modifier-selected)] text-white"
              )}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-sm">Direct Messages</span>
            </Link>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center">
          {channels.length === 0 ? (
            <div className="text-center max-w-md px-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-[var(--text-muted)]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                No Direct Messages yet
              </h2>
              <p className="text-[var(--text-muted)] mb-6">
                Send a message to a friend to start a conversation. You can also click the "+" button in the sidebar to create a new DM.
              </p>
            </div>
          ) : (
            <div className="w-full max-w-2xl p-4">
              <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase mb-2">
                Direct Messages
              </h3>
              <div className="space-y-1">
                {channels.map((channel) => (
                  <Link
                    key={channel.id}
                    href={`/dm/${channel.id}`}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg cursor-pointer",
                      "hover:bg-[var(--bg-modifier-hover)] transition-colors"
                    )}
                  >
                    <Avatar
                      src={channel.type === "dm" ? channel.recipients[0]?.avatar : channel.icon}
                      alt={channel.type === "dm" ? channel.recipients[0]?.username : channel.name || "Group"}
                      size="md"
                      status={channel.type === "dm" ? "online" : undefined}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {channel.type === "dm"
                          ? channel.recipients[0]?.username
                          : channel.name}
                      </div>
                      {channel.lastMessageId && (
                        <div className="text-xs text-[var(--text-muted)] truncate">
                          Click to continue conversation
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
