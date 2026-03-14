import { useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import mermaid from "mermaid"
import { Box } from "@chakra-ui/react"

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
    <Box ref={containerRef} className="markdown-content" fontSize="sm" lineHeight="tall" css={{ "& p": { margin: "0.25em 0" }, "& ul, & ol": { paddingLeft: "1.5em", margin: "0.25em 0" }, "& h1, & h2, & h3, & h4": { fontWeight: "bold", margin: "0.5em 0 0.25em" }, "& blockquote": { borderLeft: "3px solid", borderColor: "gray.300", paddingLeft: "0.75em", margin: "0.25em 0" } }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        children={content}
        components={{
          p({ children }) {
            return <p style={{ margin: "0.25em 0", lineHeight: 1.5 }}>{children}</p>
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
                <Box
                  as="pre"
                  bg="gray.50"
                  p={3}
                  borderRadius="md"
                  overflowX="auto"
                  fontSize="xs"
                >
                  <code className={className} {...props}>
                    {children}
                  </code>
                </Box>
              )
            }
            return (
              <Box as="code" bg="gray.100" px={1} borderRadius="sm" fontSize="xs" {...props}>
                {children}
              </Box>
            )
          },
        }}
      />
    </Box>
  )
}
