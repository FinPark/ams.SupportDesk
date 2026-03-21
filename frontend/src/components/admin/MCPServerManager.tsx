import { useState, useEffect, useMemo } from "react"
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
    if (!confirm("MCP-Server wirklich loeschen?")) return
    try { await api.delete(`/admin/mcp-server/${id}`); await loadServers() } catch { /* ignore */ }
  }

  const handleToggleActive = async (s: MCPServer) => {
    setServers((prev) => prev.map((srv) => srv.id === s.id ? { ...srv, is_active: !srv.is_active } : srv))
    try {
      await api.put(`/admin/mcp-server/${s.id}`, { is_active: !s.is_active })
      setPendingSort(true)
      setTimeout(async () => {
        await loadServers()
        setPendingSort(false)
      }, 2000)
    } catch {
      setServers((prev) => prev.map((srv) => srv.id === s.id ? { ...srv, is_active: s.is_active } : srv))
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try { await api.post("/admin/mcp-server/sync"); await loadServers() } catch { /* ignore */ } finally { setSyncing(false) }
  }

  const renderForm = () => (
    <div className="bg-white p-4 rounded-md border border-blue-200 mb-4">
      <h3 className="text-sm font-semibold mb-3">
        {editingId ? "MCP-Server bearbeiten" : "Neuen MCP-Server erstellen"}
      </h3>
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Name</label>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Servername"
              className="w-full border rounded-md px-3 py-2 text-sm bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Transport-Typ</label>
            <select
              value={formTransportType}
              onChange={(e) => setFormTransportType(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {TRANSPORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Beschreibung</label>
          <input
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Beschreibung"
            className="w-full border rounded-md px-3 py-2 text-sm bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">URL</label>
            <input
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="http://..."
              className="w-full border rounded-md px-3 py-2 text-sm bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Command</label>
            <input
              value={formCommand}
              onChange={(e) => setFormCommand(e.target.value)}
              placeholder="Startbefehl (optional)"
              className="w-full border rounded-md px-3 py-2 text-sm bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} /> Aktiv
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={formIsRag} onChange={(e) => setFormIsRag(e.target.checked)} /> RAG-Server
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            onClick={handleSave}
            disabled={saving || !formName.trim()}
          >
            {saving ? "..." : editingId ? "Speichern" : "Erstellen"}
          </button>
          <button className="px-4 py-2 rounded-md text-sm hover:bg-gray-50" onClick={cancelEdit}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )

  if (loading) return <span className="text-gray-400">MCP-Server werden geladen...</span>

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">MCP-Server</h2>
        <div className="flex items-center gap-2">
          <button
            className="border border-primary text-primary px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/5 disabled:opacity-50"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? "..." : "THoster Sync"}
          </button>
          <button
            className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
            onClick={startCreate}
          >
            + Neuer Server
          </button>
        </div>
      </div>

      {showCreate && renderForm()}

      {servers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-2">Keine MCP-Server konfiguriert.</p>
          <p className="text-sm text-gray-400">Erstelle einen neuen Server oder nutze den THoster Sync.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedServers.map((s) => (
            <div key={s.id}>
              {editingId === s.id ? renderForm() : (
                <div
                  className={`bg-white px-4 py-3 rounded-md cursor-pointer transition-all duration-300 hover:shadow-sm hover:border-blue-200 ${
                    s.is_active ? "opacity-100" : "opacity-60"
                  }`}
                  style={{
                    border: `1px solid ${s.is_active ? "#bbf7d0" : "#e5e7eb"}`,
                    borderLeftWidth: "4px",
                    borderLeftColor: s.is_active ? "#4ade80" : "#d1d5db",
                  }}
                  onClick={() => startEdit(s)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm">{s.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                          {s.transport_type}
                        </span>
                        {s.is_rag && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600">
                            RAG
                          </span>
                        )}
                      </div>
                      {s.description && (
                        <p className="text-xs text-gray-500 truncate">{s.description}</p>
                      )}
                    </div>
                    <div
                      className="flex items-center gap-2 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className={`px-3 py-1 rounded-md text-xs font-medium min-w-[70px] ${
                          s.is_active
                            ? "bg-green-500 text-white hover:bg-green-600"
                            : "border border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                        onClick={() => handleToggleActive(s)}
                      >
                        {s.is_active ? "Aktiv" : "Inaktiv"}
                      </button>
                      <button
                        className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150 flex items-center"
                        onClick={() => handleDelete(s.id)}
                        title="Loeschen"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
