import { useState, useEffect } from "react"
import api from "@/lib/api"
import KpiCard from "./charts/KpiCard"
import TrendChart from "./charts/TrendChart"
import DistributionChart from "./charts/DistributionChart"

interface Props {
  params: string
}

const WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]

export default function StatistikZeiten({ params }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/statistik/zeiten?${params}`)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params])

  if (loading || !data) {
    return <p className="text-gray-400">Laden...</p>
  }

  const { kpis, bearbeitungsdauer_verteilung, antwortzeit_trend, heatmap } = data

  // Heatmap: Build grid data
  const maxAnzahl = Math.max(...heatmap.map((h: any) => h.anzahl), 1)

  return (
    <div className="flex flex-col gap-4">
      {/* KPI Cards */}
      <div className="flex items-center gap-4 flex-wrap">
        <KpiCard label="Ø Erste Antwort" value={kpis.avg_first_response_min} suffix="min" />
        <KpiCard label="Ø Bearbeitungsdauer" value={kpis.avg_bearbeitungsdauer_h} suffix="h" />
        <KpiCard label="Median Bearbeitungsdauer" value={kpis.median_bearbeitungsdauer_h} suffix="h" />
        <KpiCard label="Ø Session-Dauer" value={kpis.avg_session_dauer_min} suffix="min" />
      </div>

      {/* Bearbeitungsdauer-Verteilung */}
      <DistributionChart
        title="Bearbeitungsdauer-Verteilung"
        data={bearbeitungsdauer_verteilung}
        nameKey="bucket"
        valueKey="anzahl"
        type="bar"
        height={250}
      />

      {/* Antwortzeit-Trend */}
      <TrendChart
        title="Ø Erste Antwortzeit pro Woche"
        data={antwortzeit_trend}
        xKey="woche"
        series={[{ dataKey: "avg_min", color: "#003459", name: "Ø Minuten" }]}
        height={250}
      />

      {/* Heatmap */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <p className="font-bold mb-3">Ticket-Eingang: Wochentag x Stunde</p>
        <div className="overflow-x-auto">
          <div className="flex gap-0">
            {/* Y-Axis Labels */}
            <div className="flex flex-col mr-1 pt-5">
              {WOCHENTAGE.map((tag) => (
                <div key={tag} className="h-6 flex items-center justify-end pr-1">
                  <span className="text-xs text-gray-500">{tag}</span>
                </div>
              ))}
            </div>
            {/* Grid */}
            <div>
              {/* X-Axis Labels */}
              <div className="flex gap-0">
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="w-6 text-center">
                    <span className="text-xs text-gray-500">{h}</span>
                  </div>
                ))}
              </div>
              {/* Cells */}
              {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
                <div key={dow} className="flex gap-0">
                  {Array.from({ length: 24 }, (_, hour) => {
                    const cell = heatmap.find((h: any) => h.wochentag === dow && h.stunde === hour)
                    const count = cell?.anzahl || 0
                    const intensity = count / maxAnzahl
                    return (
                      <div
                        key={hour}
                        className="w-6 h-6 rounded-sm m-[0.5px]"
                        style={{
                          backgroundColor: count === 0 ? "#F9FAFB" : `rgba(0, 52, 89, ${0.1 + intensity * 0.9})`,
                        }}
                        title={`${WOCHENTAGE[dow]} ${hour}:00 — ${count} Tickets`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
