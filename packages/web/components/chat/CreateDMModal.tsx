"use client";

import React, { useState } from "react";
import { X, Search, User } from "lucide-react";
import { Modal, Avatar, Button, Input } from "@/components/ui";
import api from "@/lib/api";
import type { User as UserType, DMChannel } from "@/types";
import { useDMStore } from "@/stores/dm.store";
import { useRouter } from "next/navigation";

interface CreateDMModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateDMModal({ isOpen, onClose }: CreateDMModalProps) {
  const router = useRouter();
  const { addChannel, setActiveChannel } = useDMStore();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserType[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserType[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSearch = async (query: string) => {
    setSearch(query);
    if (query.length < 2) {
      setUsers([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await api.get<UserType[]>(`/users/search?q=${encodeURIComponent(query)}`);
      setUsers(results);
    } catch (error) {
      console.error("Search failed:", error);
      setUsers([]);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleUser = (user: UserType) => {
    setSelectedUsers((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;

    setIsCreating(true);
    try {
      const channel = await api.post<DMChannel>("/users/@me/channels", {
        recipients: selectedUsers.map((u) => u.id),
      });
      addChannel(channel);
      setActiveChannel(channel.id);
      router.push(`/dm/${channel.id}`);
      onClose();
    } catch (error) {
      console.error("Failed to create DM:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Direct Messages" size="md">
      <div className="space-y-4">
        {/* Search input */}
        <div className="relative">
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Type a username"
            icon={<Search className="w-5 h-5" />}
          />
        </div>

        {/* Selected users */}
        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-1 px-2 py-1 bg-[var(--brand-primary)] rounded text-white text-sm"
              >
                <span>{user.username}</span>
                <button
                  onClick={() => toggleUser(user)}
                  className="hover:text-[var(--text-muted)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search results */}
        <div className="max-h-[200px] overflow-y-auto">
          {isSearching ? (
            <div className="text-center py-4 text-[var(--text-muted)]">
              Searching...
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-1">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user)}
                  className={`w-full flex items-center gap-3 p-2 rounded transition-colors ${
                    selectedUsers.find((u) => u.id === user.id)
                      ? "bg-[var(--brand-primary)]/20"
                      : "hover:bg-[var(--bg-modifier-hover)]"
                  }`}
                >
                  <Avatar src={user.avatar} alt={user.username} size="sm" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-white">
                      {user.username}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : search.length >= 2 ? (
            <div className="text-center py-4 text-[var(--text-muted)]">
              No users found
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-default)]">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={selectedUsers.length === 0 || isCreating}
            loading={isCreating}
          >
            Create DM
          </Button>
        </div>
      </div>
    </Modal>
  );
}
