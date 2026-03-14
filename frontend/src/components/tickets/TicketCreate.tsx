import { useState, useEffect } from "react"
import { Box, Button, Heading, HStack, Input, VStack, Text } from "@chakra-ui/react"
import api from "@/lib/api"
import { Kunde } from "@/lib/types"

interface Props {
  onCreated: (ticketId: string) => void
  onCancel: () => void
}

export default function TicketCreate({ onCreated, onCancel }: Props) {
  const [kunden, setKunden] = useState<Kunde[]>([])
  const [kundeSearch, setKundeSearch] = useState("")
  const [selectedKunde, setSelectedKunde] = useState<Kunde | null>(null)
  const [titel, setTitel] = useState("")
  const [tags, setTags] = useState("")
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [creatingKunde, setCreatingKunde] = useState(false)

  useEffect(() => {
    const search = async () => {
      if (!kundeSearch.trim()) {
        setKunden([])
        setSearched(false)
        return
      }
      try {
        const { data } = await api.get("/kunden", { params: { q: kundeSearch } })
        setKunden(data)
        setSearched(true)
      } catch {
        setSearched(true)
      }
    }
    const timer = setTimeout(search, 300)
    return () => clearTimeout(timer)
  }, [kundeSearch])

  const handleCreateKunde = async () => {
    if (!kundeSearch.trim()) return
    setCreatingKunde(true)
    try {
      const { data } = await api.post("/kunden", { name: kundeSearch.trim() })
      setSelectedKunde(data)
      setKundeSearch("")
      setKunden([])
      setSearched(false)
    } catch {
      // ignore
    } finally {
      setCreatingKunde(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedKunde || !titel.trim()) return
    setLoading(true)
    try {
      const tagList = tags
        .split(/[\s,]+/)
        .map((t) => t.replace(/^#/, "").trim().toLowerCase())
        .filter(Boolean)

      const { data } = await api.post("/tickets", {
        kunde_id: selectedKunde.id,
        titel: titel.trim(),
        tags: tagList,
      })
      onCreated(data.id)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box bg="white" p={6} borderRadius="lg" shadow="md">
      <Heading size="md" mb={4}>Neues Ticket</Heading>
      <form onSubmit={handleSubmit}>
        <VStack gap={4} align="stretch">
          {/* Kunde suchen oder anlegen */}
          {!selectedKunde ? (
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={1} color="gray.600">
                Kunde
              </Text>
              <Input
                placeholder="Kunde suchen oder neu anlegen..."
                value={kundeSearch}
                onChange={(e) => setKundeSearch(e.target.value)}
                autoFocus
              />
              {kunden.length > 0 && (
                <Box mt={1} borderWidth={1} borderRadius="md" maxH="200px" overflowY="auto">
                  {kunden.map((k) => (
                    <Box
                      key={k.id}
                      px={3}
                      py={2}
                      cursor="pointer"
                      _hover={{ bg: "blue.50" }}
                      onClick={() => {
                        setSelectedKunde(k)
                        setKundeSearch("")
                        setKunden([])
                        setSearched(false)
                      }}
                    >
                      <Text fontSize="sm" fontWeight="medium">{k.name}</Text>
                      {k.kundennummer && (
                        <Text fontSize="xs" color="gray.400">{k.kundennummer}</Text>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
              {searched && kunden.length === 0 && kundeSearch.trim() && (
                <Box mt={2} p={3} bg="gray.50" borderRadius="md">
                  <Text fontSize="sm" color="gray.500" mb={2}>
                    Kein Kunde "{kundeSearch}" gefunden.
                  </Text>
                  <Button
                    size="sm"
                    colorPalette="blue"
                    variant="outline"
                    onClick={handleCreateKunde}
                    loading={creatingKunde}
                  >
                    "{kundeSearch.trim()}" als neuen Kunden anlegen
                  </Button>
                </Box>
              )}
            </Box>
          ) : (
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={1} color="gray.600">
                Kunde
              </Text>
              <Box p={3} bg="blue.50" borderRadius="md" display="flex" alignItems="center" justifyContent="space-between">
                <Text fontSize="sm" fontWeight="medium">
                  {selectedKunde.name}
                  {selectedKunde.kundennummer && (
                    <Text as="span" color="gray.500" ml={2}>({selectedKunde.kundennummer})</Text>
                  )}
                </Text>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setSelectedKunde(null)}
                >
                  ändern
                </Button>
              </Box>
            </Box>
          )}

          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="gray.600">
              Titel
            </Text>
            <Input
              placeholder="Worum geht es?"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
            />
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="gray.600">
              Tags (optional)
            </Text>
            <Input
              placeholder="z.B. erp rechte artikel"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </Box>

          <HStack justify="flex-end" gap={2}>
            <Button variant="ghost" onClick={onCancel}>Abbrechen</Button>
            <Button
              type="submit"
              colorPalette="blue"
              loading={loading}
              disabled={!selectedKunde || !titel.trim()}
            >
              Ticket erstellen
            </Button>
          </HStack>
        </VStack>
      </form>
    </Box>
  )
}
