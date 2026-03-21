import { useState, useEffect } from "react"
import api from "@/lib/api"
import DistributionChart from "./charts/DistributionChart"
import TrendChart from "./charts/TrendChart"

interface Props {
  params: string
}

interface KundeRow {
  kunde_id: string
  name: string
  tickets: number
  avg_bewertung: number | null
  avg_nachrichten_pro_ticket: number
}

export default function StatistikKunden({ params }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/statistik/kunden?${params}`)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params])

  if (loading || !data) {
    return <p className="text-gray-400">Laden...</p>
  }

  const { top_kunden, neue_kunden_trend } = data as {
    top_kunden: KundeRow[]
    neue_kunden_trend: { monat: string; anzahl: number }[]
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top Kunden Tabelle */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-auto">
        <div className="px-4 py-2 border-b border-gray-100">
          <p className="font-bold">Top-Kunden nach Ticketvolumen</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["#", "Kunde", "Tickets", "Ø Bewertung", "Ø Nachr./Ticket"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {top_kunden.map((k, i) => (
              <tr key={k.kunde_id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-bold text-gray-400">{i + 1}</td>
                <td className="px-3 py-2 font-medium">{k.name}</td>
                <td className="px-3 py-2 font-bold">{k.tickets}</td>
                <td className="px-3 py-2">{k.avg_bewertung ?? "–"}</td>
                <td className="px-3 py-2">{k.avg_nachrichten_pro_ticket}</td>
              </tr>
            ))}
            {top_kunden.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                  Keine Daten vorhanden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tickets pro Kunde Bar Chart */}
      <DistributionChart
        title="Tickets pro Kunde (Top 20)"
        data={top_kunden.map((k) => ({ name: k.name, tickets: k.tickets }))}
        nameKey="name"
        valueKey="tickets"
        type="bar"
        height={300}
      />

      {/* Neue Kunden Trend */}
      <TrendChart
        title="Neue Kunden pro Monat"
        data={neue_kunden_trend}
        xKey="monat"
        series={[{ dataKey: "anzahl", color: "#003459", name: "Neue Kunden" }]}
        height={250}
      />
    </div>
  )
}
