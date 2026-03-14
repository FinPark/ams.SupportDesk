import { useEffect, useState } from "react"
import { Badge, Box, Button, HStack, Text, VStack } from "@chakra-ui/react"
import { useTickets } from "@/hooks/useTickets"
import { Supporter, Ticket } from "@/lib/types"

interface Props {
  supporter: Supporter
  onTicketSelect: (ticketId: string) => void
  selectedTicketId?: string
}

type Tab = "eingangskorb" | "meine" | "alle"

const STATUS_COLORS: Record<string, string> = {
  eingang: "yellow",
  in_bearbeitung: "blue",
  wartet: "orange",
  geloest: "green",
  bewertung: "purple",
  geschlossen: "gray",
}

export default function TicketList({ supporter, onTicketSelect, selectedTicketId }: Props) {
  const [tab, setTab] = useState<Tab>("meine")
  const { tickets, loading, loadTickets } = useTickets()

  useEffect(() => {
    const params: Record<string, string> = {}
    if (tab === "eingangskorb") params.status = "eingang"
    if (tab === "meine") params.supporter_id = supporter.id
    loadTickets(params)
  }, [tab, supporter.id, loadTickets])

  return (
    <Box h="100%" display="flex" flexDirection="column">
      {/* Tabs */}
      <HStack px={3} py={2} borderBottomWidth={1} borderColor="gray.200" gap={1}>
        {(["meine", "eingangskorb", "alle"] as Tab[]).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={tab === t ? "solid" : "ghost"}
            colorPalette={tab === t ? "blue" : undefined}
            onClick={() => setTab(t)}
          >
            {t === "meine" ? "Meine" : t === "eingangskorb" ? "Eingang" : "Alle"}
          </Button>
        ))}
      </HStack>

      {/* Ticket-Liste */}
      <Box flex={1} overflowY="auto">
        {loading && tickets.length === 0 && (
          <Text p={4} color="gray.400" fontSize="sm">Laden...</Text>
        )}
        {!loading && tickets.length === 0 && (
          <Text p={4} color="gray.400" fontSize="sm" textAlign="center">
            Keine Tickets
          </Text>
        )}
        <VStack gap={0} align="stretch">
          {tickets.map((ticket) => (
            <Box
              key={ticket.id}
              px={3}
              py={3}
              cursor="pointer"
              bg={selectedTicketId === ticket.id ? "blue.50" : "transparent"}
              borderBottomWidth={1}
              borderColor="gray.100"
              _hover={{ bg: "blue.50" }}
              onClick={() => onTicketSelect(ticket.id)}
              transition="background 0.15s"
            >
              <HStack justify="space-between" mb={1}>
                <Text
                  fontSize="sm"
                  fontWeight="medium"
                  lineClamp={1}
                  flex={1}
                >
                  {ticket.titel}
                </Text>
                <HStack gap={2} flexShrink={0}>
                  <Badge
                    size="sm"
                    colorPalette={STATUS_COLORS[ticket.status]}
                  >
                    {ticket.status}
                  </Badge>
                  <Text fontSize="xs" color="blue.400">→</Text>
                </HStack>
              </HStack>
              <HStack fontSize="xs" color="gray.400" gap={2}>
                <Text>{ticket.kunde_name}</Text>
                {ticket.supporter_kuerzel && <Text>· {ticket.supporter_kuerzel}</Text>}
                <Text>
                  · {new Date(ticket.updated_at).toLocaleDateString("de-DE")}
                </Text>
              </HStack>
              {ticket.tags.length > 0 && (
                <HStack mt={1} gap={1} flexWrap="wrap">
                  {ticket.tags.slice(0, 3).map((t) => (
                    <Badge key={t.id} size="sm" variant="outline" colorPalette="blue">
                      #{t.tag}
                    </Badge>
                  ))}
                </HStack>
              )}
            </Box>
          ))}
        </VStack>
      </Box>
    </Box>
  )
}
