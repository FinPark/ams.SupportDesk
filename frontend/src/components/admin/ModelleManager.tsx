import { useState, useEffect } from "react"
import { Box, Button, Heading, HStack, Text, Badge, VStack } from "@chakra-ui/react"
import api from "@/lib/api"

interface Modell {
  id: string
  name: string
  provider_type: string
  model_name: string
  endpoint_url: string
  is_active: boolean
  security_level: string
  context_window: number
  cost_per_1k_input: number | null
  cost_per_1k_output: number | null
  capabilities: Record<string, boolean>
  description: string | null
  has_api_key: boolean
}

const CAP_LABELS: Record<string, string> = {
  tool_use: "Tools",
  vision: "Vision",
  web_search: "Web-Suche",
  extended_thinking: "Denken",
  code_execution: "Code",
}

export default function ModelleManager() {
  const [modelle, setModelle] = useState<Modell[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string>("")

  const loadModelle = async () => {
    try {
      setLoading(true)
      const { data } = await api.get("/admin/modelle")
      setModelle(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  // Gespeichertes Standard-Modell laden
  useEffect(() => {
    const loadSelected = async () => {
      try {
        const { data } = await api.get("/admin/settings")
        const setting = data.find((s: any) => s.key === "default_model_id")
        if (setting) setSelectedId(setting.value)
      } catch { /* ignore */ }
    }
    loadSelected()
    loadModelle()
  }, [])

  const handleSelect = async (modelId: string) => {
    setSelectedId(modelId)
    try {
      await api.put(`/admin/settings/default_model_id`, { value: modelId })
    } catch { /* ignore */ }
  }

  if (loading) {
    return <Text color="gray.400">Modelle werden geladen...</Text>
  }

  return (
    <Box maxW="1100px" mx="auto">
      <HStack justify="space-between" mb={4}>
        <Heading size="md">KI-Modelle</Heading>
        <Button size="sm" colorPalette="blue" variant="outline" onClick={loadModelle}>
          Aktualisieren
        </Button>
      </HStack>

      {modelle.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Text color="gray.400" mb={2}>Keine Modelle verfügbar.</Text>
          <Text fontSize="sm" color="gray.400">
            Modelle werden von ams-connections bereitgestellt. Stelle sicher, dass der Dienst erreichbar ist.
          </Text>
        </Box>
      ) : (
        <>
          <Text fontSize="sm" color="gray.500" mb={4}>
            {modelle.length} Modell{modelle.length !== 1 ? "e" : ""} verfügbar. Klicke auf ein Modell, um es als Standard für die KI-Recherche zu setzen.
          </Text>
          <Box
            display="grid"
            gridTemplateColumns="repeat(auto-fill, minmax(340px, 1fr))"
            gap={4}
          >
            {modelle.map((m) => {
              const isInternal = m.security_level === "internal"
              const isSelected = m.id === selectedId
              const caps = Object.entries(m.capabilities || {}).filter(([, v]) => v).map(([k]) => k)

              return (
                <Box
                  key={m.id}
                  bg="white"
                  p={4}
                  borderRadius="md"
                  borderWidth={isSelected ? 2 : 1}
                  borderColor={isSelected ? "blue.400" : "gray.200"}
                  borderLeftWidth={4}
                  borderLeftColor={isInternal ? "green.400" : "orange.400"}
                  cursor="pointer"
                  onClick={() => handleSelect(m.id)}
                  _hover={{ shadow: "md", borderColor: isSelected ? "blue.500" : "blue.200" }}
                  transition="all 0.15s"
                  position="relative"
                >
                  {isSelected && (
                    <Badge
                      colorPalette="blue"
                      size="sm"
                      position="absolute"
                      top={2}
                      right={2}
                    >
                      Standard
                    </Badge>
                  )}

                  <Text fontWeight="bold" fontSize="sm" mb={2}>
                    {m.name}
                  </Text>

                  <VStack gap={1} align="stretch" mb={2}>
                    <HStack gap={2}>
                      <Text fontSize="xs" color="gray.500" w="60px">Provider:</Text>
                      <Text fontSize="xs">{m.provider_type}</Text>
                    </HStack>
                    <HStack gap={2}>
                      <Text fontSize="xs" color="gray.500" w="60px">Modell:</Text>
                      <Text fontSize="xs">{m.model_name}</Text>
                    </HStack>
                    <HStack gap={2}>
                      <Text fontSize="xs" color="gray.500" w="60px">Kontext:</Text>
                      <Text fontSize="xs">{(m.context_window || 0).toLocaleString()} Tokens</Text>
                    </HStack>
                    {m.has_api_key && (
                      <HStack gap={2}>
                        <Text fontSize="xs" color="gray.500" w="60px">API-Key:</Text>
                        <Badge colorPalette="green" size="sm">Konfiguriert</Badge>
                      </HStack>
                    )}
                  </VStack>

                  {m.description && (
                    <Text fontSize="xs" color="gray.400" mb={2}>{m.description}</Text>
                  )}

                  <HStack gap={1} flexWrap="wrap">
                    <Badge colorPalette={isInternal ? "green" : "orange"} size="sm">
                      {isInternal ? "Intern" : "Cloud"}
                    </Badge>
                    {caps.map((cap) => (
                      <Badge key={cap} colorPalette="blue" size="sm" variant="subtle">
                        {CAP_LABELS[cap] || cap}
                      </Badge>
                    ))}
                  </HStack>
                </Box>
              )
            })}
          </Box>
        </>
      )}
    </Box>
  )
}
