import { useEffect, useState } from "react"
import { useTickets } from "@/hooks/useTickets"
import { Supporter } from "@/lib/types"

interface Props {
  supporter: Supporter
  onTicketSelect: (ticketId: string) => void
  selectedTicketId?: string
}

type Tab = "eingangskorb" | "meine" | "alle"

const STATUS_COLORS: Record<string, string> = {
  eingang: "bg-yellow-100 text-yellow-700",
  in_bearbeitung: "bg-blue-100 text-blue-700",
  wartet: "bg-orange-100 text-orange-700",
  geloest: "bg-green-100 text-green-700",
  bewertung: "bg-purple-100 text-purple-700",
  geschlossen: "bg-gray-100 text-gray-700",
}

export default function TicketList({ supporter, onTicketSelect, selectedTicketId }: Props) {
  const [tab, setTab] = useState<Tab>("meine")
  const { tickets, loading, loadTickets } = useTickets()

  useEffect(() => {
    const params: Record<string, string> = {}
    if (tab === "eingangskorb") params.status = "eingang"
    if (tab === "meine") params.supporter_id = supporter.id
    loadTickets(params)
  }, [tab, supporter.id, loadTickets])

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex items-center px-3 py-2 border-b border-gray-200 gap-1">
        {(["meine", "eingangskorb", "alle"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              tab === t
                ? "bg-primary text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
            onClick={() => setTab(t)}
          >
            {t === "meine" ? "Meine" : t === "eingangskorb" ? "Eingang" : "Alle"}
          </button>
        ))}
      </div>

      {/* Ticket-Liste */}
      <div className="flex-1 overflow-y-auto">
        {loading && tickets.length === 0 && (
          <p className="p-4 text-gray-400 text-sm">Laden...</p>
        )}
        {!loading && tickets.length === 0 && (
          <p className="p-4 text-gray-400 text-sm text-center">
            Keine Tickets
          </p>
        )}
        <div className="flex flex-col">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`px-3 py-3 cursor-pointer border-b border-gray-100 transition-colors duration-150 ${
                selectedTicketId === ticket.id ? "bg-blue-50" : "hover:bg-blue-50"
              }`}
              onClick={() => onTicketSelect(ticket.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium line-clamp-1 flex-1">
                  <span className="text-primary font-bold">#{ticket.nummer}</span>{" "}
                  {ticket.titel}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      STATUS_COLORS[ticket.status] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {ticket.status}
                  </span>
                  <span className="text-xs text-blue-400">→</span>
                </div>
              </div>
              <div className="flex items-center text-xs text-gray-400 gap-2">
                <span>{ticket.kunde_name}</span>
                {ticket.supporter_kuerzel && <span>· {ticket.supporter_kuerzel}</span>}
                <span>
                  · {new Date(ticket.updated_at).toLocaleDateString("de-DE")}
                </span>
              </div>
              {ticket.tags.length > 0 && (
                <div className="flex items-center mt-1 gap-1 flex-wrap">
                  {ticket.tags.slice(0, 3).map((t) => (
                    <span key={t.id} className="inline-flex items-center px-1.5 py-0.5 rounded border border-blue-200 text-xs text-blue-700">
                      #{t.tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
