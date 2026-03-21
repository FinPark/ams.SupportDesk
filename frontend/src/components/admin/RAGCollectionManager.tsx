import { useState, useEffect, useMemo } from "react"
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

    try {
      await api.put("/admin/settings/rag_active_collections", {
        value: JSON.stringify(Array.from(newActive)),
      })
    } catch { /* ignore */ }

    setTimeout(() => {
      loadCollections()
    }, 2000)
  }

  const isActive = (c: RAGCollection) => activeIds.has(c.id || c.name)

  if (loading) {
    return <span className="text-gray-400">RAG-Collections werden geladen...</span>
  }

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">RAG-Collections</h2>
          {ragServer && <span className="text-sm text-gray-400">via {ragServer}</span>}
          {activeIds.size > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
              {activeIds.size} aktiv
            </span>
          )}
        </div>
        <button
          className="border border-primary text-primary px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/5"
          onClick={loadCollections}
        >
          Aktualisieren
        </button>
      </div>

      {info && (
        <div className="bg-orange-50 border border-orange-200 rounded-md p-4 mb-4">
          <p className="text-sm text-orange-700">{info}</p>
          <p className="text-xs text-orange-500 mt-1">
            Tipp: Markiere einen MCP-Server im Tab "MCP-Server" als RAG-Server, damit Collections geladen werden koennen.
          </p>
        </div>
      )}

      {!info && collections.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-2">Keine RAG-Collections vorhanden.</p>
          <p className="text-sm text-gray-400">
            Collections werden vom RAG-Server bereitgestellt.
          </p>
        </div>
      )}

      {collections.length > 0 && (
        <>
          <p className="text-sm text-gray-500 mb-4">
            Aktiviere Collections, die fuer die KI-Recherche im Support genutzt werden sollen.
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
            {sortedCollections.map((c, i) => {
              const active = isActive(c)
              return (
                <div
                  key={c.id || i}
                  className={`bg-white p-4 rounded-md transition-all duration-300 ${
                    active ? "opacity-100" : "opacity-60"
                  }`}
                  style={{
                    border: `1px solid ${active ? "#99f6e4" : "#e5e7eb"}`,
                    borderLeftWidth: "4px",
                    borderLeftColor: active ? "#2dd4bf" : "#d1d5db",
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${active ? "text-teal-700" : "text-gray-600"}`}>
                        {c.name}
                      </p>
                      {c.description && (
                        <p className="text-xs text-gray-500 mt-1">{c.description}</p>
                      )}
                    </div>
                    <button
                      className={`px-3 py-1 rounded-md text-xs font-medium min-w-[70px] shrink-0 ${
                        active
                          ? "bg-teal-500 text-white hover:bg-teal-600"
                          : "border border-gray-300 text-gray-500 hover:bg-gray-50"
                      }`}
                      onClick={() => handleToggle(c)}
                    >
                      {active ? "Aktiv" : "Inaktiv"}
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.document_count !== undefined && (
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                          {c.document_count}
                        </span>
                        <span className="text-xs text-gray-500">Dokumente</span>
                      </div>
                    )}
                    {c.total_chunks !== undefined && (
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600">
                          {c.total_chunks}
                        </span>
                        <span className="text-xs text-gray-500">Chunks</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
