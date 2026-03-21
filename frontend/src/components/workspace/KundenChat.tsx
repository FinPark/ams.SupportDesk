import { useState, useRef, useEffect } from "react"
import MarkdownRenderer from "@/components/shared/MarkdownRenderer"
import TemplatePicker, { useTemplatePicker } from "@/components/shared/TemplatePicker"
import { Nachricht } from "@/lib/types"

interface Props {
  nachrichten: Nachricht[]
  onSend: (text: string) => Promise<void>
  onSendToKI: (markierte: Nachricht[]) => void
  onDeleteNachricht: (nachricht: Nachricht) => void
  disabled?: boolean
  isActive?: boolean
  onFocus?: () => void
}

export default function KundenChat({ nachrichten, onSend, onSendToKI, onDeleteNachricht, disabled, isActive, onFocus }: Props) {
  const {
    input, setInput, pickerVisible, templateFilter, filtered, selectedIndex,
    handleInputChange, handleTemplateSelect, handlePickerClose, handleKeyDown,
  } = useTemplatePicker()
  const [sending, setSending] = useState(false)
  const [markierte, setMarkierte] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [nachrichten])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    setSending(true)
    try {
      await onSend(input.trim())
      setInput("")
    } finally {
      setSending(false)
    }
  }

  const toggleMarkiert = (id: string) => {
    setMarkierte((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSendToKI = () => {
    const msgs = nachrichten.filter((n) => markierte.has(n.id))
    if (msgs.length > 0) {
      onSendToKI(msgs)
      setMarkierte(new Set())
    }
  }

  return (
    <div className="flex flex-col h-full border-r border-gray-200">
      {/* Header */}
      <div
        className={`px-4 py-2 border-b transition-all duration-200 ${
          isActive ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`font-bold text-sm ${isActive ? "text-blue-600" : "text-gray-700"}`}>
            Kundengespr&auml;ch
          </span>
          {markierte.size > 0 && (
            <button
              className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-600 hover:bg-blue-50 transition"
              onClick={handleSendToKI}
            >
              {markierte.size} Nachricht{markierte.size > 1 ? "en" : ""} an KI senden &rarr;
            </button>
          )}
        </div>
      </div>

      {/* Nachrichten */}
      <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50">
        {nachrichten.length === 0 && (
          <div className="text-center py-10">
            <span className="text-gray-400 text-sm">Noch keine Nachrichten</span>
          </div>
        )}
        {nachrichten.map((msg) => {
          const isSupporter = msg.rolle === "supporter"
          const isMarked = markierte.has(msg.id)

          return (
            <div
              key={msg.id}
              className={`flex mb-3 relative ${isSupporter ? "justify-end" : "justify-start"}`}
            >
              {/* Markier-Indikator links (Kunde) */}
              {!isSupporter && (
                <div
                  className={`w-1 rounded-full mr-2 shrink-0 self-stretch cursor-pointer transition-colors ${
                    isMarked ? "bg-blue-400 hover:bg-blue-500" : "bg-transparent hover:bg-gray-300"
                  }`}
                  onClick={() => toggleMarkiert(msg.id)}
                  title={isMarked ? "Markierung entfernen" : "Für KI markieren"}
                />
              )}
              <div
                className={`max-w-[80%] px-4 py-3 shadow-sm cursor-pointer transition-all duration-150 ${
                  isSupporter
                    ? isMarked
                      ? "bg-primary-dark text-white rounded-xl rounded-br-sm border border-blue-200"
                      : "bg-primary text-white rounded-xl rounded-br-sm"
                    : isMarked
                      ? "bg-blue-50 text-gray-800 rounded-xl rounded-bl-sm border border-blue-300"
                      : "bg-white text-gray-800 rounded-xl rounded-bl-sm"
                }`}
                onClick={() => toggleMarkiert(msg.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold opacity-60">
                    {isSupporter ? "Support" : "Kunde"}
                    {isMarked && (
                      <span className={`ml-2 ${isSupporter ? "text-blue-100" : "text-blue-500"}`}>
                        &#9679; markiert
                      </span>
                    )}
                  </span>
                  {isSupporter && (
                    <button
                      className="text-xs px-1 min-w-0 text-red-400 hover:text-red-600 transition"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm("Nachricht wirklich löschen?")) {
                          onDeleteNachricht(msg)
                        }
                      }}
                      title="Löschen"
                    >
                      &#128465;
                    </button>
                  )}
                </div>
                <MarkdownRenderer content={msg.inhalt_markdown} />
                <div className="text-xs mt-1 opacity-50 text-right">
                  {new Date(msg.created_at).toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              {/* Markier-Indikator rechts (Supporter) */}
              {isSupporter && (
                <div
                  className={`w-1 rounded-full ml-2 shrink-0 self-stretch cursor-pointer transition-colors ${
                    isMarked ? "bg-blue-400 hover:bg-blue-500" : "bg-transparent hover:bg-gray-300"
                  }`}
                  onClick={() => toggleMarkiert(msg.id)}
                  title={isMarked ? "Markierung entfernen" : "Für KI markieren"}
                />
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Eingabe */}
      {!disabled && (
        <div className="bg-white border-t border-gray-200 px-4 py-3 relative">
          <TemplatePicker
            visible={pickerVisible}
            filter={templateFilter}
            filtered={filtered}
            selectedIndex={selectedIndex}
            onSelect={handleTemplateSelect}
          />
          <form onSubmit={handleSend}>
            <div className="flex items-center gap-2">
              <input
                className="flex-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Antwort an Kunden... (/ für Vorlagen)"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={onFocus}
              />
              <button
                type="submit"
                className="bg-primary text-white text-sm px-4 py-2 rounded-md hover:opacity-90 transition disabled:opacity-50"
                disabled={sending || !input.trim()}
              >
                {sending ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  "Senden"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
