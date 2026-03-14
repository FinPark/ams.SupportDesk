import { useEffect, useCallback } from "react"
import { Box, Heading, Text, VStack } from "@chakra-ui/react"
import { useEingangskorb } from "@/hooks/useTickets"
import { useWebSocket } from "@/hooks/useWebSocket"
import EingangskorbItemCard from "./EingangskorbItem"
import api from "@/lib/api"

interface Props {
  onTicketOpen: (ticketId: string) => void
}

export default function Eingangskorb({ onTicketOpen }: Props) {
  const { items, loading, loadEingangskorb, setItems } = useEingangskorb()

  useEffect(() => {
    loadEingangskorb()
  }, [loadEingangskorb])

  const onWsMessage = useCallback(
    (data: any) => {
      if (data.type === "neues_ticket" || data.type === "neue_nachricht") {
        loadEingangskorb()
      }
      if (data.type === "ticket_uebernommen") {
        setItems((prev) => prev.filter((i) => i.ticket_id !== data.ticket_id))
      }
    },
    [loadEingangskorb, setItems]
  )

  useWebSocket("/api/v1/ws/eingangskorb", onWsMessage)

  const handleUebernehmen = async (ticketId: string) => {
    try {
      await api.post(`/tickets/${ticketId}/uebernehmen`)
      setItems((prev) => prev.filter((i) => i.ticket_id !== ticketId))
      onTicketOpen(ticketId)
    } catch {
      // ignore
    }
  }

  return (
    <Box>
      <Heading size="md" mb={4}>
        Eingangskorb
        {items.length > 0 && (
          <Text as="span" ml={2} fontSize="sm" color="gray.400" fontWeight="normal">
            ({items.length})
          </Text>
        )}
      </Heading>

      {loading && items.length === 0 && (
        <Text color="gray.400">Laden...</Text>
      )}

      {!loading && items.length === 0 && (
        <Box textAlign="center" py={10}>
          <Text color="gray.400">Keine neuen Anfragen</Text>
        </Box>
      )}

      <VStack gap={3} align="stretch">
        {items.map((item) => (
          <EingangskorbItemCard
            key={item.ticket_id}
            item={item}
            onUebernehmen={handleUebernehmen}
          />
        ))}
      </VStack>
    </Box>
  )
}
