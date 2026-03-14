import { useState, useEffect, useRef, useCallback } from "react"
import { Box, Button, Heading, HStack, Input, Text, VStack } from "@chakra-ui/react"
import api from "@/lib/api"
import { Nachricht } from "@/lib/types"
import { useWebSocket } from "@/hooks/useWebSocket"
import PortalMessageBubble from "./PortalMessageBubble"

interface Props {
  kundeId: string
  kundeName: string
  ticketId?: string
  onBack: () => void
}

export default function PortalChat({ kundeId, kundeName, ticketId: initialTicketId, onBack }: Props) {
  const [ticketId, setTicketId] = useState(initialTicketId || "")
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
    <Box minH="100vh" display="flex" flexDirection="column" bg="gray.50">
      {/* Header */}
      <Box bg="blue.500" color="white" px={4} py={3}>
        <HStack justify="space-between">
          <VStack align="start" gap={0}>
            <Heading size="md">ams.SupportDesk</Heading>
            <Text fontSize="sm" opacity={0.8}>
              {kundeName} {ticketId ? `· Ticket ${ticketId.slice(0, 8)}...` : "· Neue Anfrage"}
            </Text>
          </VStack>
          <Button variant="ghost" color="white" size="sm" onClick={onBack}>
            Zurück
          </Button>
        </HStack>
      </Box>

      {/* Nachrichten */}
      <Box flex={1} overflowY="auto" px={4} py={4}>
        {nachrichten.length === 0 && (
          <Box textAlign="center" py={10}>
            <Text color="gray.400">
              {needsTicket
                ? "Beschreiben Sie Ihr Anliegen..."
                : "Noch keine Nachrichten"}
            </Text>
          </Box>
        )}
        {nachrichten.map((n) => (
          <PortalMessageBubble key={n.id} nachricht={n} />
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {/* Eingabe */}
      <Box bg="white" borderTopWidth={1} borderColor="gray.200" px={4} py={3}>
        <form onSubmit={handleSend}>
          <HStack>
            <Input
              placeholder={needsTicket ? "Beschreiben Sie Ihr Anliegen..." : "Nachricht schreiben..."}
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
    </Box>
  )
}
