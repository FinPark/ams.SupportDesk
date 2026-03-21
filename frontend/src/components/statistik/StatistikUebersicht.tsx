import { useState, useEffect } from "react"
import api from "@/lib/api"
import KpiCard from "./charts/KpiCard"
import TrendChart from "./charts/TrendChart"
import DistributionChart from "./charts/DistributionChart"

interface Props {
  params: string
}

export default function StatistikUebersicht({ params }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/statistik/uebersicht?${params}`)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params])

  if (loading || !data) {
    return <p className="text-gray-400">Laden...</p>
  }

  const { kpis, ticket_trend, status_verteilung, prioritaet_verteilung, top_tags } = data

  // Merge eingang + geschlossen trends
  const trendMap = new Map<string, any>()
  for (const e of ticket_trend.eingang) {
    trendMap.set(e.datum, { datum: e.datum, eingang: e.anzahl, geschlossen: 0 })
  }
  for (const g of ticket_trend.geschlossen) {
    const existing = trendMap.get(g.datum)
    if (existing) {
      existing.geschlossen = g.anzahl
    } else {
      trendMap.set(g.datum, { datum: g.datum, eingang: 0, geschlossen: g.anzahl })
    }
  }
  const trendData = Array.from(trendMap.values()).sort((a, b) => a.datum.localeCompare(b.datum))

  return (
    <div className="flex flex-col gap-4">
      {/* KPI Cards */}
      <div className="flex items-center gap-4 flex-wrap">
        <KpiCard label="Tickets gesamt" value={kpis.gesamt} />
        <KpiCard label="Offene Tickets" value={kpis.offene} />
        <KpiCard label="Neue heute" value={kpis.neue_heute} />
        <KpiCard label="Gelöst" value={kpis.geloest} />
        <KpiCard label="Ø Bewertung" value={kpis.avg_bewertung} suffix="/ 5" />
      </div>

      {/* Ticket-Trend */}
      <TrendChart
        title="Ticket-Trend (Eingang vs. Geschlossen)"
        data={trendData}
        xKey="datum"
        series={[
          { dataKey: "eingang", color: "#003459", name: "Eingang" },
          { dataKey: "geschlossen", color: "#4CAF50", name: "Geschlossen" },
        ]}
      />

      {/* Pie Charts */}
      <div className="flex items-start gap-4 flex-wrap">
        <DistributionChart
          title="Status-Verteilung"
          data={status_verteilung}
          nameKey="status"
          valueKey="anzahl"
          type="pie"
          height={280}
        />
        <DistributionChart
          title="Prioritäts-Verteilung"
          data={prioritaet_verteilung}
          nameKey="prioritaet"
          valueKey="anzahl"
          type="pie"
          height={280}
        />
      </div>

      {/* Top Tags */}
      <DistributionChart
        title="Top 10 Tags"
        data={top_tags}
        nameKey="tag"
        valueKey="anzahl"
        type="bar"
        height={280}
      />
    </div>
  )
}
