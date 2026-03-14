import { useState, useEffect, useRef, useCallback } from "react"
import {
  Badge, Box, Button, Heading, HStack, Input, Text, VStack,
} from "@chakra-ui/react"
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
  eingang: "yellow",
  in_bearbeitung: "blue",
  wartet: "orange",
  geloest: "green",
  bewertung: "purple",
  geschlossen: "gray",
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

  if (!ticket) return <Text>Laden...</Text>

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
    <Box display="flex" flexDirection="column" h="100%">
      {/* Header */}
      <Box p={4} borderBottomWidth={1} borderColor="gray.200" bg="white">
        <HStack justify="space-between" mb={2}>
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Zurück
          </Button>
          <Badge colorPalette={STATUS_COLORS[ticket.status]} size="lg">
            {STATUS_LABELS[ticket.status] || ticket.status}
          </Badge>
        </HStack>
        <Heading size="md">{ticket.titel}</Heading>
        <HStack mt={1} gap={3} fontSize="sm" color="gray.500">
          <Text>{ticket.kunde_name}</Text>
          {ticket.supporter_kuerzel && <Text>· {ticket.supporter_kuerzel}</Text>}
          <Text>
            · {new Date(ticket.created_at).toLocaleDateString("de-DE")}
          </Text>
        </HStack>

        {/* Tags */}
        <Box mt={3}>
          <TagEditor
            ticketId={ticketId}
            tags={ticket.tags}
            onTagsChange={(tags) => setTicket({ ...ticket, tags })}
          />
        </Box>

        {/* Status-Aktionen */}
        {nextStatuses[ticket.status]?.length > 0 && (
          <HStack mt={3} gap={2}>
            {nextStatuses[ticket.status].map((s) => (
              <Button
                key={s}
                size="sm"
                variant="outline"
                colorPalette={STATUS_COLORS[s]}
                onClick={() => handleStatusChange(s)}
              >
                → {STATUS_LABELS[s]}
              </Button>
            ))}
          </HStack>
        )}
      </Box>

      {/* Chat-Bereich */}
      <Box flex={1} overflowY="auto" px={4} py={4} bg="gray.50">
        {nachrichten.map((msg) => (
          <Box
            key={msg.id}
            display="flex"
            justifyContent={msg.rolle === "supporter" ? "flex-end" : "flex-start"}
            mb={3}
          >
            <Box
              maxW="75%"
              bg={msg.rolle === "supporter" ? "blue.500" : "white"}
              color={msg.rolle === "supporter" ? "white" : "gray.800"}
              px={4}
              py={3}
              borderRadius="xl"
              borderBottomRightRadius={msg.rolle === "supporter" ? "sm" : "xl"}
              borderBottomLeftRadius={msg.rolle === "supporter" ? "xl" : "sm"}
              shadow="sm"
            >
              <Text fontSize="xs" fontWeight="bold" mb={1} opacity={0.7}>
                {msg.rolle === "supporter" ? "Support" : "Kunde"}
              </Text>
              <MarkdownRenderer content={msg.inhalt_markdown} />
              <Text fontSize="xs" mt={1} opacity={0.5} textAlign="right">
                {new Date(msg.created_at).toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </Box>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {/* Eingabe */}
      {ticket.status !== "geschlossen" && (
        <Box bg="white" borderTopWidth={1} borderColor="gray.200" px={4} py={3}>
          <form onSubmit={handleSend}>
            <HStack>
              <Input
                placeholder="Antwort an Kunden..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                size="lg"
                flex={1}
              />
              <Button
                type="submit"
                colorPalette="blue"
                size="lg"
                loading={sending}
                disabled={!input.trim()}
              >
                Senden
              </Button>
            </HStack>
          </form>
        </Box>
      )}
    </Box>
  )
}
