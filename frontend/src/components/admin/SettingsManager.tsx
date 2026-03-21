import { useState, useEffect } from "react"
import api from "@/lib/api"

interface Setting {
  key: string
  value: string
}

// Keys die in eigenen Tabs verwaltet werden
const HIDDEN_KEYS = new Set(["ki_system_prompt"])

export default function SettingsManager() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [editState, setEditState] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [addSaving, setAddSaving] = useState(false)

  const loadSettings = async () => {
    try {
      setLoading(true)
      const { data } = await api.get("/admin/settings")
      setSettings(data)
      const state: Record<string, string> = {}
      for (const s of data) {
        state[s.key] = s.value
      }
      setEditState(state)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSave = async (key: string) => {
    setSavingKey(key)
    try {
      await api.put(`/admin/settings/${encodeURIComponent(key)}`, {
        value: editState[key],
      })
      await loadSettings()
    } catch {
      // ignore
    } finally {
      setSavingKey(null)
    }
  }

  const handleAdd = async () => {
    if (!newKey.trim()) return
    setAddSaving(true)
    try {
      await api.put(`/admin/settings/${encodeURIComponent(newKey)}`, {
        value: newValue,
      })
      setNewKey("")
      setNewValue("")
      setShowAdd(false)
      await loadSettings()
    } catch {
      // ignore
    } finally {
      setAddSaving(false)
    }
  }

  const hasChanged = (key: string) => {
    const original = settings.find((s) => s.key === key)
    return original ? editState[key] !== original.value : false
  }

  const visibleSettings = settings.filter((s) => !HIDDEN_KEYS.has(s.key))

  if (loading) {
    return <span className="text-gray-400">Einstellungen werden geladen...</span>
  }

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Einstellungen</h2>
        <button
          className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
          onClick={() => setShowAdd(!showAdd)}
        >
          + Neue Einstellung
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-4 rounded-md border border-gray-200 mb-4">
          <h3 className="text-sm font-semibold mb-3">Neue Einstellung</h3>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Schluessel</label>
              <input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="einstellung.name"
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="flex-[2]">
              <label className="text-sm font-medium mb-1 block">Wert</label>
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Wert"
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <button
              className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              onClick={handleAdd}
              disabled={addSaving || !newKey.trim()}
            >
              {addSaving ? "..." : "Hinzufuegen"}
            </button>
            <button
              className="px-4 py-2 rounded-md text-sm hover:bg-gray-50"
              onClick={() => setShowAdd(false)}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {visibleSettings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-2">Keine Einstellungen vorhanden.</p>
          <p className="text-sm text-gray-400">
            Fuege eine neue Einstellung ueber den Button oben hinzu.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleSettings.map((s) => (
            <div
              key={s.key}
              className="bg-white p-3 rounded-md border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <div className="min-w-[200px] shrink-0">
                  <span className="text-sm font-bold font-mono">{s.key}</span>
                </div>
                <input
                  className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  value={editState[s.key] ?? ""}
                  onChange={(e) =>
                    setEditState((prev) => ({ ...prev, [s.key]: e.target.value }))
                  }
                />
                {hasChanged(s.key) && (
                  <button
                    className="bg-primary text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50 shrink-0"
                    onClick={() => handleSave(s.key)}
                    disabled={savingKey === s.key}
                  >
                    {savingKey === s.key ? "..." : "Speichern"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
