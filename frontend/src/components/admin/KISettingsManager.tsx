import { useState, useEffect } from "react"
import api from "@/lib/api"

interface Setting {
  key: string
  value: string
}

const PROMPT_KEY = "ki_system_prompt"

const PROMPT_PLACEHOLDERS = [
  { placeholder: "{ticket_titel}", description: "Titel des Tickets" },
  { placeholder: "{kunde_name}", description: "Name des Kunden" },
  { placeholder: "{tags}", description: "Tags des Tickets" },
]

export default function KISettingsManager() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [editValue, setEditValue] = useState("")
  const [saving, setSaving] = useState(false)
  const [defaultPrompt, setDefaultPrompt] = useState("")

  const loadSettings = async () => {
    try {
      setLoading(true)
      const { data } = await api.get("/admin/settings")
      setSettings(data)
      const promptSetting = data.find((s: Setting) => s.key === PROMPT_KEY)
      if (promptSetting) {
        setEditValue(promptSetting.value)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
    api.get("/admin/ki-system-prompt/default").then(({ data }) => {
      setDefaultPrompt(data.prompt)
    }).catch(() => {})
  }, [])

  const promptSetting = settings.find((s) => s.key === PROMPT_KEY)
  const displayValue = editValue || defaultPrompt
  const hasChanged = promptSetting ? editValue !== promptSetting.value : !!editValue

  const handleReset = () => {
    if (window.confirm("Systemprompt wirklich auf den Standard zuruecksetzen? Deine Aenderungen gehen verloren.")) {
      setEditValue(defaultPrompt)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/admin/settings/${encodeURIComponent(PROMPT_KEY)}`, {
        value: editValue || defaultPrompt,
      })
      await loadSettings()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <span className="text-gray-400">KI-Einstellungen werden geladen...</span>
  }

  return (
    <div className="max-w-[900px] mx-auto">
      <h2 className="text-lg font-semibold mb-3">KI-Antwort Systemprompt</h2>
      <p className="text-sm text-gray-500 mb-3">
        Dieser Prompt wird bei jeder KI-Anfrage als System-Prompt gesendet.
        {!promptSetting && " (Aktuell wird der Standard-Prompt verwendet.)"}
      </p>

      {/* Platzhalter-Info */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        {PROMPT_PLACEHOLDERS.map((p) => (
          <div
            key={p.placeholder}
            className="px-2 py-1 bg-blue-50 rounded-md text-xs"
          >
            <span className="font-mono font-bold text-blue-600">
              {p.placeholder}
            </span>
            <span className="text-gray-500 ml-1">
              {p.description}
            </span>
          </div>
        ))}
      </div>

      <textarea
        value={displayValue}
        onChange={(e) => setEditValue(e.target.value)}
        rows={18}
        className={`w-full font-mono text-sm bg-white p-4 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
          hasChanged ? "border-blue-300" : "border-gray-200"
        }`}
      />

      <div className="flex items-center justify-end mt-3 gap-2">
        {defaultPrompt && (
          <button
            className="border px-4 py-2 rounded-md text-sm hover:bg-gray-50"
            onClick={handleReset}
          >
            Auf Standard zuruecksetzen
          </button>
        )}
        {(hasChanged || !promptSetting) && (
          <button
            className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "..." : "Speichern"}
          </button>
        )}
      </div>
    </div>
  )
}
