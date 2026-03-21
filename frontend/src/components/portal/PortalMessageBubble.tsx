import MarkdownRenderer from "@/components/shared/MarkdownRenderer"
import { Nachricht } from "@/lib/types"

interface Props {
  nachricht: Nachricht
}

export default function PortalMessageBubble({ nachricht }: Props) {
  const isKunde = nachricht.rolle === "kunde"

  return (
    <div className={`flex ${isKunde ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[75%] px-4 py-3 ${
          isKunde
            ? "bg-primary text-white rounded-xl rounded-br-sm"
            : "bg-gray-100 text-gray-800 rounded-xl rounded-bl-sm"
        }`}
      >
        <MarkdownRenderer content={nachricht.inhalt_markdown} />
        <div
          className={`text-xs mt-1 opacity-70 ${isKunde ? "text-right" : "text-left"}`}
        >
          {new Date(nachricht.created_at).toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  )
}
