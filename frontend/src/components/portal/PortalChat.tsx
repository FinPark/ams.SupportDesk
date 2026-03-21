import { useState, useEffect, useRef, useCallback } from "react"
import api from "@/lib/api"
import { Nachricht } from "@/lib/types"
import { useWebSocket } from "@/hooks/useWebSocket"
import PortalMessageBubble from "./PortalMessageBubble"

interface Props {
  kundeId: string
  kundeName: string
  ticketId?: string
  ticketNummer?: number
  onBack: () => void
}

export default function PortalChat({ kundeId, kundeName, ticketId: initialTicketId, ticketNummer: initialNummer, onBack }: Props) {
  const [ticketId, setTicketId] = useState(initialTicketId || "")
  const [ticketNummer, setTicketNummer] = useState<number | null>(initialNummer || null)
  const [nachrichten, setNachrichten] = useState<Nachricht[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [needsTicket, setNeedsTicket] = useState(!initialTicketId)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // WebSocket für Live-Updates
  const onWsMessage = useCallback((data: any) => {
    if (data.type === "neue_nachricht" && data.nachricht) {
      setNachrichten((prev) => {
        // Duplikat vermeiden
        if (prev.some((n) => n.id === data.nachricht.id)) return prev
        return [...prev, data.nachricht]
      })
    }
  }, [])

  useWebSocket(
    ticketId ? `/api/v1/ws/ticket/${ticketId}` : "",
    onWsMessage
  )

  // Nachrichten laden
  useEffect(() => {
    if (!ticketId) return
    const load = async () => {
      try {
        const { data } = await api.get(`/portal/tickets/${ticketId}/nachrichten`, {
          params: { kunde_id: kundeId },
        })
        setNachrichten(data)
      } catch {
        // ignore
      }
    }
    load()
  }, [ticketId, kundeId])

  useEffect(scrollToBottom, [nachrichten])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    setSending(true)

    try {
      if (needsTicket) {
        // Neues Ticket erstellen
        const { data } = await api.post("/portal/tickets", {
          kunde_id: kundeId,
          nachricht: input.trim(),
          titel: input.trim().slice(0, 80),
        })
        setTicketId(data.ticket_id)
        setTicketNummer(data.ticket_nummer)
        setNeedsTicket(false)
        // Nachrichten laden
        const msgResp = await api.get(`/portal/tickets/${data.ticket_id}/nachrichten`, {
          params: { kunde_id: kundeId },
        })
        setNachrichten(msgResp.data)
      } else {
        // Nachricht an bestehendes Ticket senden
        const { data } = await api.post(`/portal/tickets/${ticketId}/nachrichten`, {
          kunde_id: kundeId,
          inhalt_markdown: input.trim(),
        })
        setNachrichten((prev) => {
          if (prev.some((n) => n.id === data.id)) return prev
          return [...prev, data]
        })
      }
      setInput("")
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-primary text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-lg font-bold">ams.SupportDesk</h3>
            <span className="text-sm opacity-80">
              {kundeName} {ticketNummer ? `· Ticket #${ticketNummer}` : ticketId ? `· Ticket` : "· Neue Anfrage"}
            </span>
          </div>
          <button
            className="text-white hover:bg-white/10 px-3 py-1 rounded-md text-sm"
            onClick={onBack}
          >
            Zurück
          </button>
        </div>
      </div>

      {/* Nachrichten */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {nachrichten.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-400">
              {needsTicket
                ? "Beschreiben Sie Ihr Anliegen..."
                : "Noch keine Nachrichten"}
            </p>
          </div>
        )}
        {nachrichten.map((n) => (
          <PortalMessageBubble key={n.id} nachricht={n} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Eingabe */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <form onSubmit={handleSend}>
          <div className="flex items-center gap-2">
            <input
              className="flex-1 border rounded-md px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder={needsTicket ? "Beschreiben Sie Ihr Anliegen..." : "Nachricht schreiben..."}
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
    </div>
  )
}
