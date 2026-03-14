import { useState, useEffect, useMemo } from "react"
import { Box, Button, Heading, HStack, Text, Badge } from "@chakra-ui/react"
import api from "@/lib/api"

interface RAGCollection {
  id?: string
  name: string
  description?: string
  document_count?: number
  total_chunks?: number
}

export default function RAGCollectionManager() {
  const [collections, setCollections] = useState<RAGCollection[]>([])
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set())
  const [info, setInfo] = useState("")
  const [ragServer, setRagServer] = useState("")
  const [loading, setLoading] = useState(true)

  const loadCollections = async () => {
    try {
      setLoading(true)
      setInfo("")
      const [collResp, settingsResp] = await Promise.all([
        api.get("/admin/rag-collections"),
        api.get("/admin/settings"),
      ])
      setCollections(collResp.data.collections || [])
      setRagServer(collResp.data.rag_server || "")
      setInfo(collResp.data.message || "")

      // Aktive Collections aus Settings laden
      const setting = settingsResp.data.find((s: any) => s.key === "rag_active_collections")
      if (setting) {
        try {
          const ids: string[] = JSON.parse(setting.value)
          setActiveIds(new Set(ids))
        } catch { /* ignore */ }
      }
    } catch {
      setInfo("Fehler beim Laden der RAG-Collections.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCollections() }, [])

  // Sortierung: aktive oben, dann alphabetisch
  const sortedCollections = useMemo(() => {
    return [...collections].sort((a, b) => {
      const aActive = activeIds.has(a.id || a.name)
      const bActive = activeIds.has(b.id || b.name)
      if (aActive !== bActive) return aActive ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [collections, activeIds])

  const handleToggle = async (c: RAGCollection) => {
    const key = c.id || c.name
    const newActive = new Set(activeIds)
    if (newActive.has(key)) {
      newActive.delete(key)
    } else {
      newActive.add(key)
    }
    setActiveIds(newActive)

    // In Settings speichern
    try {
      await api.put("/admin/settings/rag_active_collections", {
        value: JSON.stringify(Array.from(newActive)),
      })
    } catch { /* ignore */ }

    // Nach 2 Sekunden neu sortieren
    setTimeout(() => {
      loadCollections()
    }, 2000)
  }

  const isActive = (c: RAGCollection) => activeIds.has(c.id || c.name)

  if (loading) {
    return <Text color="gray.400">RAG-Collections werden geladen...</Text>
  }

  return (
    <Box maxW="1100px" mx="auto">
      <HStack justify="space-between" mb={4}>
        <HStack gap={3}>
          <Heading size="md">RAG-Collections</Heading>
          {ragServer && <Text fontSize="sm" color="gray.400">via {ragServer}</Text>}
          {activeIds.size > 0 && (
            <Badge colorPalette="teal" size="sm">{activeIds.size} aktiv</Badge>
          )}
        </HStack>
        <Button size="sm" colorPalette="blue" variant="outline" onClick={loadCollections}>
          Aktualisieren
        </Button>
      </HStack>

      {info && (
        <Box bg="orange.50" borderWidth={1} borderColor="orange.200" borderRadius="md" p={4} mb={4}>
          <Text fontSize="sm" color="orange.700">{info}</Text>
          <Text fontSize="xs" color="orange.500" mt={1}>
            Tipp: Markiere einen MCP-Server im Tab "MCP-Server" als RAG-Server, damit Collections geladen werden können.
          </Text>
        </Box>
      )}

      {!info && collections.length === 0 && (
        <Box textAlign="center" py={8}>
          <Text color="gray.400" mb={2}>Keine RAG-Collections vorhanden.</Text>
          <Text fontSize="sm" color="gray.400">
            Collections werden vom RAG-Server bereitgestellt.
          </Text>
        </Box>
      )}

      {collections.length > 0 && (
        <>
          <Text fontSize="sm" color="gray.500" mb={4}>
            Aktiviere Collections, die für die KI-Recherche im Support genutzt werden sollen.
          </Text>
          <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={3}>
            {sortedCollections.map((c, i) => {
              const active = isActive(c)
              return (
                <Box
                  key={c.id || i}
                  bg="white"
                  p={4}
                  borderRadius="md"
                  borderWidth={1}
                  borderColor={active ? "teal.200" : "gray.200"}
                  borderLeftWidth={4}
                  borderLeftColor={active ? "teal.400" : "gray.300"}
                  opacity={active ? 1 : 0.6}
                  transition="all 0.3s ease"
                >
                  <HStack justify="space-between" align="start" mb={2}>
                    <Box flex={1} minW={0}>
                      <Text fontWeight="bold" fontSize="sm" color={active ? "teal.700" : "gray.600"}>
                        {c.name}
                      </Text>
                      {c.description && (
                        <Text fontSize="xs" color="gray.500" mt={1}>{c.description}</Text>
                      )}
                    </Box>
                    <Button
                      size="xs"
                      variant={active ? "solid" : "outline"}
                      colorPalette={active ? "teal" : "gray"}
                      onClick={() => handleToggle(c)}
                      minW="70px"
                      flexShrink={0}
                    >
                      {active ? "Aktiv" : "Inaktiv"}
                    </Button>
                  </HStack>
                  <HStack gap={3}>
                    {c.document_count !== undefined && (
                      <HStack gap={1}>
                        <Badge colorPalette="blue" size="sm" variant="subtle">{c.document_count}</Badge>
                        <Text fontSize="xs" color="gray.500">Dokumente</Text>
                      </HStack>
                    )}
                    {c.total_chunks !== undefined && (
                      <HStack gap={1}>
                        <Badge colorPalette="purple" size="sm" variant="subtle">{c.total_chunks}</Badge>
                        <Text fontSize="xs" color="gray.500">Chunks</Text>
                      </HStack>
                    )}
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
