"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <div className={className} dir="auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, className, ...props }) => (
            <a
              {...props}
              className={[
                "text-primary underline underline-offset-4 hover:text-primary/80 break-all",
                className,
              ]
                .filter(Boolean)
                .join(" ")}
              target="_blank"
              rel="noreferrer"
            />
          ),
          p: ({ node, className, ...props }) => (
            <p
              {...props}
              dir="auto"
              className={["break-words", className].filter(Boolean).join(" ")}
            />
          ),
          li: ({ node, className, ...props }) => (
            <li
              {...props}
              dir="auto"
              className={["break-words", className].filter(Boolean).join(" ")}
            />
          ),
          h1: ({ node, ...props }) => <h1 {...props} dir="auto" />,
          h2: ({ node, ...props }) => <h2 {...props} dir="auto" />,
          h3: ({ node, ...props }) => <h3 {...props} dir="auto" />,
          h4: ({ node, ...props }) => <h4 {...props} dir="auto" />,
          h5: ({ node, ...props }) => <h5 {...props} dir="auto" />,
          h6: ({ node, ...props }) => <h6 {...props} dir="auto" />,
          blockquote: ({ node, ...props }) => <blockquote {...props} dir="auto" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
