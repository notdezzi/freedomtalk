"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Process content to handle spoilers and mentions
  const processedContent = useMemo(() => {
    let result = content;

    // Handle spoilers: ||text|| -> <span class="spoiler">text</span>
    result = result.replace(
      /\|\|(.+?)\|\|/g,
      '<span class="spoiler" data-spoiler="$1">[SPOILER]</span>'
    );

    // Handle user mentions: <@userId> -> @userId
    result = result.replace(
      /<@([a-zA-Z0-9]+)>/g,
      '<span class="mention mention-user" data-id="$1">@$1</span>'
    );

    // Handle role mentions: <@&roleId> -> @role
    result = result.replace(
      /<@&([a-zA-Z0-9]+)>/g,
      '<span class="mention mention-role" data-id="$1">@role</span>'
    );

    // Handle channel mentions: <#channelId> -> #channel
    result = result.replace(
      /<#([a-zA-Z0-9]+)>/g,
      '<span class="mention mention-channel" data-id="$1">#channel</span>'
    );

    return result;
  }, [content]);

  return (
    <div
      className={cn(
        "markdown-content prose prose-invert prose-sm max-w-none",
        "prose-p:my-0 prose-p:leading-relaxed",
        "prose-headings:text-white prose-headings:font-semibold",
        "prose-a:text-[var(--text-link)] prose-a:no-underline hover:prose-a:underline",
        "prose-code:bg-[var(--bg-tertiary)] prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
        "prose-pre:bg-[var(--bg-tertiary)] prose-pre:border prose-pre:border-[var(--border-default)]",
        "prose-blockquote:border-l-[var(--brand-primary)] prose-blockquote:text-[var(--text-muted)]",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom spoiler handling
          span: ({ children, className, ...props }) => {
            if (className === "spoiler") {
              return (
                <span
                  className="bg-[var(--bg-tertiary)] text-[var(--bg-tertiary)] rounded px-0.5 cursor-pointer hover:text-[var(--text-normal)] transition-colors select-none"
                  onClick={(e) => {
                    const target = e.currentTarget;
                    const spoilerText = target.getAttribute("data-spoiler");
                    if (target.textContent === "[SPOILER]" && spoilerText) {
                      target.textContent = spoilerText;
                      target.classList.remove("bg-[var(--bg-tertiary)]", "text-[var(--bg-tertiary)]");
                    }
                  }}
                >
                  {children}
                </span>
              );
            }
            if (typeof className === "string" && className.includes("mention")) {
              return (
                <span className="bg-[#5865f2]/30 text-[#c9cdfb] rounded px-0.5 cursor-pointer hover:bg-[#5865f2]/50 transition-colors">
                  {children}
                </span>
              );
            }
            return <span className={className} {...props}>{children}</span>;
          },
          // Custom code block
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-[var(--bg-tertiary)] px-1 py-0.5 rounded text-sm" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          // Links open in new tab
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
