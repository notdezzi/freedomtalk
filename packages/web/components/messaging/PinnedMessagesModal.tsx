'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Pin, Trash2, Loader2, Hash } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useMessageStore, type Message } from '@/stores/messageStore';
import { apiClient } from '@/lib/api-client';

export default function PinnedMessagesModal() {
  const { activeModal, closeModal } = useUIStore();
  const { getMessages, updateMessage } = useMessageStore();
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [unpinning, setUnpinning] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const isOpen = activeModal.type === 'pinned-messages';
  const channelId = activeModal.data?.channelId as string | undefined;
  const channelName = activeModal.data?.channelName as string | undefined;

  useEffect(() => {
    if (isOpen && channelId) {
      fetchPinnedMessages();
    }
  }, [isOpen, channelId]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        closeModal();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeModal]);

  const fetchPinnedMessages = async () => {
    if (!channelId) return;

    setLoading(true);

    // First check local store for pinned messages
    const localMessages = getMessages(channelId);
    const localPinned = localMessages.filter((m) => m.pinned);

    if (localPinned.length > 0) {
      setPinnedMessages(localPinned);
      setLoading(false);
      return;
    }

    // Otherwise try to fetch from API
    try {
      const response = await apiClient.get<{ messages: Message[] }>(`/api/v1/channels/${channelId}/pinned`);
      if (response.success && response.data) {
        const messages = Array.isArray(response.data) ? response.data : response.data.messages || [];
        setPinnedMessages(messages.filter((m: Message) => m.pinned));
      }
    } catch {
      // If API fails, just show empty
      setPinnedMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnpin = async (messageId: string) => {
    if (!channelId) return;

    setUnpinning(messageId);
    try {
      const response = await apiClient.unpinMessage(messageId);
      if (response.success) {
        // Update local state
        setPinnedMessages((prev) => prev.filter((m) => m.id !== messageId));
        // Update message store
        updateMessage(channelId, messageId, { pinned: false });
      }
    } catch {
      // Handle error silently
    } finally {
      setUnpinning(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="bg-background-elevated rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Pin className="w-5 h-5 text-accent" />
            <h3 className="font-semibold">Pinned Messages</h3>
            {channelName && (
              <span className="text-sm text-foreground-muted">
                in #{channelName}
              </span>
            )}
          </div>
          <button
            onClick={closeModal}
            className="p-1 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-foreground-muted" />
            </div>
          ) : pinnedMessages.length === 0 ? (
            <div className="text-center py-8 text-foreground-muted">
              <Pin className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No pinned messages</p>
              <p className="text-xs mt-1">
                Important messages can be pinned for easy access
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pinnedMessages.map((message) => (
                <div
                  key={message.id}
                  className="bg-background-surface rounded-lg p-4 relative group"
                >
                  {/* Author and timestamp */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center overflow-hidden">
                      {message.author.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={message.author.avatar}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-background">
                          {message.author.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-sm">
                        {message.author.displayName || message.author.username}
                      </span>
                      <span className="text-xs text-foreground-muted ml-2">
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Message content */}
                  <p className="text-sm text-foreground pl-10 whitespace-pre-wrap break-words">
                    {message.content}
                  </p>

                  {/* Unpin button */}
                  <button
                    onClick={() => handleUnpin(message.id)}
                    disabled={unpinning === message.id}
                    className="absolute top-2 right-2 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-error/10 text-foreground-muted hover:text-error transition-all"
                    title="Unpin message"
                  >
                    {unpinning === message.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border text-center">
          <p className="text-xs text-foreground-muted">
            {pinnedMessages.length} pinned message{pinnedMessages.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
