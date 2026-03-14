import { useState, useEffect } from "react"
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
  const [info, setInfo] = useState("")
  const [ragServer, setRagServer] = useState("")
  const [loading, setLoading] = useState(true)

  const loadCollections = async () => {
    try {
      setLoading(true)
      setInfo("")
      const { data } = await api.get("/admin/rag-collections")
      setCollections(data.collections || [])
      setRagServer(data.rag_server || "")
      setInfo(data.message || "")
    } catch {
      setInfo("Fehler beim Laden der RAG-Collections.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCollections()
  }, [])

  if (loading) {
    return <Text color="gray.400">RAG-Collections werden geladen...</Text>
  }

  return (
    <Box maxW="1100px" mx="auto">
      <HStack justify="space-between" mb={4}>
        <HStack gap={3}>
          <Heading size="md">RAG-Collections</Heading>
          {ragServer && <Text fontSize="sm" color="gray.400">via {ragServer}</Text>}
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
        <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={4}>
          {collections.map((c, i) => (
            <Box key={c.id || i} bg="white" p={4} borderRadius="md" borderWidth={1} borderColor="gray.200" borderLeftWidth={4} borderLeftColor="teal.400">
              <Text fontWeight="bold" fontSize="sm" mb={2} color="teal.700">{c.name}</Text>
              {c.description && <Text fontSize="sm" color="gray.600" mb={3}>{c.description}</Text>}
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
          ))}
        </Box>
      )}
    </Box>
  )
}
