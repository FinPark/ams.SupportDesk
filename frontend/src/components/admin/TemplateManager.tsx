import { useState, useEffect } from "react"
import api from "@/lib/api"

interface Template {
  id: string
  name: string
  beschreibung: string
  inhalt: string
  kategorie: string
  aktiv: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

const KATEGORIE_OPTIONS = [
  { value: "antwort", label: "Antwort-Vorlage" },
  { value: "ki_prompt", label: "KI-Prompt" },
  { value: "begruessung", label: "Begruessung" },
]

const KATEGORIE_COLORS: Record<string, string> = {
  antwort: "bg-blue-100 text-blue-700",
  ki_prompt: "bg-purple-100 text-purple-700",
  begruessung: "bg-green-100 text-green-700",
}

const KATEGORIE_LABELS: Record<string, string> = {
  antwort: "Antwort-Vorlage",
  ki_prompt: "KI-Prompt",
  begruessung: "Begruessung",
}

export default function TemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [formName, setFormName] = useState("")
  const [formBeschreibung, setFormBeschreibung] = useState("")
  const [formInhalt, setFormInhalt] = useState("")
  const [formKategorie, setFormKategorie] = useState("antwort")
  const [saving, setSaving] = useState(false)

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const { data } = await api.get("/admin/templates")
      setTemplates(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const resetForm = () => {
    setFormName("")
    setFormBeschreibung("")
    setFormInhalt("")
    setFormKategorie("antwort")
  }

  const startEdit = (t: Template) => {
    setEditingId(t.id)
    setShowCreate(false)
    setFormName(t.name)
    setFormBeschreibung(t.beschreibung)
    setFormInhalt(t.inhalt)
    setFormKategorie(t.kategorie)
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
        beschreibung: formBeschreibung,
        inhalt: formInhalt,
        kategorie: formKategorie,
      }
      if (editingId) {
        await api.put(`/admin/templates/${editingId}`, payload)
      } else {
        await api.post("/admin/templates", payload)
      }
      cancelEdit()
      await loadTemplates()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handleToggleAktiv = async (t: Template) => {
    try {
      await api.put(`/admin/templates/${t.id}`, { aktiv: !t.aktiv })
      await loadTemplates()
    } catch {
      // ignore
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/templates/${id}`)
      setDeleteConfirmId(null)
      await loadTemplates()
    } catch {
      // ignore
    }
  }

  const grouped = templates.reduce<Record<string, Template[]>>((acc, t) => {
    const key = t.kategorie || "andere"
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  const renderForm = () => (
    <div className="bg-white p-4 rounded-md border border-gray-200 mb-4">
      <h3 className="text-sm font-semibold mb-3">
        {editingId ? "Vorlage bearbeiten" : "Neue Vorlage erstellen"}
      </h3>
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Name</label>
          <input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Vorlagenname"
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Beschreibung</label>
          <input
            value={formBeschreibung}
            onChange={(e) => setFormBeschreibung(e.target.value)}
            placeholder="Kurze Beschreibung"
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Kategorie</label>
          <select
            value={formKategorie}
            onChange={(e) => setFormKategorie(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {KATEGORIE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Inhalt</label>
          <textarea
            value={formInhalt}
            onChange={(e) => setFormInhalt(e.target.value)}
            placeholder="Vorlagentext (Markdown moeglich)"
            rows={6}
            className="w-full border rounded-md px-3 py-2 text-sm resize-y bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            onClick={handleSave}
            disabled={saving || !formName.trim() || !formInhalt.trim()}
          >
            {saving ? "..." : editingId ? "Speichern" : "Erstellen"}
          </button>
          <button
            className="px-4 py-2 rounded-md text-sm hover:bg-gray-50"
            onClick={cancelEdit}
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return <span className="text-gray-400">Vorlagen werden geladen...</span>
  }

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Vorlagen</h2>
        <button
          className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
          onClick={startCreate}
        >
          + Neue Vorlage
        </button>
      </div>

      {showCreate && renderForm()}

      {Object.entries(grouped).map(([kategorie, items]) => (
        <div key={kategorie} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                KATEGORIE_COLORS[kategorie] || "bg-gray-100 text-gray-700"
              }`}
            >
              {KATEGORIE_LABELS[kategorie] || kategorie}
            </span>
            <span className="text-sm text-gray-500">({items.length})</span>
          </div>

          <div className="flex flex-col gap-2">
            {items.map((t) => (
              <div key={t.id}>
                {editingId === t.id ? (
                  renderForm()
                ) : (
                  <div
                    className={`bg-white p-3 rounded-md border border-gray-200 ${
                      t.aktiv ? "" : "opacity-60"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm">{t.name}</span>
                          {!t.aktiv && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              Inaktiv
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            Verwendet: {t.usage_count}x
                          </span>
                        </div>
                        {t.beschreibung && (
                          <p className="text-sm text-gray-600 mb-1">
                            {t.beschreibung}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 line-clamp-2">
                          {t.inhalt}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          className="px-3 py-1 rounded-md text-xs hover:bg-gray-50"
                          onClick={() => handleToggleAktiv(t)}
                        >
                          {t.aktiv ? "Deaktivieren" : "Aktivieren"}
                        </button>
                        <button
                          className="px-3 py-1 rounded-md text-xs hover:bg-gray-50"
                          onClick={() => startEdit(t)}
                        >
                          Bearbeiten
                        </button>
                        {deleteConfirmId === t.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              className="bg-red-500 text-white px-3 py-1 rounded-md text-xs hover:bg-red-600"
                              onClick={() => handleDelete(t.id)}
                            >
                              Ja, loeschen
                            </button>
                            <button
                              className="px-3 py-1 rounded-md text-xs hover:bg-gray-50"
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              Nein
                            </button>
                          </div>
                        ) : (
                          <button
                            className="px-3 py-1 rounded-md text-xs text-red-500 hover:bg-gray-50"
                            onClick={() => setDeleteConfirmId(t.id)}
                          >
                            Loeschen
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {templates.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">Noch keine Vorlagen vorhanden.</p>
          <p className="text-sm text-gray-400">
            Erstelle eine neue Vorlage ueber den Button oben.
          </p>
        </div>
      )}
    </div>
  )
}
