import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Badge, Box, Button, Heading, HStack, Text } from "@chakra-ui/react"
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

const STATUS_COLORS: Record<string, string> = {
  eingang: "yellow",
  in_bearbeitung: "blue",
  wartet: "orange",
  geloest: "green",
  bewertung: "purple",
  geschlossen: "gray",
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
    const kontext = markierte
      .map((m) => `**${m.rolle === "kunde" ? "Kunde" : "Support"}:**\n${m.inhalt_markdown}`)
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
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <Text color="gray.400">Laden...</Text>
      </Box>
    )
  }

  const isClosed = ticket.status === "geschlossen"

  return (
    <Box h="100vh" display="flex" flexDirection="column">
      {/* Workspace Header */}
      <Box
        bg="blue.500"
        color="white"
        px={4}
        py={2}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
      >
        <HStack gap={4}>
          <Heading
            size="md"
            cursor="pointer"
            onClick={() => navigate("/")}
          >
            ams.SupportDesk
          </Heading>
          <Button
            variant="ghost"
            size="sm"
            color="white"
            onClick={() => navigate("/")}
          >
            ← Tickets
          </Button>
          <Box w="1px" h="20px" bg="whiteAlpha.400" />
          <Button
            variant="ghost"
            size="sm"
            color="white"
            opacity={0.8}
            onClick={() => window.open("/portal", "_blank")}
          >
            Kunden-Portal
          </Button>
          <Button
            variant="ghost"
            size="sm"
            color="white"
            opacity={0.8}
            onClick={() => navigate("/admin")}
          >
            Admin
          </Button>
        </HStack>
        <HStack gap={3}>
          <Text fontSize="sm">{supporter.kuerzel}</Text>
          <Button variant="ghost" size="sm" color="white" onClick={onLogout}>
            Abmelden
          </Button>
        </HStack>
      </Box>

      {/* Ticket-Info Bar */}
      <Box
        px={4}
        py={2}
        bg="white"
        borderBottomWidth={1}
        borderColor="gray.200"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={4}
        flexWrap="wrap"
      >
        <HStack gap={3} flex={1} minW={0}>
          <Text fontWeight="bold" fontSize="sm" color="blue.600" flexShrink={0}>
            {supporter.kuerzel}
          </Text>
          <Text fontSize="sm" color="gray.500" flexShrink={0}>|</Text>
          <Text fontWeight="bold" fontSize="sm" color="blue.500" flexShrink={0}>
            #{ticket.nummer}
          </Text>
          <Text fontSize="sm" color="gray.500" flexShrink={0}>|</Text>
          <Text fontWeight="medium" fontSize="sm" flexShrink={0}>
            {ticket.kunde_name}
          </Text>
          <Text fontSize="sm" color="gray.500" flexShrink={0}>|</Text>
          <Text fontSize="sm" lineClamp={1} flex={1} minW={0}>
            {ticket.titel}
          </Text>
          <Text fontSize="sm" color="gray.500" flexShrink={0}>|</Text>
          <HStack gap={1} flexShrink={0}>
            <TagEditor
              ticketId={ticketId!}
              tags={ticket.tags}
              onTagsChange={(tags) => setTicket({ ...ticket, tags })}
            />
          </HStack>
        </HStack>

        <HStack gap={2} flexShrink={0}>
          {(NEXT_STATUSES[ticket.status] || []).map((s) => (
            <Button
              key={s}
              size="xs"
              variant="outline"
              colorPalette={STATUS_COLORS[s]}
              onClick={() => handleStatusChange(s)}
            >
              → {STATUS_LABELS[s]}
            </Button>
          ))}
          <Badge colorPalette={STATUS_COLORS[ticket.status]} size="lg">
            {STATUS_LABELS[ticket.status] || ticket.status}
          </Badge>
        </HStack>
      </Box>

      {/* Split-Layout: Kundenchat | KI-Chat */}
      <Box flex={1} display="flex" overflow="hidden">
        {/* Links: Kundengespräch */}
        <Box
          flex={1}
          minW={0}
          borderWidth={activePanel === "kunde" ? 3 : 0}
          borderColor="blue.400"
          transition="all 0.2s"
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
        </Box>

        {/* Rechts: KI-Recherche */}
        <Box
          flex={1}
          minW={0}
          borderWidth={activePanel === "ki" ? 3 : 0}
          borderColor="orange.400"
          transition="all 0.2s"
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
        </Box>
      </Box>
    </Box>
  )
}
