'use client';

import { useState } from 'react';
import { FileText, Download, Play, Pause, Volume2, VolumeX, Eye, EyeOff, Expand, X } from 'lucide-react';
import type { MessageAttachment as MessageAttachmentType } from '@/stores/messageStore';

interface MessageAttachmentsProps {
  attachments: MessageAttachmentType[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function ImageAttachment({ attachment }: { attachment: MessageAttachmentType }) {
  const [isSpoiler, setIsSpoiler] = useState(attachment.spoiler);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  if (isSpoiler) {
    return (
      <button
        onClick={() => setIsSpoiler(false)}
        className="relative rounded-lg overflow-hidden bg-background-surface border border-border"
      >
        <div className="blur-lg select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.url}
            alt="Spoiler image"
            className="max-h-80 object-contain"
            draggable={false}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="flex items-center gap-2 px-3 py-2 bg-background-elevated rounded-lg border border-border">
            <EyeOff className="w-4 h-4" />
            <span className="text-sm">Spoiler - Click to reveal</span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <>
      <div className="relative group rounded-lg overflow-hidden border border-border max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.filename}
          className="max-h-80 object-contain cursor-pointer"
          onClick={() => setIsLightboxOpen(true)}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsLightboxOpen(true)}
            className="p-1.5 bg-background-elevated/80 rounded border border-border hover:bg-background-surface transition-colors"
            title="Expand"
          >
            <Expand className="w-4 h-4" />
          </button>
        </div>
        {attachment.description && (
          <div className="px-2 py-1 text-xs text-foreground-muted border-t border-border">
            {attachment.description}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 bg-background-elevated rounded-full hover:bg-background-surface transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.url}
            alt={attachment.filename}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function VideoAttachment({ attachment }: { attachment: MessageAttachmentType }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpoiler, setIsSpoiler] = useState(attachment.spoiler);

  if (isSpoiler) {
    return (
      <button
        onClick={() => setIsSpoiler(false)}
        className="relative rounded-lg overflow-hidden bg-background-surface border border-border p-8"
      >
        <div className="flex items-center gap-2 px-3 py-2 bg-background-elevated rounded-lg border border-border">
          <EyeOff className="w-4 h-4" />
          <span className="text-sm">Spoiler - Click to reveal</span>
        </div>
      </button>
    );
  }

  return (
    <div className="relative group rounded-lg overflow-hidden border border-border max-w-md">
      <video
        src={attachment.url}
        controls
        className="max-h-80"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onVolumeChange={(e) => setIsMuted((e.target as HTMLVideoElement).muted)}
      />
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="p-3 bg-background-elevated/80 rounded-full">
            <Play className="w-8 h-8" />
          </div>
        </div>
      )}
    </div>
  );
}

function AudioAttachment({ attachment }: { attachment: MessageAttachmentType }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-background-surface rounded-lg border border-border max-w-md">
      <div className="w-10 h-10 bg-accent/20 rounded flex items-center justify-center">
        <Volume2 className="w-5 h-5 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{attachment.filename}</div>
        <div className="text-xs text-foreground-muted">{formatFileSize(attachment.size)}</div>
      </div>
      <audio src={attachment.url} controls className="h-8 w-32" />
    </div>
  );
}

function GenericAttachment({ attachment }: { attachment: MessageAttachmentType }) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-background-surface rounded-lg border border-border max-w-md hover:bg-background-elevated transition-colors">
      <div className="w-10 h-10 bg-background-elevated rounded flex items-center justify-center">
        <FileText className="w-5 h-5 text-foreground-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{attachment.filename}</div>
        <div className="text-xs text-foreground-muted">
          {formatFileSize(attachment.size)}
          {attachment.contentType && ` • ${attachment.contentType}`}
        </div>
      </div>
      <button
        onClick={handleDownload}
        className="p-2 hover:bg-background rounded transition-colors"
        title="Download"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  if (!attachments.length) return null;

  // Separate images/videos from other files for grid layout
  const mediaAttachments = attachments.filter(
    (a) => a.contentType.startsWith('image/') || a.contentType.startsWith('video/')
  );
  const otherAttachments = attachments.filter(
    (a) => !a.contentType.startsWith('image/') && !a.contentType.startsWith('video/')
  );

  return (
    <div className="flex flex-col gap-2 mt-2">
      {/* Media attachments in grid */}
      {mediaAttachments.length > 0 && (
        <div className={`grid gap-2 ${
          mediaAttachments.length === 1 ? 'grid-cols-1' :
          mediaAttachments.length === 2 ? 'grid-cols-2' :
          'grid-cols-2'
        }`}>
          {mediaAttachments.map((attachment) => (
            <div key={attachment.id}>
              {attachment.contentType.startsWith('image/') ? (
                <ImageAttachment attachment={attachment} />
              ) : (
                <VideoAttachment attachment={attachment} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Audio attachments */}
      {otherAttachments
        .filter((a) => a.contentType.startsWith('audio/'))
        .map((attachment) => (
          <AudioAttachment key={attachment.id} attachment={attachment} />
        ))}

      {/* Other files */}
      {otherAttachments
        .filter((a) => !a.contentType.startsWith('audio/'))
        .map((attachment) => (
          <GenericAttachment key={attachment.id} attachment={attachment} />
        ))}
    </div>
  );
}
