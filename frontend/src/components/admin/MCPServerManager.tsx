import { useState, useEffect } from "react"
import { Box, Button, Heading, HStack, Text, VStack, Input, Badge } from "@chakra-ui/react"
import api from "@/lib/api"

interface MCPServer {
  id: string
  name: string
  description: string
  url: string
  transport_type: string
  command: string
  is_active: boolean
  is_rag: boolean
  created_at: string
  updated_at: string
}

const TRANSPORT_OPTIONS = [
  { value: "stdio", label: "stdio" },
  { value: "sse", label: "SSE" },
  { value: "streamable_http", label: "Streamable HTTP" },
]

export default function MCPServerManager() {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formUrl, setFormUrl] = useState("")
  const [formTransportType, setFormTransportType] = useState("stdio")
  const [formCommand, setFormCommand] = useState("")
  const [formIsActive, setFormIsActive] = useState(true)
  const [formIsRag, setFormIsRag] = useState(false)

  const loadServers = async () => {
    try {
      setLoading(true)
      const { data } = await api.get("/admin/mcp-server")
      setServers(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServers()
  }, [])

  const resetForm = () => {
    setFormName("")
    setFormDescription("")
    setFormUrl("")
    setFormTransportType("stdio")
    setFormCommand("")
    setFormIsActive(true)
    setFormIsRag(false)
  }

  const startEdit = (s: MCPServer) => {
    setEditingId(s.id)
    setShowCreate(false)
    setFormName(s.name)
    setFormDescription(s.description)
    setFormUrl(s.url)
    setFormTransportType(s.transport_type)
    setFormCommand(s.command)
    setFormIsActive(s.is_active)
    setFormIsRag(s.is_rag)
  }

  const startCreate = () => {
    setEditingId(null)
    setShowCreate(true)
    resetForm()
  }

  const cancelEdit = () => {
    setEditingId(null)
    setShowCreate(false)
    resetForm()
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        name: formName,
        description: formDescription,
        url: formUrl,
        transport_type: formTransportType,
        command: formCommand,
        is_active: formIsActive,
        is_rag: formIsRag,
      }
      if (editingId) {
        await api.put(`/admin/mcp-server/${editingId}`, payload)
      } else {
        await api.post("/admin/mcp-server", payload)
      }
      cancelEdit()
      await loadServers()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/mcp-server/${id}`)
      setDeleteConfirmId(null)
      await loadServers()
    } catch {
      // ignore
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      await api.post("/admin/mcp-server/sync")
      await loadServers()
    } catch {
      // ignore
    } finally {
      setSyncing(false)
    }
  }

  const renderForm = () => (
    <Box bg="white" p={4} borderRadius="md" borderWidth={1} borderColor="gray.200" mb={4}>
      <Heading size="sm" mb={3}>
        {editingId ? "MCP-Server bearbeiten" : "Neuen MCP-Server erstellen"}
      </Heading>
      <VStack gap={3} align="stretch">
        <HStack gap={3}>
          <Box flex={1}>
            <Text fontSize="sm" fontWeight="medium" mb={1}>Name</Text>
            <Input
              value={formName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormName(e.target.value)}
              placeholder="Servername"
              size="sm"
            />
          </Box>
          <Box flex={1}>
            <Text fontSize="sm" fontWeight="medium" mb={1}>Transport-Typ</Text>
            <select
              value={formTransportType}
              onChange={(e) => setFormTransportType(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 12px",
                border: "1px solid #E2E8F0",
                borderRadius: "6px",
                fontSize: "14px",
                backgroundColor: "white",
              }}
            >
              {TRANSPORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Box>
        </HStack>
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1}>Beschreibung</Text>
          <Input
            value={formDescription}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormDescription(e.target.value)}
            placeholder="Beschreibung des Servers"
            size="sm"
          />
        </Box>
        <HStack gap={3}>
          <Box flex={1}>
            <Text fontSize="sm" fontWeight="medium" mb={1}>URL</Text>
            <Input
              value={formUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormUrl(e.target.value)}
              placeholder="http://..."
              size="sm"
            />
          </Box>
          <Box flex={1}>
            <Text fontSize="sm" fontWeight="medium" mb={1}>Command</Text>
            <Input
              value={formCommand}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormCommand(e.target.value)}
              placeholder="Startbefehl (optional)"
              size="sm"
            />
          </Box>
        </HStack>
        <HStack gap={4}>
          <HStack gap={2}>
            <input
              type="checkbox"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
            />
            <Text fontSize="sm">Aktiv</Text>
          </HStack>
          <HStack gap={2}>
            <input
              type="checkbox"
              checked={formIsRag}
              onChange={(e) => setFormIsRag(e.target.checked)}
            />
            <Text fontSize="sm">RAG-Server</Text>
          </HStack>
        </HStack>
        <HStack gap={2}>
          <Button
            size="sm"
            colorPalette="blue"
            onClick={handleSave}
            loading={saving}
            disabled={!formName.trim()}
          >
            {editingId ? "Speichern" : "Erstellen"}
          </Button>
          <Button size="sm" variant="ghost" onClick={cancelEdit}>
            Abbrechen
          </Button>
        </HStack>
      </VStack>
    </Box>
  )

  if (loading) {
    return <Text color="gray.400">MCP-Server werden geladen...</Text>
  }

  return (
    <Box maxW="900px" mx="auto">
      <HStack justify="space-between" mb={4}>
        <Heading size="md">MCP-Server</Heading>
        <HStack gap={2}>
          <Button
            size="sm"
            colorPalette="blue"
            variant="outline"
            onClick={handleSync}
            loading={syncing}
          >
            THoster Sync
          </Button>
          <Button size="sm" colorPalette="blue" onClick={startCreate}>
            + Neuer Server
          </Button>
        </HStack>
      </HStack>

      {showCreate && renderForm()}

      {servers.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Text color="gray.400" mb={2}>Keine MCP-Server konfiguriert.</Text>
          <Text fontSize="sm" color="gray.400">
            Erstelle einen neuen Server oder nutze den THoster Sync.
          </Text>
        </Box>
      ) : (
        <VStack gap={2} align="stretch">
          {servers.map((s) => (
            <Box key={s.id}>
              {editingId === s.id ? (
                renderForm()
              ) : (
                <Box
                  bg="white"
                  p={3}
                  borderRadius="md"
                  borderWidth={1}
                  borderColor="gray.200"
                  opacity={s.is_active ? 1 : 0.6}
                >
                  <HStack justify="space-between" align="start">
                    <Box flex={1} minW={0}>
                      <HStack gap={2} mb={1}>
                        <Box
                          w="8px"
                          h="8px"
                          borderRadius="full"
                          bg={s.is_active ? "green.400" : "gray.300"}
                          flexShrink={0}
                        />
                        <Text fontWeight="bold" fontSize="sm">
                          {s.name}
                        </Text>
                        <Badge colorPalette="blue" size="sm" variant="subtle">
                          {s.transport_type}
                        </Badge>
                        {s.is_rag && (
                          <Badge colorPalette="purple" size="sm" variant="subtle">
                            RAG
                          </Badge>
                        )}
                        {!s.is_active && (
                          <Badge colorPalette="gray" size="sm">Inaktiv</Badge>
                        )}
                      </HStack>
                      {s.description && (
                        <Text fontSize="sm" color="gray.600" mb={1}>
                          {s.description}
                        </Text>
                      )}
                      {s.url && (
                        <Text fontSize="xs" color="gray.400">
                          {s.url}
                        </Text>
                      )}
                      {s.command && (
                        <Text fontSize="xs" color="gray.400" fontFamily="mono">
                          {s.command}
                        </Text>
                      )}
                    </Box>
                    <HStack gap={1} flexShrink={0}>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => startEdit(s)}
                      >
                        Bearbeiten
                      </Button>
                      {deleteConfirmId === s.id ? (
                        <HStack gap={1}>
                          <Button
                            size="xs"
                            colorPalette="red"
                            onClick={() => handleDelete(s.id)}
                          >
                            Ja, löschen
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setDeleteConfirmId(null)}
                          >
                            Nein
                          </Button>
                        </HStack>
                      ) : (
                        <Button
                          size="xs"
                          variant="ghost"
                          color="red.500"
                          onClick={() => setDeleteConfirmId(s.id)}
                        >
                          Löschen
                        </Button>
                      )}
                    </HStack>
                  </HStack>
                </Box>
              )}
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  )
}
