import { useState, useEffect } from "react"
import api from "@/lib/api"

interface PhasenText {
  id: string
  phase: string
  titel: string
  inhalt: string
  timeout_seconds: number | null
  aktiv: boolean
  created_at: string
  updated_at: string
}

const PHASE_COLORS: Record<string, string> = {
  eingang: "bg-yellow-100 text-yellow-700",
  in_bearbeitung: "bg-blue-100 text-blue-700",
  wartet: "bg-orange-100 text-orange-700",
  geloest: "bg-green-100 text-green-700",
  bewertung: "bg-purple-100 text-purple-700",
  geschlossen: "bg-gray-100 text-gray-700",
}

const PHASE_LABELS: Record<string, string> = {
  eingang: "Eingang",
  in_bearbeitung: "In Bearbeitung",
  wartet: "Wartet auf Kunde",
  geloest: "Geloest",
  bewertung: "Bewertung",
  geschlossen: "Geschlossen",
}

export default function PhasenTexteManager() {
  const [phasenTexte, setPhasenTexte] = useState<PhasenText[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [editState, setEditState] = useState<Record<string, { titel: string; inhalt: string; timeout_seconds: string; aktiv: boolean }>>({})

  const loadPhasenTexte = async () => {
    try {
      setLoading(true)
      const { data } = await api.get("/admin/phasen-texte")
      setPhasenTexte(data)
      const state: Record<string, { titel: string; inhalt: string; timeout_seconds: string; aktiv: boolean }> = {}
      for (const pt of data) {
        state[pt.id] = {
          titel: pt.titel,
          inhalt: pt.inhalt,
          timeout_seconds: pt.timeout_seconds !== null ? String(pt.timeout_seconds) : "",
          aktiv: pt.aktiv,
        }
      }
      setEditState(state)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPhasenTexte()
  }, [])

  const handleSeed = async () => {
    setSeeding(true)
    try {
      await api.post("/admin/phasen-texte/seed")
      await loadPhasenTexte()
    } catch {
      // ignore
    } finally {
      setSeeding(false)
    }
  }

  const handleSave = async (pt: PhasenText) => {
    const state = editState[pt.id]
    if (!state) return
    setSavingId(pt.id)
    try {
      await api.put(`/admin/phasen-texte/${pt.id}`, {
        titel: state.titel,
        inhalt: state.inhalt,
        timeout_seconds: state.timeout_seconds ? parseInt(state.timeout_seconds, 10) : null,
        aktiv: state.aktiv,
      })
      await loadPhasenTexte()
    } catch {
      // ignore
    } finally {
      setSavingId(null)
    }
  }

  const updateField = (id: string, field: string, value: string | boolean) => {
    setEditState((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const hasChanges = (pt: PhasenText) => {
    const state = editState[pt.id]
    if (!state) return false
    return (
      state.titel !== pt.titel ||
      state.inhalt !== pt.inhalt ||
      state.aktiv !== pt.aktiv ||
      (state.timeout_seconds || "") !== (pt.timeout_seconds !== null ? String(pt.timeout_seconds) : "")
    )
  }

  if (loading) {
    return <span className="text-gray-400">Phasen-Texte werden geladen...</span>
  }

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Phasen-Texte</h2>
        <button
          className="border border-primary text-primary px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/5 disabled:opacity-50"
          onClick={handleSeed}
          disabled={seeding}
        >
          {seeding ? "..." : "Standardtexte laden"}
        </button>
      </div>

      {phasenTexte.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-2">Noch keine Phasen-Texte vorhanden.</p>
          <p className="text-sm text-gray-400">
            Klicke auf "Standardtexte laden" um die Vorlagen zu initialisieren.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {phasenTexte.map((pt) => {
            const state = editState[pt.id]
            if (!state) return null
            const isOpen = openIds.has(pt.id)

            return (
              <div
                key={pt.id}
                className={`bg-white rounded-md border transition-all duration-150 ${
                  isOpen ? "border-blue-200" : "border-gray-200"
                } ${state.aktiv ? "" : "opacity-60"}`}
              >
                {/* Collapsed header */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 rounded-md"
                  onClick={() => toggleOpen(pt.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 w-4">
                      {isOpen ? "\u25BE" : "\u25B8"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        PHASE_COLORS[pt.phase] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {PHASE_LABELS[pt.phase] || pt.phase}
                    </span>
                    <span className="text-sm text-gray-600">{state.titel}</span>
                    {!state.aktiv && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        Inaktiv
                      </span>
                    )}
                  </div>
                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="px-3 py-1 rounded-md text-xs hover:bg-gray-50"
                      onClick={() => updateField(pt.id, "aktiv", !state.aktiv)}
                    >
                      {state.aktiv ? "Deaktivieren" : "Aktivieren"}
                    </button>
                    {hasChanges(pt) && (
                      <button
                        className="bg-primary text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                        onClick={() => handleSave(pt)}
                        disabled={savingId === pt.id}
                      >
                        {savingId === pt.id ? "..." : "Speichern"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                {isOpen && (
                  <div className="px-4 pb-4 pt-1">
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">
                          Titel
                        </label>
                        <input
                          value={state.titel}
                          onChange={(e) =>
                            updateField(pt.id, "titel", e.target.value)
                          }
                          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">
                          Inhalt
                        </label>
                        <textarea
                          value={state.inhalt}
                          onChange={(e) => updateField(pt.id, "inhalt", e.target.value)}
                          rows={4}
                          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm resize-y bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">
                          Timeout (Sekunden)
                        </label>
                        <input
                          value={state.timeout_seconds}
                          onChange={(e) =>
                            updateField(pt.id, "timeout_seconds", e.target.value)
                          }
                          placeholder="Kein Timeout"
                          type="number"
                          className="max-w-[200px] border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
