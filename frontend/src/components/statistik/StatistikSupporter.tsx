import { useState, useEffect } from "react"
import api from "@/lib/api"
import DistributionChart from "./charts/DistributionChart"

interface Props {
  params: string
}

interface SupporterRow {
  supporter_id: string
  kuerzel: string
  name: string
  tickets_gesamt: number
  aktive_tickets: number
  avg_bearbeitungsdauer_h: number | null
  avg_bewertung: number | null
  loesungsrate: number
  ki_sessions: number
}

export default function StatistikSupporter({ params }: Props) {
  const [data, setData] = useState<{ rangliste: SupporterRow[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/statistik/supporter?${params}`)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params])

  if (loading || !data) {
    return <p className="text-gray-400">Laden...</p>
  }

  const { rangliste } = data

  return (
    <div className="flex flex-col gap-4">
      {/* Rangliste Tabelle */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["#", "Kürzel", "Name", "Tickets", "Aktiv", "Ø Dauer (h)", "Ø Bewertung", "Lösungsrate", "KI-Sessions"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rangliste.map((s, i) => (
              <tr key={s.supporter_id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-bold text-gray-400">{i + 1}</td>
                <td className="px-3 py-2 font-bold text-primary">{s.kuerzel}</td>
                <td className="px-3 py-2">{s.name}</td>
                <td className="px-3 py-2 font-bold">{s.tickets_gesamt}</td>
                <td className="px-3 py-2">{s.aktive_tickets}</td>
                <td className="px-3 py-2">{s.avg_bearbeitungsdauer_h ?? "–"}</td>
                <td className="px-3 py-2">{s.avg_bewertung ?? "–"}</td>
                <td className="px-3 py-2">{s.loesungsrate}%</td>
                <td className="px-3 py-2">{s.ki_sessions}</td>
              </tr>
            ))}
            {rangliste.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-gray-400">
                  Keine Daten vorhanden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bar Chart */}
      <DistributionChart
        title="Tickets pro Supporter"
        data={rangliste.map((s) => ({ kuerzel: s.kuerzel, tickets: s.tickets_gesamt }))}
        nameKey="kuerzel"
        valueKey="tickets"
        type="bar"
        height={300}
      />
    </div>
  )
}
