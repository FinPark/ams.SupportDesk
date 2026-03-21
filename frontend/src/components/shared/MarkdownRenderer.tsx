import { useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import mermaid from "mermaid"

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
})

interface Props {
  content: string
}

export default function MarkdownRenderer({ content }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      const mermaidBlocks = containerRef.current.querySelectorAll(".mermaid")
      if (mermaidBlocks.length > 0) {
        mermaid.run({ nodes: mermaidBlocks as any })
      }
    }
  }, [content])

  return (
    <div ref={containerRef} className="text-sm leading-relaxed [&_p]:my-1 [&_ul]:pl-6 [&_ul]:my-1 [&_ol]:pl-6 [&_ol]:my-1 [&_h1]:font-bold [&_h1]:my-2 [&_h2]:font-bold [&_h2]:my-2 [&_h3]:font-bold [&_h3]:my-1 [&_h4]:font-bold [&_h4]:my-1 [&_blockquote]:border-l-3 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:my-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        children={content}
        components={{
          p({ children }) {
            return <p className="my-1 leading-relaxed">{children}</p>
          },
          code({ className, children, ...props }) {
            const match = /language-mermaid/.exec(className || "")
            if (match) {
              return (
                <div className="mermaid">
                  {String(children).replace(/\n$/, "")}
                </div>
              )
            }
            if (className) {
              return (
                <pre className="bg-gray-50 p-3 rounded-md overflow-x-auto text-xs">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              )
            }
            return (
              <code className="bg-gray-100 px-1 rounded text-xs" {...props}>
                {children}
              </code>
            )
          },
        }}
      />
    </div>
  )
}
