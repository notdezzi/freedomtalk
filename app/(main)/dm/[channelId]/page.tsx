"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Hash,
  PlusCircle,
  Gift,
  Sticker,
  Smile,
  Send,
  MoreHorizontal,
  Reply,
  Pencil,
  Trash2,
  AtSign,
  ChevronLeft,
  Phone,
  Video,
  X,
} from "lucide-react";
import { useDMStore } from "@/stores/dm.store";
import { useWebSocket } from "@/hooks";
import { Avatar, Button, Input, Spinner } from "@/components/ui";
import { cn, formatTime } from "@/lib/utils";
import api from "@/lib/api";
import type { DMChannel, Message } from "@/types";

const messageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(4000),
});

type MessageFormData = z.infer<typeof messageSchema>;

export default function DMChannelPage() {
  const params = useParams();
  const router = useRouter();
  const channelId = params.channelId as string;

  const { channels, activeChannelId, setActiveChannel, messages, addMessage, setMessages } = useDMStore();
  const { isConnected, subscribe, unsubscribe, joinRoom, leaveRoom, emit } = useWebSocket();

  const [channel, setChannel] = useState<DMChannel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: "" },
  });

  const messageContent = watch("content");

  // Fetch channel and messages
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const channelData = await api.get<DMChannel>(`/channels/${channelId}`);
        setChannel(channelData);
        setActiveChannel(channelId);

        const messagesData = await api.get<Message[]>(`/channels/${channelId}/messages`);
        setMessages(channelId, messagesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load channel");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      setActiveChannel(null);
    };
  }, [channelId, setActiveChannel, setMessages]);

  // WebSocket room management
  useEffect(() => {
    if (isConnected && channelId) {
      joinRoom(`dm:${channelId}`);

      // Subscribe to message events
      subscribe("message:create", (data: Message) => {
        if (data.dmChannelId === channelId) {
          addMessage(channelId, data);
        }
      });

      return () => {
        leaveRoom(`dm:${channelId}`);
        unsubscribe("message:create");
      };
    }
  }, [isConnected, channelId, joinRoom, leaveRoom, subscribe, unsubscribe, addMessage]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages[channelId]]);

  const onSubmit = async (data: MessageFormData) => {
    if (!channelId) return;

    try {
      // Emit via WebSocket for real-time
      emit("message:create", {
        dmChannelId: channelId,
        content: data.content,
      });

      // Also send via API for persistence
      await api.post(`/channels/${channelId}/messages`, {
        content: data.content,
      });

      reset();
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleTyping = () => {
    if (isConnected && channelId) {
      emit("typing:start", { dmChannelId: channelId });
    }
  };

  const getChannelName = () => {
    if (!channel) return "Direct Message";
    if (channel.type === "dm") {
      return channel.recipients[0]?.username || "Unknown User";
    }
    return channel.name || "Group DM";
  };

  const getChannelAvatar = () => {
    if (!channel) return null;
    if (channel.type === "dm") {
      return channel.recipients[0]?.avatar;
    }
    return channel.icon;
  };

  const channelMessages = messages[channelId] || [];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-[var(--text-danger)] mb-4">{error || "Channel not found"}</p>
        <Button onClick={() => router.push("/dm")}>Back to DMs</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="h-12 px-4 flex items-center gap-3 border-b border-[var(--border-default)] shadow-sm">
        <button
          onClick={() => router.push("/dm")}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-modifier-hover)]"
        >
          <ChevronLeft className="w-5 h-5 text-[var(--text-muted)]" />
        </button>

        <Avatar src={getChannelAvatar()} alt={getChannelName()} size="sm" />

        <div className="flex-1">
          <h2 className="font-semibold text-white truncate">{getChannelName()}</h2>
        </div>

        <div className="flex items-center gap-1">
          <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-modifier-hover)] text-[var(--text-muted)] hover:text-[var(--text-normal)]">
            <Phone className="w-5 h-5" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-modifier-hover)] text-[var(--text-muted)] hover:text-[var(--text-normal)]">
            <Video className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin"
      >
        {channelMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
              <Hash className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              No messages yet
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          channelMessages.map((message) => (
            <div
              key={message.id}
              className="group flex gap-4 py-1 px-2 -mx-2 rounded hover:bg-[var(--message-background-hover)]"
            >
              <Avatar src={message.author.avatar} alt={message.author.username} size="sm" />

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-white hover:underline cursor-pointer">
                    {message.author.username}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
                <p className="text-[var(--text-normal)] break-words whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>

              {/* Message actions */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-0.5">
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-normal)]">
                  <Reply className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-normal)]">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="px-4 pb-6">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="relative flex items-center bg-[var(--input-background)] rounded-lg">
            {/* Left buttons */}
            <button
              type="button"
              className="w-11 h-11 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-normal)] transition-colors"
            >
              <PlusCircle className="w-6 h-6" />
            </button>

            {/* Input */}
            <input
              {...register("content")}
              type="text"
              placeholder={`Message @${getChannelName()}`}
              className="flex-1 py-2.5 bg-transparent text-[var(--text-normal)] placeholder:text-[var(--text-muted)] focus:outline-none"
              onInput={handleTyping}
            />

            {/* Right buttons */}
            <div className="flex items-center gap-1 pr-2">
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-normal)] transition-colors"
              >
                <Gift className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-normal)] transition-colors"
              >
                <Sticker className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-normal)] transition-colors"
              >
                <Smile className="w-5 h-5" />
              </button>

              {messageContent && (
                <button
                  type="submit"
                  className="w-8 h-8 flex items-center justify-center text-[var(--brand-primary)] hover:text-[var(--brand-hover)] transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
