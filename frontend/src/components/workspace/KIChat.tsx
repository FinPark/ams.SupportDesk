import { useState, useRef, useEffect } from "react"
import MarkdownRenderer from "@/components/shared/MarkdownRenderer"
import TemplatePicker, { useTemplatePicker } from "@/components/shared/TemplatePicker"

interface KINachricht {
  id: string
  verlauf_id?: string
  rolle: string
  inhalt_markdown: string
  created_at: string
  uebernommen_in_chat?: boolean
}

interface RAGCollection {
  id?: string
  name: string
  description?: string
  document_count?: number
}

interface Props {
  nachrichten: KINachricht[]
  onSend: (text: string) => Promise<void>
  onUebernehmen: (nachricht: KINachricht) => void
  kontextInfo?: string
  loading?: boolean
  ragCollections: RAGCollection[]
  selectedCollections: Set<string>
  onToggleCollection: (collId: string) => void
  onDeleteNachricht: (nachricht: KINachricht) => void
  isActive?: boolean
  onFocus?: () => void
}

export default function KIChat({
  nachrichten, onSend, onUebernehmen, kontextInfo, loading,
  ragCollections, selectedCollections, onToggleCollection, onDeleteNachricht,
  isActive, onFocus,
}: Props) {
  const {
    input, setInput, pickerVisible, templateFilter, filtered, selectedIndex,
    handleInputChange, handleTemplateSelect, handlePickerClose, handleKeyDown,
  } = useTemplatePicker()
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Nach created_at sortieren, damit Kontext immer über KI-Antwort steht
  const sorted = [...nachrichten].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [nachrichten, loading])

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

  const isLoading = loading || sending

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={`px-4 py-2 border-b transition-all duration-200 ${
          isActive ? "border-orange-400 bg-orange-50" : "border-gray-200 bg-white"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`font-bold text-sm ${isActive ? "text-orange-600" : "text-gray-700"}`}>
            KI-Recherche
            <span className={`text-xs ml-2 font-normal ${isActive ? "text-orange-400" : "text-gray-400"}`}>
              (nur intern sichtbar)
            </span>
          </span>
        </div>
        {kontextInfo && (
          <div className="text-xs text-gray-400 mt-1">
            Kontext: &ldquo;{kontextInfo}&rdquo;
          </div>
        )}
        {/* RAG-Collection-Auswahl */}
        {ragCollections.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            <span className="text-xs text-gray-500 mr-1 shrink-0">
              Wissensbasis:
            </span>
            {ragCollections.map((coll) => {
              const collId = coll.id || coll.name
              const isCollActive = selectedCollections.has(collId)
              return (
                <span
                  key={collId}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer select-none transition hover:opacity-80 ${
                    isCollActive
                      ? "bg-primary text-white"
                      : "border border-gray-300 text-gray-600"
                  }`}
                  onClick={() => onToggleCollection(collId)}
                >
                  {coll.name}
                  {coll.document_count != null && (
                    <span className="ml-1 opacity-70">({coll.document_count})</span>
                  )}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* Nachrichten */}
      <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50">
        {nachrichten.length === 0 && !isLoading && (
          <div className="text-center py-10">
            <div className="text-gray-400 text-sm mb-2">
              KI-Recherche-Chat
            </div>
            <div className="text-gray-300 text-xs">
              Markiere Kundennachrichten links und sende sie hierher,
              oder stelle direkt eine Frage.
            </div>
          </div>
        )}
        {sorted.map((msg) => {
          const isKI = msg.rolle === "ki"
          const isKontext = !isKI && msg.inhalt_markdown.startsWith("Kontext aus dem Kundengespräch:")

          // Kontext-Block: zentriert, eigenes Styling
          if (isKontext) {
            return (
              <div key={msg.id} className="mb-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-blue-500">
                      Kontext aus dem Kundengespr&auml;ch
                    </span>
                    <button
                      className="text-xs px-1 min-w-0 text-red-400 hover:text-red-600 transition"
                      onClick={() => onDeleteNachricht(msg)}
                      title="Löschen"
                    >
                      &#128465;
                    </button>
                  </div>
                  <div className="text-sm text-gray-700">
                    <MarkdownRenderer content={msg.inhalt_markdown.replace(/^Kontext aus dem Kundengespräch:\n\n/, "")} />
                  </div>
                  <div className="text-xs mt-1 opacity-50 text-right">
                    {new Date(msg.created_at).toLocaleTimeString("de-DE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div
              key={msg.id}
              className={`flex mb-3 ${isKI ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 shadow-sm ${
                  isKI
                    ? "bg-white text-gray-800 rounded-xl rounded-bl-sm"
                    : "bg-primary text-white rounded-xl rounded-br-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold opacity-60">
                    {isKI ? "KI" : "Supporter"}
                  </span>
                  <div className="flex items-center gap-1">
                    {isKI && (
                      <button
                        className={`text-xs px-2 py-0.5 rounded border transition ${
                          msg.uebernommen_in_chat
                            ? "bg-green-500 text-white border-green-500 cursor-default"
                            : "border-blue-300 text-blue-600 hover:bg-blue-50"
                        }`}
                        onClick={() => !msg.uebernommen_in_chat && onUebernehmen(msg)}
                        disabled={msg.uebernommen_in_chat}
                      >
                        {msg.uebernommen_in_chat ? "Übernommen" : "\u2192 Übernehmen"}
                      </button>
                    )}
                    <button
                      className="text-xs px-1 min-w-0 text-red-400 hover:text-red-600 transition"
                      onClick={() => onDeleteNachricht(msg)}
                      title="Löschen"
                    >
                      &#128465;
                    </button>
                  </div>
                </div>
                <MarkdownRenderer content={msg.inhalt_markdown} />
                <div className="text-xs mt-1 opacity-50 text-right">
                  {new Date(msg.created_at).toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          )
        })}
        {isLoading && (
          <div className="flex justify-start mb-3">
            <div className="bg-white px-4 py-3 rounded-xl rounded-bl-sm shadow-sm">
              <div className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                <span className="text-sm text-gray-500">KI denkt nach...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Eingabe */}
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
              className="flex-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              placeholder="Rückfrage an KI... (/ für Vorlagen)"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={onFocus}
              disabled={isLoading}
            />
            <button
              type="submit"
              className="border border-primary text-primary text-sm px-4 py-2 rounded-md hover:bg-primary hover:text-white transition disabled:opacity-50"
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
              ) : (
                "Senden"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
