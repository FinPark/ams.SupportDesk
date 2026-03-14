import { useState, useEffect, useMemo } from "react"
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
  const [saving, setSaving] = useState(false)
  const [pendingSort, setPendingSort] = useState(false)

  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formUrl, setFormUrl] = useState("")
  const [formTransportType, setFormTransportType] = useState("streamable_http")
  const [formCommand, setFormCommand] = useState("")
  const [formIsActive, setFormIsActive] = useState(false)
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

  useEffect(() => { loadServers() }, [])

  // Sortierung: aktive oben, inaktive unten, alphabetisch innerhalb
  const sortedServers = useMemo(() => {
    return [...servers].sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [servers])

  const resetForm = () => {
    setFormName(""); setFormDescription(""); setFormUrl("")
    setFormTransportType("streamable_http"); setFormCommand("")
    setFormIsActive(false); setFormIsRag(false)
  }

  const startEdit = (s: MCPServer) => {
    setEditingId(s.id); setShowCreate(false)
    setFormName(s.name); setFormDescription(s.description || "")
    setFormUrl(s.url || ""); setFormTransportType(s.transport_type)
    setFormCommand(s.command || ""); setFormIsActive(s.is_active)
    setFormIsRag(s.is_rag)
  }

  const startCreate = () => { setEditingId(null); setShowCreate(true); resetForm() }
  const cancelEdit = () => { setEditingId(null); setShowCreate(false); resetForm() }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        name: formName, description: formDescription, url: formUrl,
        transport_type: formTransportType, command: formCommand,
        is_active: formIsActive, is_rag: formIsRag,
      }
      if (editingId) {
        await api.put(`/admin/mcp-server/${editingId}`, payload)
      } else {
        await api.post("/admin/mcp-server", payload)
      }
      cancelEdit(); await loadServers()
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("MCP-Server wirklich löschen?")) return
    try { await api.delete(`/admin/mcp-server/${id}`); await loadServers() } catch { /* ignore */ }
  }

  const handleToggleActive = async (s: MCPServer) => {
    // Sofort visuell toggeln
    setServers((prev) => prev.map((srv) => srv.id === s.id ? { ...srv, is_active: !srv.is_active } : srv))
    try {
      await api.put(`/admin/mcp-server/${s.id}`, { is_active: !s.is_active })
      // Nach 2 Sekunden neu laden (für Sortierung)
      setPendingSort(true)
      setTimeout(async () => {
        await loadServers()
        setPendingSort(false)
      }, 2000)
    } catch {
      // Rollback
      setServers((prev) => prev.map((srv) => srv.id === s.id ? { ...srv, is_active: s.is_active } : srv))
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try { await api.post("/admin/mcp-server/sync"); await loadServers() } catch { /* ignore */ } finally { setSyncing(false) }
  }

  const renderForm = () => (
    <Box bg="white" p={4} borderRadius="md" borderWidth={1} borderColor="blue.200" mb={4}>
      <Heading size="sm" mb={3}>
        {editingId ? "MCP-Server bearbeiten" : "Neuen MCP-Server erstellen"}
      </Heading>
      <VStack gap={3} align="stretch">
        <HStack gap={3}>
          <Box flex={1}>
            <Text fontSize="sm" fontWeight="medium" mb={1}>Name</Text>
            <Input value={formName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormName(e.target.value)} placeholder="Servername" size="sm" bg="#EDF2F7" />
          </Box>
          <Box flex={1}>
            <Text fontSize="sm" fontWeight="medium" mb={1}>Transport-Typ</Text>
            <select value={formTransportType} onChange={(e) => setFormTransportType(e.target.value)}
              style={{ width: "100%", padding: "6px 12px", border: "1px solid #E2E8F0", borderRadius: "6px", fontSize: "14px", backgroundColor: "#EDF2F7" }}>
              {TRANSPORT_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
          </Box>
        </HStack>
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1}>Beschreibung</Text>
          <Input value={formDescription} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormDescription(e.target.value)} placeholder="Beschreibung" size="sm" bg="#EDF2F7" />
        </Box>
        <HStack gap={3}>
          <Box flex={1}>
            <Text fontSize="sm" fontWeight="medium" mb={1}>URL</Text>
            <Input value={formUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormUrl(e.target.value)} placeholder="http://..." size="sm" bg="#EDF2F7" />
          </Box>
          <Box flex={1}>
            <Text fontSize="sm" fontWeight="medium" mb={1}>Command</Text>
            <Input value={formCommand} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormCommand(e.target.value)} placeholder="Startbefehl (optional)" size="sm" bg="#EDF2F7" />
          </Box>
        </HStack>
        <HStack gap={4}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
            <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} /> Aktiv
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
            <input type="checkbox" checked={formIsRag} onChange={(e) => setFormIsRag(e.target.checked)} /> RAG-Server
          </label>
        </HStack>
        <HStack gap={2}>
          <Button size="sm" colorPalette="blue" onClick={handleSave} loading={saving} disabled={!formName.trim()}>
            {editingId ? "Speichern" : "Erstellen"}
          </Button>
          <Button size="sm" variant="ghost" onClick={cancelEdit}>Abbrechen</Button>
        </HStack>
      </VStack>
    </Box>
  )

  if (loading) return <Text color="gray.400">MCP-Server werden geladen...</Text>

  return (
    <Box maxW="900px" mx="auto">
      <HStack justify="space-between" mb={4}>
        <Heading size="md">MCP-Server</Heading>
        <HStack gap={2}>
          <Button size="sm" colorPalette="blue" variant="outline" onClick={handleSync} loading={syncing}>THoster Sync</Button>
          <Button size="sm" colorPalette="blue" onClick={startCreate}>+ Neuer Server</Button>
        </HStack>
      </HStack>

      {showCreate && renderForm()}

      {servers.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Text color="gray.400" mb={2}>Keine MCP-Server konfiguriert.</Text>
          <Text fontSize="sm" color="gray.400">Erstelle einen neuen Server oder nutze den THoster Sync.</Text>
        </Box>
      ) : (
        <VStack gap={2} align="stretch">
          {sortedServers.map((s) => (
            <Box key={s.id}>
              {editingId === s.id ? renderForm() : (
                <Box
                  bg="white" px={4} py={3} borderRadius="md"
                  borderWidth={1} borderColor={s.is_active ? "green.200" : "gray.200"}
                  borderLeftWidth={4} borderLeftColor={s.is_active ? "green.400" : "gray.300"}
                  opacity={s.is_active ? 1 : 0.6}
                  cursor="pointer"
                  _hover={{ shadow: "sm", borderColor: "blue.200" }}
                  transition="all 0.3s ease"
                  onClick={() => startEdit(s)}
                >
                  <HStack justify="space-between" align="center">
                    <Box flex={1} minW={0}>
                      <HStack gap={2} mb={1}>
                        <Text fontWeight="bold" fontSize="sm">{s.name}</Text>
                        <Badge colorPalette="blue" size="sm" variant="subtle">{s.transport_type}</Badge>
                        {s.is_rag && <Badge colorPalette="purple" size="sm" variant="subtle">RAG</Badge>}
                      </HStack>
                      {s.description && <Text fontSize="xs" color="gray.500" lineClamp={1}>{s.description}</Text>}
                    </Box>
                    <HStack gap={2} flexShrink={0} onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="xs"
                        variant={s.is_active ? "solid" : "outline"}
                        colorPalette={s.is_active ? "green" : "gray"}
                        onClick={() => handleToggleActive(s)}
                        minW="70px"
                      >
                        {s.is_active ? "Aktiv" : "Inaktiv"}
                      </Button>
                      <Box
                        as="button"
                        p={1}
                        borderRadius="md"
                        color="gray.400"
                        _hover={{ color: "red.500", bg: "red.50" }}
                        transition="all 0.15s"
                        onClick={() => handleDelete(s.id)}
                        title="Löschen"
                        display="flex"
                        alignItems="center"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </Box>
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
