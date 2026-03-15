import { useState, useEffect } from "react"
import { Box, HStack, Text } from "@chakra-ui/react"
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
    return <Text color="gray.400">Laden...</Text>
  }

  const { kpis, sterne_verteilung, bewertung_trend, letzte_kommentare } = data

  return (
    <Box display="flex" flexDirection="column" gap={4}>
      {/* KPI Cards */}
      <HStack gap={4} flexWrap="wrap">
        <KpiCard label="Ø Sterne" value={kpis.avg_sterne} suffix="/ 5" />
        <KpiCard label="Lösungsrate" value={kpis.loesungsrate} suffix="%" />
        <KpiCard label="Bewertungsquote" value={kpis.bewertungsquote} suffix="%" />
      </HStack>

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
      <Box bg="white" borderRadius="lg" p={4} borderWidth={1} borderColor="gray.200">
        <Text fontWeight="bold" mb={3}>Letzte Bewertungs-Kommentare</Text>
        {letzte_kommentare.length === 0 ? (
          <Text color="gray.400" fontSize="sm">Keine Kommentare vorhanden</Text>
        ) : (
          <Box display="flex" flexDirection="column" gap={2}>
            {letzte_kommentare.map((k: any, i: number) => (
              <Box
                key={i}
                p={3}
                bg="gray.50"
                borderRadius="md"
                borderLeftWidth={3}
                borderColor={k.geloest ? "green.400" : "orange.400"}
              >
                <HStack gap={2} mb={1}>
                  <Text fontSize="sm" fontWeight="bold">
                    {"★".repeat(k.sterne)}{"☆".repeat(5 - k.sterne)}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {new Date(k.created_at).toLocaleDateString("de-DE")}
                  </Text>
                  {k.geloest && (
                    <Text fontSize="xs" color="green.600" fontWeight="bold">Gelöst</Text>
                  )}
                </HStack>
                <Text fontSize="sm">{k.kommentar}</Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}
