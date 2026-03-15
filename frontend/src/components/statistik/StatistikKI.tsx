import { useState, useEffect } from "react"
import { Box, HStack, Text } from "@chakra-ui/react"
import api from "@/lib/api"
import KpiCard from "./charts/KpiCard"
import TrendChart from "./charts/TrendChart"
import DistributionChart from "./charts/DistributionChart"

interface Props {
  params: string
}

export default function StatistikKI({ params }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/statistik/ki?${params}`)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params])

  if (loading || !data) {
    return <Text color="gray.400">Laden...</Text>
  }

  const { kpis, provider_verteilung, modell_verteilung, nutzung_trend, nutzung_pro_supporter } = data

  return (
    <Box display="flex" flexDirection="column" gap={4}>
      {/* KPI Cards */}
      <HStack gap={4} flexWrap="wrap">
        <KpiCard label="KI-Sessions" value={kpis.ki_sessions} />
        <KpiCard label="KI-Nutzungsrate" value={kpis.ki_nutzungsrate} suffix="%" />
        <KpiCard label="Übernahmerate" value={kpis.uebernahmerate} suffix="%" />
        <KpiCard label="Ø Nachr./Recherche" value={kpis.avg_nachrichten_pro_recherche} />
      </HStack>

      {/* Pie Charts */}
      <HStack gap={4} flexWrap="wrap" alignItems="flex-start">
        <DistributionChart
          title="Provider-Verteilung"
          data={provider_verteilung}
          nameKey="provider"
          valueKey="anzahl"
          type="pie"
          height={280}
        />
        <DistributionChart
          title="Modell-Verteilung"
          data={modell_verteilung}
          nameKey="modell"
          valueKey="anzahl"
          type="pie"
          height={280}
        />
      </HStack>

      {/* KI-Nutzung Trend */}
      <TrendChart
        title="KI-Nutzung über Zeit"
        data={nutzung_trend}
        xKey="woche"
        series={[{ dataKey: "anzahl", color: "#003459", name: "KI-Sessions" }]}
        height={250}
      />

      {/* KI-Nutzung pro Supporter */}
      <DistributionChart
        title="KI-Nutzung pro Supporter"
        data={nutzung_pro_supporter}
        nameKey="kuerzel"
        valueKey="anzahl"
        type="bar"
        height={280}
      />
    </Box>
  )
}
