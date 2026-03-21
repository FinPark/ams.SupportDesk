import { useState, useEffect } from "react"
import api from "@/lib/api"
import { Kunde } from "@/lib/types"

interface Props {
  onCreated: (ticketId: string) => void
  onCancel: () => void
}

export default function TicketCreate({ onCreated, onCancel }: Props) {
  const [kunden, setKunden] = useState<Kunde[]>([])
  const [kundeSearch, setKundeSearch] = useState("")
  const [selectedKunde, setSelectedKunde] = useState<Kunde | null>(null)
  const [titel, setTitel] = useState("")
  const [tags, setTags] = useState("")
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [creatingKunde, setCreatingKunde] = useState(false)

  useEffect(() => {
    const search = async () => {
      if (!kundeSearch.trim()) {
        setKunden([])
        setSearched(false)
        return
      }
      try {
        const { data } = await api.get("/kunden", { params: { q: kundeSearch } })
        setKunden(data)
        setSearched(true)
      } catch {
        setSearched(true)
      }
    }
    const timer = setTimeout(search, 300)
    return () => clearTimeout(timer)
  }, [kundeSearch])

  const handleCreateKunde = async () => {
    if (!kundeSearch.trim()) return
    setCreatingKunde(true)
    try {
      const { data } = await api.post("/kunden", { name: kundeSearch.trim() })
      setSelectedKunde(data)
      setKundeSearch("")
      setKunden([])
      setSearched(false)
    } catch {
      // ignore
    } finally {
      setCreatingKunde(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedKunde || !titel.trim()) return
    setLoading(true)
    try {
      const tagList = tags
        .split(/[\s,]+/)
        .map((t) => t.replace(/^#/, "").trim().toLowerCase())
        .filter(Boolean)

      const { data } = await api.post("/tickets", {
        kunde_id: selectedKunde.id,
        titel: titel.trim(),
        tags: tagList,
      })
      onCreated(data.id)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-bold mb-4">Neues Ticket</h3>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          {/* Kunde suchen oder anlegen */}
          {!selectedKunde ? (
            <div>
              <label className="text-sm font-medium mb-1 text-gray-600 block">
                Kunde
              </label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Kunde suchen oder neu anlegen..."
                value={kundeSearch}
                onChange={(e) => setKundeSearch(e.target.value)}
                autoFocus
              />
              {kunden.length > 0 && (
                <div className="mt-1 border rounded-md max-h-[200px] overflow-y-auto">
                  {kunden.map((k) => (
                    <div
                      key={k.id}
                      className="px-3 py-2 cursor-pointer hover:bg-blue-50"
                      onClick={() => {
                        setSelectedKunde(k)
                        setKundeSearch("")
                        setKunden([])
                        setSearched(false)
                      }}
                    >
                      <p className="text-sm font-medium">{k.name}</p>
                      {k.kundennummer && (
                        <p className="text-xs text-gray-400">{k.kundennummer}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {searched && kunden.length === 0 && kundeSearch.trim() && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-500 mb-2">
                    Kein Kunde "{kundeSearch}" gefunden.
                  </p>
                  <button
                    type="button"
                    className="border border-primary text-primary px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary/5 disabled:opacity-50"
                    onClick={handleCreateKunde}
                    disabled={creatingKunde}
                  >
                    {creatingKunde ? "Wird angelegt..." : `"${kundeSearch.trim()}" als neuen Kunden anlegen`}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium mb-1 text-gray-600 block">
                Kunde
              </label>
              <div className="p-3 bg-blue-50 rounded-md flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedKunde.name}
                  {selectedKunde.kundennummer && (
                    <span className="text-gray-500 ml-2">({selectedKunde.kundennummer})</span>
                  )}
                </span>
                <button
                  type="button"
                  className="hover:bg-gray-50 px-2 py-1 rounded text-xs"
                  onClick={() => setSelectedKunde(null)}
                >
                  ändern
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-1 text-gray-600 block">
              Titel
            </label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Worum geht es?"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 text-gray-600 block">
              Tags (optional)
            </label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="z.B. erp rechte artikel"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-medium"
              onClick={onCancel}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || !selectedKunde || !titel.trim()}
              className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Wird erstellt..." : "Ticket erstellen"}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
