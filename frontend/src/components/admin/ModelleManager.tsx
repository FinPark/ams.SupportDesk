import { useState, useEffect } from "react"
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
    return <span className="text-gray-400">Modelle werden geladen...</span>
  }

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">KI-Modelle</h2>
        <button
          className="border border-primary text-primary px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/5"
          onClick={loadModelle}
        >
          Aktualisieren
        </button>
      </div>

      {modelle.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-2">Keine Modelle verfuegbar.</p>
          <p className="text-sm text-gray-400">
            Modelle werden von ams-connections bereitgestellt. Stelle sicher, dass der Dienst erreichbar ist.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {modelle.length} Modell{modelle.length !== 1 ? "e" : ""} verfuegbar. Klicke auf ein Modell, um es als Standard fuer die KI-Recherche zu setzen.
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
            {modelle.map((m) => {
              const isInternal = m.security_level === "internal"
              const isSelected = m.id === selectedId
              const caps = Object.entries(m.capabilities || {}).filter(([, v]) => v).map(([k]) => k)

              return (
                <div
                  key={m.id}
                  className={`bg-white p-4 rounded-md cursor-pointer transition-all duration-150 relative hover:shadow-md ${
                    isSelected
                      ? "border-2 border-blue-400 hover:border-blue-500"
                      : "border border-gray-200 hover:border-blue-200"
                  }`}
                  style={{
                    borderLeftWidth: "4px",
                    borderLeftColor: isInternal ? "#4ade80" : "#fb923c",
                  }}
                  onClick={() => handleSelect(m.id)}
                >
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 absolute top-2 right-2">
                      Standard
                    </span>
                  )}

                  <p className="font-bold text-sm mb-2">{m.name}</p>

                  <div className="flex flex-col gap-1 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-[60px]">Provider:</span>
                      <span className="text-xs">{m.provider_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-[60px]">Modell:</span>
                      <span className="text-xs">{m.model_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-[60px]">Kontext:</span>
                      <span className="text-xs">{(m.context_window || 0).toLocaleString()} Tokens</span>
                    </div>
                    {m.has_api_key && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-[60px]">API-Key:</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Konfiguriert</span>
                      </div>
                    )}
                  </div>

                  {m.description && (
                    <p className="text-xs text-gray-400 mb-2">{m.description}</p>
                  )}

                  <div className="flex items-center gap-1 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        isInternal ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {isInternal ? "Intern" : "Cloud"}
                    </span>
                    {caps.map((cap) => (
                      <span key={cap} className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                        {CAP_LABELS[cap] || cap}
                      </span>
                    ))}
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
