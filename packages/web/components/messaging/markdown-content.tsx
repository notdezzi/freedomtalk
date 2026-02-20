'use client';

import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Renders message content with markdown support
 * Supports: bold, italic, strikethrough, code, code blocks, blockquotes, links
 */
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <span className={cn('break-words', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Paragraph - keep inline for chat messages
          p: ({ children }) => <>{children}</>,
          // Bold
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">{children}</strong>
          ),
          // Italic
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          // Strikethrough (via remarkGfm)
          del: ({ children }) => (
            <del className="line-through opacity-70">{children}</del>
          ),
          // Inline code
          code: ({ className, children, ...props }) => {
            const isCodeBlock = className?.includes('language-');
            if (isCodeBlock) {
              return (
                <code className={cn('block p-3 rounded-md bg-background-surface font-mono text-sm overflow-x-auto', className)} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="px-1 py-0.5 rounded bg-background-surface/80 text-accent font-mono text-sm"
                {...props}
              >
                {children}
              </code>
            );
          },
          // Code block (pre)
          pre: ({ children }) => (
            <pre className="my-1 p-0 bg-transparent rounded overflow-x-auto">
              {children}
            </pre>
          ),
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-accent pl-3 my-1 text-foreground-muted italic">
              {children}
            </blockquote>
          ),
          // Links - open in new tab
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </a>
          ),
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside my-1 pl-2 inline-block">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside my-1 pl-2 inline-block">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="my-0.5">{children}</li>
          ),
          // Headings (rarely used in chat, but support them)
          h1: ({ children }) => (
            <span className="text-xl font-bold">{children}</span>
          ),
          h2: ({ children }) => (
            <span className="text-lg font-bold">{children}</span>
          ),
          h3: ({ children }) => (
            <span className="text-base font-bold">{children}</span>
          ),
          // Horizontal rule
          hr: () => (
            <span className="block my-2 border-t border-border" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </span>
  );
}
