import { useState, useEffect } from "react"
import { Box, HStack, Text } from "@chakra-ui/react"
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
    return <Text color="gray.400">Laden...</Text>
  }

  const { kpis, bearbeitungsdauer_verteilung, antwortzeit_trend, heatmap } = data

  // Heatmap: Build grid data
  const maxAnzahl = Math.max(...heatmap.map((h: any) => h.anzahl), 1)

  return (
    <Box display="flex" flexDirection="column" gap={4}>
      {/* KPI Cards */}
      <HStack gap={4} flexWrap="wrap">
        <KpiCard label="Ø Erste Antwort" value={kpis.avg_first_response_min} suffix="min" />
        <KpiCard label="Ø Bearbeitungsdauer" value={kpis.avg_bearbeitungsdauer_h} suffix="h" />
        <KpiCard label="Median Bearbeitungsdauer" value={kpis.median_bearbeitungsdauer_h} suffix="h" />
        <KpiCard label="Ø Session-Dauer" value={kpis.avg_session_dauer_min} suffix="min" />
      </HStack>

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
      <Box bg="white" borderRadius="lg" p={4} borderWidth={1} borderColor="gray.200">
        <Text fontWeight="bold" mb={3}>Ticket-Eingang: Wochentag x Stunde</Text>
        <Box overflowX="auto">
          <Box display="flex" gap={0}>
            {/* Y-Axis Labels */}
            <Box display="flex" flexDirection="column" mr={1} pt="20px">
              {WOCHENTAGE.map((tag) => (
                <Box key={tag} h="24px" display="flex" alignItems="center" justifyContent="flex-end" pr={1}>
                  <Text fontSize="xs" color="gray.500">{tag}</Text>
                </Box>
              ))}
            </Box>
            {/* Grid */}
            <Box>
              {/* X-Axis Labels */}
              <Box display="flex" gap={0}>
                {Array.from({ length: 24 }, (_, h) => (
                  <Box key={h} w="24px" textAlign="center">
                    <Text fontSize="xs" color="gray.500">{h}</Text>
                  </Box>
                ))}
              </Box>
              {/* Cells */}
              {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
                <Box key={dow} display="flex" gap={0}>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const cell = heatmap.find((h: any) => h.wochentag === dow && h.stunde === hour)
                    const count = cell?.anzahl || 0
                    const intensity = count / maxAnzahl
                    return (
                      <Box
                        key={hour}
                        w="24px"
                        h="24px"
                        bg={count === 0 ? "gray.50" : `rgba(0, 52, 89, ${0.1 + intensity * 0.9})`}
                        borderRadius="2px"
                        title={`${WOCHENTAGE[dow]} ${hour}:00 — ${count} Tickets`}
                        m="0.5px"
                      />
                    )
                  })}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
