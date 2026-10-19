'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function Markdown({ content, className = '' }: { content: string; className?: string }) {
  return (
    <div className={`md-body text-[0.95rem] ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
