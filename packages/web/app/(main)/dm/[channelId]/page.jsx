"use client";
import React, { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDMStore } from "@/stores/dm.store";
import { useAuthStore } from "@/stores/auth.store";
import { useWebSocket } from "@/hooks";
import api from "@/lib/api";
import { Avatar, Spinner } from "@/components/ui";
import { MarkdownRenderer, MessageReactions, ReactionPicker, TypingIndicator } from "@/components/chat";
import { cn, formatTime } from "@/lib/utils";
import { Hash, Pin, Users, Inbox, HelpCircle, Plus, Gift, Sticker, Smile, Send, Phone, Video, MoreVertical, } from "lucide-react";
export default function DMChannelPage() {
    const params = useParams();
    const router = useRouter();
    const channelId = params.channelId;
    const { user } = useAuthStore();
    const { channels, activeChannelId, messages: allMessages, typingUsers, setActiveChannel, setMessages, addMessage, updateMessage, deleteMessage, setTypingUsers, addTypingUser, removeTypingUser, } = useDMStore();
    const [channel, setChannel] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [messageInput, setMessageInput] = useState("");
    const [showReactionPicker, setShowReactionPicker] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);
    const messages = allMessages[channelId] || [];
    const typingUserIds = typingUsers[channelId] || [];
    const channelType = channel?.type === "group_dm" ? "group" : "dm";
    const { isConnected, subscribe, unsubscribe, emit, joinRoom, leaveRoom } = useWebSocket();
    useEffect(() => {
        const foundChannel = channels.find((c) => c.id === channelId);
        if (foundChannel) {
            setChannel(foundChannel);
        }
    }, [channels, channelId]);
    useEffect(() => {
        setActiveChannel(channelId);
        return () => setActiveChannel(null);
    }, [channelId, setActiveChannel]);
    useEffect(() => {
        if (!channelId || !isConnected)
            return;
        joinRoom(`channel:${channelId}`);
        const fetchMessages = async () => {
            try {
                setIsLoading(true);
                const response = await api.get(`/channels/${channelId}/messages`);
                setMessages(channelId, response || []);
            }
            catch (error) {
                console.error("Failed to fetch messages:", error);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchMessages();
        return () => {
            leaveRoom(`channel:${channelId}`);
        };
    }, [channelId, isConnected, joinRoom, leaveRoom, setMessages]);
    useEffect(() => {
        if (!isConnected)
            return;
        const handleMessageCreate = (data) => {
            if (data.message.dmChannelId === channelId || data.message.channelId === channelId) {
                addMessage(channelId, data.message);
            }
        };
        const handleMessageUpdate = (data) => {
            if (data.message.dmChannelId === channelId || data.message.channelId === channelId) {
                updateMessage(channelId, data.message.id, data.message);
            }
        };
        const handleMessageDelete = (data) => {
            if (data.channelId === channelId) {
                deleteMessage(channelId, data.messageId);
            }
        };
        const handleTypingStart = (data) => {
            if (data.channelId === channelId && data.userId !== user?.id) {
                addTypingUser(channelId, data.userId);
            }
        };
        const handleTypingStop = (data) => {
            if (data.channelId === channelId) {
                removeTypingUser(channelId, data.userId);
            }
        };
        subscribe("MESSAGE_CREATE", handleMessageCreate);
        subscribe("MESSAGE_UPDATE", handleMessageUpdate);
        subscribe("MESSAGE_DELETE", handleMessageDelete);
        subscribe("TYPING_START", handleTypingStart);
        subscribe("TYPING_STOP", handleTypingStop);
        return () => {
            unsubscribe("MESSAGE_CREATE", handleMessageCreate);
            unsubscribe("MESSAGE_UPDATE", handleMessageUpdate);
            unsubscribe("MESSAGE_DELETE", handleMessageDelete);
            unsubscribe("TYPING_START", handleTypingStart);
            unsubscribe("TYPING_STOP", handleTypingStop);
        };
    }, [
        isConnected,
        channelId,
        user?.id,
        subscribe,
        unsubscribe,
        addMessage,
        updateMessage,
        deleteMessage,
        addTypingUser,
        removeTypingUser,
    ]);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);
    const sendTypingIndicator = useCallback(() => {
        if (!isConnected || !channelId)
            return;
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            emit("TYPING_START", { channelId });
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
            emit("TYPING_STOP", { channelId });
        }, 3000);
    }, [isConnected, channelId, emit]);
    const handleInputChange = (e) => {
        setMessageInput(e.target.value);
        sendTypingIndicator();
    };
    const sendMessage = async () => {
        if (!messageInput.trim() || isSending)
            return;
        setIsSending(true);
        const content = messageInput.trim();
        setMessageInput("");
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        isTypingRef.current = false;
        emit("TYPING_STOP", { channelId });
        try {
            await api.post(`/channels/${channelId}/messages`, { content });
        }
        catch (error) {
            console.error("Failed to send message:", error);
            setMessageInput(content);
        }
        finally {
            setIsSending(false);
        }
    };
    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };
    const handleAddReaction = async (messageId, emoji) => {
        try {
            await api.put(`/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
            setShowReactionPicker(null);
        }
        catch (error) {
            console.error("Failed to add reaction:", error);
        }
    };
    const handleRemoveReaction = async (messageId, emoji) => {
        try {
            await api.delete(`/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
        }
        catch (error) {
            console.error("Failed to remove reaction:", error);
        }
    };
    const getChannelName = () => {
        if (!channel)
            return "Direct Message";
        if (channel.type === "group_dm") {
            return channel.name || "Unnamed Group";
        }
        return channel.recipients[0]?.username || "Unknown User";
    };
    const getChannelIcon = () => {
        if (!channel)
            return null;
        if (channel.type === "group_dm") {
            return (<div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
          <Users className="w-4 h-4 text-[var(--text-muted)]"/>
        </div>);
        }
        return (<Avatar src={channel.recipients[0]?.avatar} alt={channel.recipients[0]?.username || "User"} size="sm"/>);
    };
    const getTypingUsernames = () => {
        const recipientMap = new Map(channel?.recipients.map((r) => [r.id, r.username]));
        return typingUserIds
            .map((id) => recipientMap.get(id) || "Someone")
            .filter(Boolean);
    };
    if (isLoading) {
        return (<div className="flex-1 flex items-center justify-center">
        <Spinner size="lg"/>
      </div>);
    }
    if (!channel) {
        return (<div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-muted)]">Channel not found</p>
        </div>
      </div>);
    }
    return (<div className="flex-1 flex flex-col overflow-hidden">
      
      <div className="h-12 px-4 flex items-center border-b border-[var(--border-default)] shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          {getChannelIcon()}
          <span className="font-semibold text-white">{getChannelName()}</span>
        </div>

        <div className="flex-1"/>

        
        <div className="flex items-center gap-4">
          <button className="text-[var(--text-muted)] hover:text-[var(--text-normal)]">
            <Phone className="w-5 h-5"/>
          </button>
          <button className="text-[var(--text-muted)] hover:text-[var(--text-normal)]">
            <Video className="w-5 h-5"/>
          </button>
          <button className="text-[var(--text-muted)] hover:text-[var(--text-normal)]">
            <Pin className="w-5 h-5"/>
          </button>
          <button className="text-[var(--text-muted)] hover:text-[var(--text-normal)]">
            <Users className="w-5 h-5"/>
          </button>
          <div className="relative">
            <input type="text" placeholder="Search" className="w-36 h-6 px-2 text-sm bg-[var(--bg-tertiary)] rounded text-[var(--text-normal)] placeholder-[var(--text-muted)] focus:outline-none focus:w-56 transition-all"/>
          </div>
          <button className="text-[var(--text-muted)] hover:text-[var(--text-normal)]">
            <Inbox className="w-5 h-5"/>
          </button>
          <button className="text-[var(--text-muted)] hover:text-[var(--text-normal)]">
            <HelpCircle className="w-5 h-5"/>
          </button>
        </div>
      </div>

      
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (<div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
              <Hash className="w-8 h-8 text-[var(--text-muted)]"/>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Welcome to {getChannelName()}!
            </h2>
            <p className="text-[var(--text-muted)]">
              This is the beginning of your direct message history.
            </p>
          </div>) : (<div className="py-4 px-4">
            {messages.map((message, index) => {
                const prevMessage = messages[index - 1];
                const showHeader = !prevMessage ||
                    prevMessage.authorId !== message.authorId ||
                    new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 5 * 60 * 1000;
                return (<div key={message.id} className={cn("group relative py-0.5 hover:bg-[var(--bg-modifier-hover)]", showHeader && "mt-4 pt-1")}>
                  {showHeader ? (<div className="flex items-start gap-4">
                      <Avatar src={message.author.avatar} alt={message.author.username} size="sm" className="mt-0.5"/>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-white hover:underline cursor-pointer">
                            {message.author.username}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">
                            {formatTime(message.createdAt)}
                          </span>
                        </div>
                        <MarkdownRenderer content={message.content}/>
                        {message.reactions && message.reactions.length > 0 && (<MessageReactions reactions={message.reactions} onAddReaction={(emoji) => handleAddReaction(message.id, emoji)} onRemoveReaction={(emoji) => handleRemoveReaction(message.id, emoji)} messageId={message.id}/>)}
                      </div>
                    </div>) : (<div className="flex items-start gap-4">
                      <div className="w-8 shrink-0">
                        <span className="text-[10px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 ml-1">
                          {formatTime(message.createdAt, true)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <MarkdownRenderer content={message.content}/>
                        {message.reactions && message.reactions.length > 0 && (<MessageReactions reactions={message.reactions} onAddReaction={(emoji) => handleAddReaction(message.id, emoji)} onRemoveReaction={(emoji) => handleRemoveReaction(message.id, emoji)} messageId={message.id}/>)}
                      </div>
                    </div>)}

                  
                  <div className={cn("absolute -top-4 right-4 flex items-center gap-0.5 bg-[var(--surface-floating)] rounded border border-[var(--border-default)] shadow-md", "opacity-0 group-hover:opacity-100 transition-opacity")}>
                    <button onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-normal)] hover:bg-[var(--bg-modifier-hover)]">
                      <Smile className="w-4 h-4"/>
                    </button>
                    <button className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-normal)] hover:bg-[var(--bg-modifier-hover)]">
                      <MoreVertical className="w-4 h-4"/>
                    </button>
                  </div>

                  
                  {showReactionPicker === message.id && (<div className="absolute top-8 right-4 z-50">
                      <ReactionPicker onselect={(emoji) => handleAddReaction(message.id, emoji)} onClose={() => setShowReactionPicker(null)}/>
                    </div>)}
                </div>);
            })}
            <div ref={messagesEndRef}/>
          </div>)}
      </div>

      
      <TypingIndicator usernames={getTypingUsernames()}/>

      
      <div className="px-4 pb-6 pt-2">
        <div className="relative bg-[var(--bg-secondary-alt)] rounded-lg">
          
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button className="text-[var(--text-muted)] hover:text-[var(--text-normal)]">
              <Plus className="w-5 h-5"/>
            </button>
          </div>

          
          <textarea ref={inputRef} value={messageInput} onChange={handleInputChange} onKeyDown={handleKeyPress} placeholder={`Message ${getChannelName()}`} rows={1} className={cn("w-full py-3 pl-12 pr-24 bg-transparent text-[var(--text-normal)] resize-none", "placeholder-[var(--text-muted)] focus:outline-none", "max-h-[200px] min-h-[44px]")} style={{
            height: "auto",
        }}/>

          
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button className="text-[var(--text-muted)] hover:text-[var(--text-normal)]">
              <Gift className="w-5 h-5"/>
            </button>
            <button className="text-[var(--text-muted)] hover:text-[var(--text-normal)]">
              <Sticker className="w-5 h-5"/>
            </button>
            <button onClick={sendMessage} disabled={!messageInput.trim() || isSending} className={cn("text-[var(--text-muted)] hover:text-[var(--text-normal)] disabled:opacity-50")}>
              <Send className="w-5 h-5"/>
            </button>
          </div>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.jsx.map