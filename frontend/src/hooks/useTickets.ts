import { useState, useEffect, useCallback } from "react"
import api from "@/lib/api"
import { Ticket, EingangskorbItem } from "@/lib/types"

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)

  const loadTickets = useCallback(async (params?: Record<string, string>) => {
    setLoading(true)
    try {
      const { data } = await api.get("/tickets", { params })
      setTickets(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  return { tickets, loading, loadTickets, setTickets }
}

export function useEingangskorb() {
  const [items, setItems] = useState<EingangskorbItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadEingangskorb = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get("/eingangskorb")
      setItems(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  return { items, loading, loadEingangskorb, setItems }
}
