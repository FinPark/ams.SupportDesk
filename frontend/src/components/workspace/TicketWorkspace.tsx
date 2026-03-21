import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import api from "@/lib/api"
import { Ticket, Nachricht, ChatSession, Supporter } from "@/lib/types"
import { useWebSocket } from "@/hooks/useWebSocket"
import TagEditor from "@/components/tickets/TagEditor"
import KundenChat from "./KundenChat"
import KIChat from "./KIChat"

interface KINachricht {
  id: string
  verlauf_id?: string
  rolle: string
  inhalt_markdown: string
  created_at: string
  uebernommen_in_chat?: boolean
}

interface KIVerlauf {
  id: string
  session_id: string
  provider: string
  model_used: string
}

interface RAGCollection {
  id?: string
  name: string
  description?: string
  document_count?: number
}

const STATUS_LABELS: Record<string, string> = {
  eingang: "Eingang",
  in_bearbeitung: "In Bearbeitung",
  wartet: "Wartet",
  geloest: "Gelöst",
  bewertung: "Bewertung",
  geschlossen: "Geschlossen",
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  eingang: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
  in_bearbeitung: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
  wartet: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
  geloest: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
  bewertung: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300" },
  geschlossen: { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-300" },
}

const NEXT_STATUSES: Record<string, string[]> = {
  eingang: ["in_bearbeitung"],
  in_bearbeitung: ["wartet", "geloest"],
  wartet: [],
  geloest: ["bewertung"],
  bewertung: ["geschlossen"],
  geschlossen: [],
}

interface Props {
  supporter: Supporter
  onLogout: () => void
}

export default function TicketWorkspace({ supporter, onLogout }: Props) {
  const { ticketId } = useParams<{ ticketId: string }>()
  const navigate = useNavigate()

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [nachrichten, setNachrichten] = useState<Nachricht[]>([])
  const [kiNachrichten, setKiNachrichten] = useState<KINachricht[]>([])
  const [kiVerlauf, setKiVerlauf] = useState<KIVerlauf | null>(null)
  const [kiLoading, setKiLoading] = useState(false)
  const [ragCollections, setRagCollections] = useState<RAGCollection[]>([])
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set())
  const [activePanel, setActivePanel] = useState<"kunde" | "ki" | null>(null)

  // Ticket laden
  useEffect(() => {
    if (!ticketId) return
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
    if (!ticketId) return
    const load = async () => {
      try {
        const { data: sessData } = await api.get(`/sessions/${ticketId}`)
        setSessions(sessData)

        const allMsgs: Nachricht[] = []
        for (const sess of sessData) {
          const { data: msgs } = await api.get(`/nachrichten/${sess.id}`)
          allMsgs.push(...msgs)
        }
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

  // KI-Verlauf laden
  useEffect(() => {
    if (!ticketId) return
    const load = async () => {
      try {
        const { data } = await api.get(`/ki-recherche/${ticketId}`)
        if (data && data.id) {
          setKiVerlauf(data)
          const { data: msgs } = await api.get(`/ki-recherche/${data.id}/nachrichten`)
          setKiNachrichten(msgs)
        }
      } catch {
        // ignore
      }
    }
    load()
  }, [ticketId])

  // RAG-Collections laden — nur die in Settings aktivierten anzeigen
  useEffect(() => {
    const load = async () => {
      try {
        const [collResp, settingsResp] = await Promise.all([
          api.get("/admin/rag-collections"),
          api.get("/admin/settings"),
        ])
        const allColls: RAGCollection[] = collResp.data.collections || []
        const settings = settingsResp.data || []
        const activeSetting = settings.find((s: any) => s.key === "rag_active_collections")

        let activeIds: string[] = []
        if (activeSetting?.value) {
          try {
            activeIds = JSON.parse(activeSetting.value)
          } catch {
            // ignore
          }
        }

        // Nur aktivierte Collections anzeigen
        const activeSet = new Set(activeIds)
        const filtered = allColls.filter((c) => activeSet.has(c.id || c.name))
        setRagCollections(filtered)

        // Alle aktivierten vorselektieren
        setSelectedCollections(new Set(filtered.map((c) => c.id || c.name)))
      } catch {
        // ignore
      }
    }
    load()
  }, [])

  // WebSocket
  const onWsMessage = useCallback((data: any) => {
    if (data.type === "neue_nachricht" && data.nachricht) {
      setNachrichten((prev) => {
        if (prev.some((n) => n.id === data.nachricht.id)) return prev
        return [...prev, data.nachricht]
      })
    }
    if (data.type === "ki_nachricht" && data.nachricht) {
      setKiNachrichten((prev) => {
        if (prev.some((n) => n.id === data.nachricht.id)) return prev
        return [...prev, data.nachricht]
      })
    }
    if (data.type === "nachricht_geloescht" && data.nachricht_id) {
      setNachrichten((prev) => prev.filter((n) => n.id !== data.nachricht_id))
    }
  }, [])

  useWebSocket(
    ticketId ? `/api/v1/ws/ticket/${ticketId}` : "",
    onWsMessage
  )

  // KI-Verlauf sicherstellen (lazy-init beim ersten KI-Call)
  const ensureVerlauf = async (): Promise<string | null> => {
    if (kiVerlauf) return kiVerlauf.id
    if (!ticketId) return null

    try {
      const { data } = await api.post(`/ki-recherche/${ticketId}`)
      setKiVerlauf(data)
      return data.id
    } catch (err: any) {
      if (err.response?.status === 409) {
        try {
          const { data } = await api.get(`/ki-recherche/${ticketId}`)
          if (data?.id) {
            setKiVerlauf(data)
            return data.id
          }
        } catch {
          // ignore
        }
      }
      return null
    }
  }

  // Nachricht an KI senden (intern)
  const sendToKI = async (text: string) => {
    const verlaufId = await ensureVerlauf()
    if (!verlaufId) return

    setKiLoading(true)
    try {
      const { data } = await api.post(`/ki-recherche/${verlaufId}/nachrichten`, {
        inhalt_markdown: text,
        collection_ids: selectedCollections.size > 0
          ? Array.from(selectedCollections)
          : undefined,
      })
      setKiNachrichten((prev) => {
        const ids = new Set(prev.map((n) => n.id))
        const newMsgs = [...prev]
        if (data.supporter_nachricht && !ids.has(data.supporter_nachricht.id)) {
          newMsgs.push(data.supporter_nachricht)
        }
        if (data.ki_nachricht && !ids.has(data.ki_nachricht.id)) {
          newMsgs.push(data.ki_nachricht)
        }
        return newMsgs
      })
    } catch (err) {
      console.error("KI-Anfrage fehlgeschlagen:", err)
    } finally {
      setKiLoading(false)
    }
  }

  // Nachricht an Kunden senden
  const handleSendToKunde = async (text: string) => {
    if (!sessions[0]) return
    const { data } = await api.post("/nachrichten", {
      session_id: sessions[0].id,
      rolle: "supporter",
      inhalt_markdown: text,
    })
    setNachrichten((prev) => {
      if (prev.some((n) => n.id === data.id)) return prev
      return [...prev, data]
    })
  }

  // Markierte Nachrichten an KI-Chat senden
  const handleSendToKI = (markierte: Nachricht[]) => {
    const hasMultipleRoles = new Set(markierte.map((m) => m.rolle)).size > 1

    const kontext = markierte
      .map((m) => {
        if (hasMultipleRoles) {
          return `**${m.rolle === "kunde" ? "Kunde" : "Support"}:**\n${m.inhalt_markdown}`
        }
        return m.inhalt_markdown
      })
      .join("\n\n---\n\n")

    sendToKI(`Kontext aus dem Kundengespräch:\n\n${kontext}`)
  }

  // Direkte KI-Frage
  const handleSendKIMessage = async (text: string) => {
    await sendToKI(text)
  }

  // KI-Antwort in Kundenchat übernehmen
  const handleUebernehmen = async (kiMsg: KINachricht) => {
    if (kiMsg.verlauf_id) {
      try {
        await api.patch(`/ki-recherche/${kiMsg.verlauf_id}/nachrichten/${kiMsg.id}/uebernehmen`)
      } catch {
        // ignore
      }
    }

    setKiNachrichten((prev) =>
      prev.map((n) => (n.id === kiMsg.id ? { ...n, uebernommen_in_chat: true } : n))
    )

    handleSendToKunde(kiMsg.inhalt_markdown)
  }

  // KI-Nachricht löschen — bei KI-Antwort auch den Kontext davor mitlöschen
  const handleDeleteKINachricht = async (msg: KINachricht) => {
    if (!msg.verlauf_id) return
    try {
      const idsToDelete = [msg.id]

      // Wenn es eine KI-Antwort ist, Kontext-Nachricht direkt davor finden
      if (msg.rolle === "ki") {
        const sorted = [...kiNachrichten].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        const idx = sorted.findIndex((n) => n.id === msg.id)
        if (idx > 0) {
          const prev = sorted[idx - 1]
          if (prev.rolle === "supporter" && prev.inhalt_markdown.startsWith("Kontext aus dem Kundengespräch:")) {
            idsToDelete.push(prev.id)
            if (prev.verlauf_id) {
              await api.delete(`/ki-recherche/${prev.verlauf_id}/nachrichten/${prev.id}`).catch(() => {})
            }
          }
        }
      }

      await api.delete(`/ki-recherche/${msg.verlauf_id}/nachrichten/${msg.id}`)
      setKiNachrichten((prev) => prev.filter((n) => !idsToDelete.includes(n.id)))
    } catch {
      // ignore
    }
  }

  // Supporter-Nachricht im Kundenchat löschen
  const handleDeleteNachricht = async (msg: Nachricht) => {
    try {
      await api.delete(`/nachrichten/${msg.id}`)
      setNachrichten((prev) => prev.filter((n) => n.id !== msg.id))
    } catch {
      // ignore
    }
  }

  // RAG-Collection toggle
  const toggleCollection = (collId: string) => {
    setSelectedCollections((prev) => {
      const next = new Set(prev)
      if (next.has(collId)) next.delete(collId)
      else next.add(collId)
      return next
    })
  }

  // Status ändern
  const handleStatusChange = async (newStatus: string) => {
    if (!ticketId) return
    try {
      const { data } = await api.patch(`/tickets/${ticketId}`, { status: newStatus })
      setTicket(data)
    } catch {
      // ignore
    }
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-gray-400">Laden...</span>
      </div>
    )
  }

  const isClosed = ticket.status === "geschlossen"

  return (
    <div className="h-screen flex flex-col">
      {/* Workspace Header */}
      <div className="bg-primary text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2
            className="text-lg font-bold cursor-pointer"
            onClick={() => navigate("/")}
          >
            ams.SupportDesk
          </h2>
          <button
            className="text-sm text-white hover:bg-white/10 px-2 py-1 rounded"
            onClick={() => navigate("/")}
          >
            &larr; Tickets
          </button>
          <div className="w-px h-5 bg-white/40" />
          <button
            className="text-sm text-white/80 hover:bg-white/10 px-2 py-1 rounded"
            onClick={() => window.open("/portal", "_blank")}
          >
            Kunden-Portal
          </button>
          <button
            className="text-sm text-white/80 hover:bg-white/10 px-2 py-1 rounded"
            onClick={() => navigate("/statistik")}
          >
            Statistik
          </button>
          <button
            className="text-sm text-white/80 hover:bg-white/10 px-2 py-1 rounded"
            onClick={() => navigate("/admin")}
          >
            Admin
          </button>
          <button
            className="text-sm text-white/80 hover:bg-white/10 px-2 py-1 rounded"
            onClick={() => navigate("/hilfe")}
          >
            Hilfe
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">{supporter.kuerzel}</span>
          <button
            className="text-sm text-white hover:bg-white/10 px-2 py-1 rounded"
            onClick={onLogout}
          >
            Abmelden
          </button>
        </div>
      </div>

      {/* Ticket-Info Bar */}
      <div className="px-4 py-2 bg-white border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="font-bold text-sm text-primary shrink-0">
            {supporter.kuerzel}
          </span>
          <span className="text-sm text-gray-500 shrink-0">|</span>
          <span className="font-bold text-sm text-primary shrink-0">
            #{ticket.nummer}
          </span>
          <span className="text-sm text-gray-500 shrink-0">|</span>
          <span className="font-medium text-sm shrink-0">
            {ticket.kunde_name}
          </span>
          <span className="text-sm text-gray-500 shrink-0">|</span>
          <span className="text-sm truncate flex-1 min-w-0">
            {ticket.titel}
          </span>
          <span className="text-sm text-gray-500 shrink-0">|</span>
          <div className="flex items-center gap-1 shrink-0">
            <TagEditor
              ticketId={ticketId!}
              tags={ticket.tags}
              onTagsChange={(tags) => setTicket({ ...ticket, tags })}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(NEXT_STATUSES[ticket.status] || []).map((s) => {
            const colors = STATUS_COLORS[s] || STATUS_COLORS.eingang
            return (
              <button
                key={s}
                className={`text-xs px-2 py-1 rounded border ${colors.border} ${colors.text} hover:opacity-80 transition`}
                onClick={() => handleStatusChange(s)}
              >
                &rarr; {STATUS_LABELS[s]}
              </button>
            )
          })}
          {(() => {
            const colors = STATUS_COLORS[ticket.status] || STATUS_COLORS.eingang
            return (
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
                {STATUS_LABELS[ticket.status] || ticket.status}
              </span>
            )
          })()}
        </div>
      </div>

      {/* Split-Layout: Kundenchat | KI-Chat */}
      <div className="flex-1 flex overflow-hidden">
        {/* Links: Kundengespräch */}
        <div
          className={`flex-1 min-w-0 transition-all duration-200 ${
            activePanel === "kunde" ? "border-3 border-blue-400" : ""
          }`}
        >
          <KundenChat
            nachrichten={nachrichten}
            onSend={handleSendToKunde}
            onSendToKI={handleSendToKI}
            onDeleteNachricht={handleDeleteNachricht}
            disabled={isClosed}
            isActive={activePanel === "kunde"}
            onFocus={() => setActivePanel("kunde")}
          />
        </div>

        {/* Rechts: KI-Recherche */}
        <div
          className={`flex-1 min-w-0 transition-all duration-200 ${
            activePanel === "ki" ? "border-3 border-orange-400" : ""
          }`}
        >
          <KIChat
            nachrichten={kiNachrichten}
            onSend={handleSendKIMessage}
            onUebernehmen={handleUebernehmen}
            onDeleteNachricht={handleDeleteKINachricht}
            kontextInfo={ticket.titel}
            loading={kiLoading}
            ragCollections={ragCollections}
            selectedCollections={selectedCollections}
            onToggleCollection={toggleCollection}
            isActive={activePanel === "ki"}
            onFocus={() => setActivePanel("ki")}
          />
        </div>
      </div>
    </div>
  )
}
