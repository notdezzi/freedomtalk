"use client";

import React from "react";
import { MessageSquareDashed, UserPlus } from "lucide-react";
import { useDMStore } from "@/stores/dm.store";
import { Avatar, Button } from "@/components/ui";

export default function DMListPage() {
  const { channels } = useDMStore();

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-primary)] p-8">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
          <MessageSquareDashed className="w-10 h-10 text-[var(--text-muted)]" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          Your Messages
        </h1>
        <p className="text-[var(--text-muted)] mb-6">
          Send direct messages to friends, create group DMs, and stay connected.
        </p>

        <div className="flex flex-col gap-3">
          <Button className="w-full">
            <UserPlus className="w-4 h-4 mr-2" />
            Create DM
          </Button>
        </div>

        {channels.length > 0 && (
          <p className="mt-6 text-sm text-[var(--text-muted)]">
            Select a conversation from the sidebar to start chatting
          </p>
        )}
      </div>
    </div>
  );
}
