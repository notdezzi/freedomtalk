'use client';

import { ExternalLink } from 'lucide-react';
import type { MessageEmbed as MessageEmbedType } from '@/stores/messageStore';

interface MessageEmbedProps {
  embed: MessageEmbedType;
}

export default function MessageEmbed({ embed }: MessageEmbedProps) {
  // Render based on embed type
  if (embed.type === 'image' && embed.image) {
    return (
      <div className="max-w-md rounded-lg overflow-hidden border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={embed.image.url}
          alt={embed.title || 'Embedded image'}
          className="max-h-80 w-auto object-contain"
        />
      </div>
    );
  }

  if (embed.type === 'video' && embed.video) {
    return (
      <div className="max-w-md rounded-lg overflow-hidden border border-border">
        <video
          src={embed.video.url}
          controls
          className="max-h-80 w-auto"
        />
      </div>
    );
  }

  // Rich embed (Open Graph preview)
  if (embed.type === 'rich' || embed.type === 'link' || embed.type === 'article') {
    return (
      <div
        className="max-w-md rounded-lg border border-border bg-background-surface overflow-hidden"
        style={embed.color ? { borderLeftColor: embed.color, borderLeftWidth: '4px' } : undefined}
      >
        {/* Provider/Author */}
        {(embed.provider || embed.author) && (
          <div className="px-3 pt-3 flex items-center gap-2">
            {embed.author?.iconUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={embed.author.iconUrl}
                alt=""
                className="w-5 h-5 rounded"
              />
            )}
            <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
              {embed.provider && (
                <a
                  href={embed.provider.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {embed.provider.name}
                </a>
              )}
              {embed.author && (
                <>
                  <span>•</span>
                  <a
                    href={embed.author.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {embed.author.name}
                  </a>
                </>
              )}
            </div>
          </div>
        )}

        {/* Title */}
        {embed.title && (
          <div className="px-3 pt-2">
            <a
              href={embed.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline flex items-center gap-1"
            >
              {embed.title}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Description */}
        {embed.description && (
          <div className="px-3 pt-1">
            <p className="text-sm text-foreground-muted line-clamp-3">
              {embed.description}
            </p>
          </div>
        )}

        {/* Fields */}
        {embed.fields && embed.fields.length > 0 && (
          <div className="px-3 pt-2 grid gap-2">
            {embed.fields.map((field, i) => (
              <div key={i} className={field.inline ? 'inline-block mr-4' : ''}>
                <div className="text-xs font-bold text-foreground">{field.name}</div>
                <div className="text-xs text-foreground-muted">{field.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Image/Thumbnail */}
        {(embed.thumbnail || embed.image) && (
          <div className="p-3">
            <a
              href={embed.url || embed.image?.url || embed.thumbnail?.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={embed.image?.url || embed.thumbnail?.url}
                alt={embed.title || ''}
                className="rounded max-h-64 w-auto object-cover"
              />
            </a>
          </div>
        )}

        {/* Footer */}
        {embed.footer && (
          <div className="px-3 pb-3 flex items-center gap-2">
            {embed.footer.iconUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={embed.footer.iconUrl}
                alt=""
                className="w-4 h-4 rounded"
              />
            )}
            <span className="text-xs text-foreground-muted">{embed.footer.text}</span>
          </div>
        )}

        {/* Timestamp */}
        {embed.timestamp && (
          <div className="px-3 pb-3">
            <span className="text-xs text-foreground-muted">
              {new Date(embed.timestamp).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    );
  }

  return null;
}
