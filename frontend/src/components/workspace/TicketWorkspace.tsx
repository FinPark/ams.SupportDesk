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
  rolle: string
  inhalt_markdown: string
  created_at: string
  uebernommen?: boolean
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

  // WebSocket
  const onWsMessage = useCallback((data: any) => {
    if (data.type === "neue_nachricht" && data.nachricht) {
      setNachrichten((prev) => {
        if (prev.some((n) => n.id === data.nachricht.id)) return prev
        return [...prev, data.nachricht]
      })
    }
  }, [])

  useWebSocket(
    ticketId ? `/api/v1/ws/ticket/${ticketId}` : "",
    onWsMessage
  )

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

    const kiMsg: KINachricht = {
      id: `ctx-${Date.now()}`,
      rolle: "supporter",
      inhalt_markdown: `Kontext aus dem Kundengespräch:\n\n${kontext}`,
      created_at: new Date().toISOString(),
    }
    setKiNachrichten((prev) => [...prev, kiMsg])

    // Phase 2: Hier würde die KI-Anfrage an ams-connections gehen
    // Für jetzt: Platzhalter-Antwort
    setTimeout(() => {
      const antwort: KINachricht = {
        id: `ki-${Date.now()}`,
        rolle: "ki",
        inhalt_markdown:
          "*(KI-Anbindung wird in Phase 2 aktiviert)*\n\n" +
          "Sobald ams-connections konfiguriert ist, werde ich den Kontext analysieren " +
          "und Lösungsvorschläge liefern.",
        created_at: new Date().toISOString(),
      }
      setKiNachrichten((prev) => [...prev, antwort])
    }, 500)
  }

  // Direkte KI-Frage
  const handleSendKIMessage = async (text: string) => {
    const msg: KINachricht = {
      id: `q-${Date.now()}`,
      rolle: "supporter",
      inhalt_markdown: text,
      created_at: new Date().toISOString(),
    }
    setKiNachrichten((prev) => [...prev, msg])

    // Phase 2: Echte KI-Anfrage
    setTimeout(() => {
      const antwort: KINachricht = {
        id: `ki-${Date.now()}`,
        rolle: "ki",
        inhalt_markdown:
          "*(KI-Anbindung wird in Phase 2 aktiviert)*\n\n" +
          "Die Anfrage wurde gespeichert. Nach Aktivierung der KI-Integration " +
          "über ams-connections wird hier die Antwort erscheinen.",
        created_at: new Date().toISOString(),
      }
      setKiNachrichten((prev) => [...prev, antwort])
    }, 500)
  }

  // KI-Antwort in Kundenchat übernehmen
  const handleUebernehmen = (kiMsg: KINachricht) => {
    // Markiere als übernommen
    setKiNachrichten((prev) =>
      prev.map((n) => (n.id === kiMsg.id ? { ...n, uebernommen: true } : n))
    )
    // Text ins Kundenchat-Eingabefeld könnte man machen, aber einfacher:
    // Direkt als Supporter-Nachricht senden
    handleSendToKunde(kiMsg.inhalt_markdown)
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
          <Text fontSize="sm" color="gray.500" flexShrink={0}>│</Text>
          <Text fontWeight="medium" fontSize="sm" flexShrink={0}>
            {ticket.kunde_name}
          </Text>
          <Text fontSize="sm" color="gray.500" flexShrink={0}>│</Text>
          <Text fontSize="sm" lineClamp={1} flex={1} minW={0}>
            {ticket.titel}
          </Text>
          <Text fontSize="sm" color="gray.500" flexShrink={0}>│</Text>
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
        <Box flex={1} minW={0}>
          <KundenChat
            nachrichten={nachrichten}
            onSend={handleSendToKunde}
            onSendToKI={handleSendToKI}
            disabled={isClosed}
          />
        </Box>

        {/* Rechts: KI-Recherche */}
        <Box flex={1} minW={0}>
          <KIChat
            nachrichten={kiNachrichten}
            onSend={handleSendKIMessage}
            onUebernehmen={handleUebernehmen}
            kontextInfo={ticket.titel}
          />
        </Box>
      </Box>
    </Box>
  )
}
