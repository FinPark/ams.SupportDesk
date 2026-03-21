import { useState, useEffect } from "react"
import api from "@/lib/api"
import KpiCard from "./charts/KpiCard"
import TrendChart from "./charts/TrendChart"
import DistributionChart from "./charts/DistributionChart"

interface Props {
  params: string
}

export default function StatistikQualitaet({ params }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/statistik/qualitaet?${params}`)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params])

  if (loading || !data) {
    return <p className="text-gray-400">Laden...</p>
  }

  const { kpis, sterne_verteilung, bewertung_trend, letzte_kommentare } = data

  return (
    <div className="flex flex-col gap-4">
      {/* KPI Cards */}
      <div className="flex items-center gap-4 flex-wrap">
        <KpiCard label="Ø Sterne" value={kpis.avg_sterne} suffix="/ 5" />
        <KpiCard label="Lösungsrate" value={kpis.loesungsrate} suffix="%" />
        <KpiCard label="Bewertungsquote" value={kpis.bewertungsquote} suffix="%" />
      </div>

      {/* Sterne-Verteilung */}
      <DistributionChart
        title="Sterne-Verteilung"
        data={sterne_verteilung.map((s: any) => ({
          sterne: `${s.sterne} Sterne`,
          anzahl: s.anzahl,
        }))}
        nameKey="sterne"
        valueKey="anzahl"
        type="bar"
        height={250}
      />

      {/* Bewertungs-Trend */}
      <TrendChart
        title="Bewertungs-Trend (Ø Sterne pro Woche)"
        data={bewertung_trend}
        xKey="woche"
        series={[{ dataKey: "avg_sterne", color: "#E6960A", name: "Ø Sterne" }]}
        height={250}
      />

      {/* Letzte Kommentare */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <p className="font-bold mb-3">Letzte Bewertungs-Kommentare</p>
        {letzte_kommentare.length === 0 ? (
          <p className="text-gray-400 text-sm">Keine Kommentare vorhanden</p>
        ) : (
          <div className="flex flex-col gap-2">
            {letzte_kommentare.map((k: any, i: number) => (
              <div
                key={i}
                className={`p-3 bg-gray-50 rounded-md border-l-[3px] ${k.geloest ? "border-l-green-400" : "border-l-orange-400"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold">
                    {"★".repeat(k.sterne)}{"☆".repeat(5 - k.sterne)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(k.created_at).toLocaleDateString("de-DE")}
                  </span>
                  {k.geloest && (
                    <span className="text-xs text-green-600 font-bold">Gelöst</span>
                  )}
                </div>
                <p className="text-sm">{k.kommentar}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
