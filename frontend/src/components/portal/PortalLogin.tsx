import { useState } from "react"
import api from "@/lib/api"

interface Props {
  onIdentified: (kundeId: string, name: string, ticketId?: string, ticketNummer?: number) => void
}

export default function PortalLogin({ onIdentified }: Props) {
  const [name, setName] = useState("")
  const [ticketNr, setTicketNr] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError("")
    try {
      const { data } = await api.post("/portal/identify", {
        name: name.trim(),
        ticket_nr: ticketNr.trim() || null,
      })
      onIdentified(
        data.kunde_id,
        data.name,
        data.ticket?.id || undefined,
        data.ticket?.nummer || undefined
      )
    } catch {
      setError("Identifikation fehlgeschlagen")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-[400px]">
        <div className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold text-primary">
            Support-Portal
          </h2>
          <p className="text-gray-500 text-center">
            Geben Sie Ihren Namen ein, um den Chat zu starten
          </p>
          <form onSubmit={handleSubmit} style={{ width: "100%" }}>
            <div className="flex flex-col gap-4">
              <input
                className="w-full border rounded-md px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Ihr Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <input
                className="w-full border rounded-md px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Ticket-Nr. (optional)"
                value={ticketNr}
                onChange={(e) => setTicketNr(e.target.value)}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-white px-4 py-3 rounded-md text-base font-medium hover:bg-primary/90 disabled:opacity-50 w-full"
              >
                {loading ? "Laden..." : "Chat starten"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
