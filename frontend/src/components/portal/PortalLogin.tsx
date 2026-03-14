import { useState } from "react"
import { Box, Button, Heading, Input, Text, VStack } from "@chakra-ui/react"
import api from "@/lib/api"

interface Props {
  onIdentified: (kundeId: string, name: string, ticketId?: string) => void
}

export default function PortalLogin({ onIdentified }: Props) {
  const [name, setName] = useState("")
  const [ticketNr, setTicketNr] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError("")
    try {
      const { data } = await api.post("/portal/identify", {
        name: name.trim(),
        ticket_nr: ticketNr.trim() || null,
      })
      onIdentified(
        data.kunde_id,
        data.name,
        data.ticket?.id || undefined
      )
    } catch {
      setError("Identifikation fehlgeschlagen")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="gray.50"
    >
      <Box bg="white" p={8} borderRadius="xl" shadow="lg" w="full" maxW="400px">
        <VStack gap={6}>
          <Heading size="lg" color="blue.500">
            Support-Portal
          </Heading>
          <Text color="gray.500" textAlign="center">
            Geben Sie Ihren Namen ein, um den Chat zu starten
          </Text>
          <form onSubmit={handleSubmit} style={{ width: "100%" }}>
            <VStack gap={4}>
              <Input
                placeholder="Ihr Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                size="lg"
                autoFocus
              />
              <Input
                placeholder="Ticket-Nr. (optional)"
                value={ticketNr}
                onChange={(e) => setTicketNr(e.target.value)}
                size="lg"
              />
              {error && <Text color="red.500" fontSize="sm">{error}</Text>}
              <Button
                type="submit"
                colorPalette="blue"
                size="lg"
                w="full"
                loading={loading}
              >
                Chat starten
              </Button>
            </VStack>
          </form>
        </VStack>
      </Box>
    </Box>
  )
}
