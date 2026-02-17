'use client';

import { useState, useMemo } from 'react';
import type { MessageMention } from '@/stores/messageStore';

interface MessageContentProps {
  content: string;
  mentions?: MessageMention[];
  mentionRoles?: string[];
  mentionEveryone?: boolean;
}

// Spoiler component
function Spoiler({ content }: { content: string }) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return <span className="bg-background-surface px-0.5 rounded">{content}</span>;
  }

  return (
    <button
      onClick={() => setRevealed(true)}
      className="bg-background-elevated text-transparent hover:text-foreground-muted px-0.5 rounded cursor-pointer transition-colors select-none"
    >
      {content}
    </button>
  );
}

// Parse message content and highlight mentions, channels, and format markdown
export default function MessageContent({
  content,
  mentions = [],
  mentionEveryone = false,
}: MessageContentProps) {
  const parsedContent = useMemo(() => {
    if (!content) return null;

    // Regex patterns
    const userMentionRegex = /<@!?(\d+)>/g;
    const everyoneRegex = /@everyone/g;
    const hereRegex = /@here/g;
    const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
    const inlineCodeRegex = /`([^`]+)`/g;
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const italicRegex = /\*([^*]+)\*/g;
    const strikethroughRegex = /~~([^~]+)~~/g;
    const spoilerRegex = /\|\|([^|]+)\|\|/g;

    // Simple parsing - split by lines first to handle code blocks
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockContent = '';
    let codeBlockLang = '';

    lines.forEach((line, lineIndex) => {
      // Check for code block start/end
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockLang = line.slice(3);
          codeBlockContent = '';
        } else {
          inCodeBlock = false;
          elements.push(
            <pre
              key={`codeblock-${lineIndex}`}
              className="bg-background-elevated p-2 rounded text-sm overflow-x-auto my-1 border border-border"
            >
              {codeBlockLang && (
                <div className="text-xs text-foreground-muted mb-1">{codeBlockLang}</div>
              )}
              <code className="font-mono">{codeBlockContent}</code>
            </pre>
          );
          codeBlockContent = '';
          codeBlockLang = '';
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent += (codeBlockContent ? '\n' : '') + line;
        return;
      }

      // Parse inline elements
      let processedLine: React.ReactNode = line;

      // URLs
      const urlParts = line.split(urlRegex);
      if (urlParts.length > 1) {
        processedLine = urlParts.map((part, i) => {
          if (i % 2 === 1) {
            return (
              <a
                key={`url-${lineIndex}-${i}`}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline break-all"
              >
                {part}
              </a>
            );
          }
          return part;
        });
      }

      // User mentions
      if (typeof processedLine === 'string') {
        processedLine = processedLine.split(userMentionRegex).map((part, i) => {
          if (i % 2 === 1) {
            const mentionedUser = mentions.find((m) => m.id === part);
            return (
              <span
                key={`user-${lineIndex}-${i}`}
                className="bg-accent/20 text-accent px-0.5 rounded hover:bg-accent/30 cursor-pointer"
              >
                @{mentionedUser?.username || 'Unknown User'}
              </span>
            );
          }
          return part;
        });
      }

      // Everyone mentions
      if (mentionEveryone && typeof processedLine === 'string') {
        processedLine = processedLine.split(everyoneRegex).map((part, i) => {
          if (part === '@everyone') {
            return (
              <span
                key={`everyone-${lineIndex}-${i}`}
                className="bg-warning/20 text-warning px-0.5 rounded"
              >
                @everyone
              </span>
            );
          }
          return part;
        });
      }

      // Here mentions
      if (typeof processedLine === 'string') {
        processedLine = processedLine.split(hereRegex).map((part, i) => {
          if (part === '@here') {
            return (
              <span
                key={`here-${lineIndex}-${i}`}
                className="bg-warning/20 text-warning px-0.5 rounded"
              >
                @here
              </span>
            );
          }
          return part;
        });
      }

      // Flatten arrays for further processing
      const flattenAndProcess = (
        input: React.ReactNode | React.ReactNode[],
        regex: RegExp,
        wrapper: (content: string, key: string) => React.ReactNode
      ): React.ReactNode[] => {
        const inputArray = Array.isArray(input) ? input : [input];

        return inputArray.flatMap((part: React.ReactNode, partIdx: number) => {
          if (typeof part !== 'string') return part;

          const segments = part.split(regex);
          if (segments.length === 1) return part;

          return segments.map((segment: string, segIdx: number) => {
            if (segIdx % 2 === 1) {
              return wrapper(segment, `${partIdx}-${segIdx}`);
            }
            return segment;
          });
        });
      };

      // Inline code
      processedLine = flattenAndProcess(
        processedLine,
        inlineCodeRegex,
        (content, key) => (
          <code
            key={`inlinecode-${lineIndex}-${key}`}
            className="bg-background-elevated px-1 rounded text-sm font-mono"
          >
            {content}
          </code>
        )
      );

      // Bold
      processedLine = flattenAndProcess(
        processedLine,
        boldRegex,
        (content, key) => (
          <strong key={`bold-${lineIndex}-${key}`}>{content}</strong>
        )
      );

      // Italic
      processedLine = flattenAndProcess(
        processedLine,
        italicRegex,
        (content, key) => (
          <em key={`italic-${lineIndex}-${key}`}>{content}</em>
        )
      );

      // Strikethrough
      processedLine = flattenAndProcess(
        processedLine,
        strikethroughRegex,
        (content, key) => (
          <del key={`del-${lineIndex}-${key}`}>{content}</del>
        )
      );

      // Spoilers
      processedLine = flattenAndProcess(
        processedLine,
        spoilerRegex,
        (content, key) => (
          <Spoiler key={`spoiler-${lineIndex}-${key}`} content={content} />
        )
      );

      elements.push(
        <span key={`line-${lineIndex}`}>
          {processedLine}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      );
    });

    return <>{elements}</>;
  }, [content, mentions, mentionEveryone]);

  return (
    <div className="text-sm break-words whitespace-pre-wrap">
      {parsedContent}
    </div>
  );
}
