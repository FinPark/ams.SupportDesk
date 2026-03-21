import { useState, useEffect, useRef, useCallback } from "react"
import api from "@/lib/api"
import { Ticket, Nachricht, ChatSession } from "@/lib/types"
import { useWebSocket } from "@/hooks/useWebSocket"
import MarkdownRenderer from "@/components/shared/MarkdownRenderer"
import TagEditor from "./TagEditor"

interface Props {
  ticketId: string
  onBack: () => void
}

const STATUS_LABELS: Record<string, string> = {
  eingang: "Eingang",
  in_bearbeitung: "In Bearbeitung",
  wartet: "Wartet",
  geloest: "Gelöst",
  bewertung: "Bewertung",
  geschlossen: "Geschlossen",
}

const STATUS_COLORS: Record<string, string> = {
  eingang: "bg-yellow-100 text-yellow-700",
  in_bearbeitung: "bg-blue-100 text-blue-700",
  wartet: "bg-orange-100 text-orange-700",
  geloest: "bg-green-100 text-green-700",
  bewertung: "bg-purple-100 text-purple-700",
  geschlossen: "bg-gray-100 text-gray-700",
}

const STATUS_BUTTON_COLORS: Record<string, string> = {
  eingang: "border-yellow-300 text-yellow-700 hover:bg-yellow-50",
  in_bearbeitung: "border-blue-300 text-blue-700 hover:bg-blue-50",
  wartet: "border-orange-300 text-orange-700 hover:bg-orange-50",
  geloest: "border-green-300 text-green-700 hover:bg-green-50",
  bewertung: "border-purple-300 text-purple-700 hover:bg-purple-50",
  geschlossen: "border-gray-300 text-gray-700 hover:bg-gray-50",
}

export default function TicketDetail({ ticketId, onBack }: Props) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [nachrichten, setNachrichten] = useState<Nachricht[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Ticket laden
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/tickets/${ticketId}`)
        setTicket(data)
      } catch {
        // ignore
      }
    }
    load()
  }, [ticketId])

  // Sessions + Nachrichten laden
  useEffect(() => {
    const load = async () => {
      try {
        const { data: sessData } = await api.get(`/sessions/${ticketId}`)
        setSessions(sessData)

        // Nachrichten aller Sessions laden
        const allMsgs: Nachricht[] = []
        for (const sess of sessData) {
          const { data: msgs } = await api.get(`/nachrichten/${sess.id}`)
          allMsgs.push(...msgs)
        }
        // Nach Zeitstempel sortieren
        allMsgs.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        setNachrichten(allMsgs)
      } catch {
        // ignore
      }
    }
    load()
  }, [ticketId])

  useEffect(scrollToBottom, [nachrichten])

  // WebSocket
  const onWsMessage = useCallback((data: any) => {
    if (data.type === "neue_nachricht" && data.nachricht) {
      setNachrichten((prev) => {
        if (prev.some((n) => n.id === data.nachricht.id)) return prev
        return [...prev, data.nachricht]
      })
    }
  }, [])

  useWebSocket(`/api/v1/ws/ticket/${ticketId}`, onWsMessage)

  // Nachricht senden
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !sessions[0]) return
    setSending(true)
    try {
      const { data } = await api.post("/nachrichten", {
        session_id: sessions[0].id,
        rolle: "supporter",
        inhalt_markdown: input.trim(),
      })
      setNachrichten((prev) => {
        if (prev.some((n) => n.id === data.id)) return prev
        return [...prev, data]
      })
      setInput("")
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  // Status ändern
  const handleStatusChange = async (newStatus: string) => {
    try {
      const { data } = await api.patch(`/tickets/${ticketId}`, { status: newStatus })
      setTicket(data)
    } catch {
      // ignore
    }
  }

  if (!ticket) return <p className="p-4">Laden...</p>

  // Nächste erlaubte Status-Übergänge
  const nextStatuses: Record<string, string[]> = {
    eingang: ["in_bearbeitung"],
    in_bearbeitung: ["wartet", "geloest"],
    wartet: [],
    geloest: ["bewertung"],
    bewertung: ["geschlossen"],
    geschlossen: [],
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-2">
          <button
            className="hover:bg-gray-50 px-3 py-1 rounded-md text-sm"
            onClick={onBack}
          >
            ← Zurück
          </button>
          <span
            className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${
              STATUS_COLORS[ticket.status] || "bg-gray-100 text-gray-700"
            }`}
          >
            {STATUS_LABELS[ticket.status] || ticket.status}
          </span>
        </div>
        <h3 className="text-lg font-bold">{ticket.titel}</h3>
        <div className="flex items-center mt-1 gap-3 text-sm text-gray-500">
          <span>{ticket.kunde_name}</span>
          {ticket.supporter_kuerzel && <span>· {ticket.supporter_kuerzel}</span>}
          <span>
            · {new Date(ticket.created_at).toLocaleDateString("de-DE")}
          </span>
        </div>

        {/* Tags */}
        <div className="mt-3">
          <TagEditor
            ticketId={ticketId}
            tags={ticket.tags}
            onTagsChange={(tags) => setTicket({ ...ticket, tags })}
          />
        </div>

        {/* Status-Aktionen */}
        {nextStatuses[ticket.status]?.length > 0 && (
          <div className="flex items-center mt-3 gap-2">
            {nextStatuses[ticket.status].map((s) => (
              <button
                key={s}
                className={`border px-4 py-1.5 rounded-md text-sm font-medium ${
                  STATUS_BUTTON_COLORS[s] || "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => handleStatusChange(s)}
              >
                → {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat-Bereich */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
        {nachrichten.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.rolle === "supporter" ? "justify-end" : "justify-start"} mb-3`}
          >
            <div
              className={`max-w-[75%] px-4 py-3 shadow-sm ${
                msg.rolle === "supporter"
                  ? "bg-primary text-white rounded-xl rounded-br-sm"
                  : "bg-white text-gray-800 rounded-xl rounded-bl-sm"
              }`}
            >
              <p className="text-xs font-bold mb-1 opacity-70">
                {msg.rolle === "supporter" ? "Support" : "Kunde"}
              </p>
              <MarkdownRenderer content={msg.inhalt_markdown} />
              <p className="text-xs mt-1 opacity-50 text-right">
                {new Date(msg.created_at).toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Eingabe */}
      {ticket.status !== "geschlossen" && (
        <div className="bg-white border-t border-gray-200 px-4 py-3">
          <form onSubmit={handleSend}>
            <div className="flex items-center gap-2">
              <input
                className="flex-1 border rounded-md px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Antwort an Kunden..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="bg-primary text-white px-4 py-3 rounded-md text-base font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {sending ? "..." : "Senden"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
