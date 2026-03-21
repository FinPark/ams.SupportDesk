import { useEffect, useCallback } from "react"
import { useEingangskorb } from "@/hooks/useTickets"
import { useWebSocket } from "@/hooks/useWebSocket"
import EingangskorbItemCard from "./EingangskorbItem"
import api from "@/lib/api"

interface Props {
  onTicketOpen: (ticketId: string) => void
}

export default function Eingangskorb({ onTicketOpen }: Props) {
  const { items, loading, loadEingangskorb, setItems } = useEingangskorb()

  useEffect(() => {
    loadEingangskorb()
  }, [loadEingangskorb])

  const onWsMessage = useCallback(
    (data: any) => {
      if (data.type === "neues_ticket" || data.type === "neue_nachricht") {
        loadEingangskorb()
      }
      if (data.type === "ticket_uebernommen") {
        setItems((prev) => prev.filter((i) => i.ticket_id !== data.ticket_id))
      }
    },
    [loadEingangskorb, setItems]
  )

  useWebSocket("/api/v1/ws/eingangskorb", onWsMessage)

  const handleUebernehmen = async (ticketId: string) => {
    try {
      await api.post(`/tickets/${ticketId}/uebernehmen`)
      setItems((prev) => prev.filter((i) => i.ticket_id !== ticketId))
      onTicketOpen(ticketId)
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">
        Eingangskorb
        {items.length > 0 && (
          <span className="ml-2 text-sm text-gray-400 font-normal">
            ({items.length})
          </span>
        )}
      </h3>

      {loading && items.length === 0 && (
        <p className="text-gray-400">Laden...</p>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-400">Keine neuen Anfragen</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <EingangskorbItemCard
            key={item.ticket_id}
            item={item}
            onUebernehmen={handleUebernehmen}
          />
        ))}
      </div>
    </div>
  )
}
