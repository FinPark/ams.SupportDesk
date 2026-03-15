import { useState, useEffect } from "react"
import { Box, Text } from "@chakra-ui/react"
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
    return <Text color="gray.400">Laden...</Text>
  }

  const { top_kunden, neue_kunden_trend } = data as {
    top_kunden: KundeRow[]
    neue_kunden_trend: { monat: string; anzahl: number }[]
  }

  return (
    <Box display="flex" flexDirection="column" gap={4}>
      {/* Top Kunden Tabelle */}
      <Box bg="white" borderRadius="lg" borderWidth={1} borderColor="gray.200" overflow="auto">
        <Box px={4} py={2} borderBottomWidth={1} borderColor="gray.100">
          <Text fontWeight="bold">Top-Kunden nach Ticketvolumen</Text>
        </Box>
        <Box as="table" w="100%" fontSize="sm">
          <Box as="thead" bg="gray.50">
            <Box as="tr">
              {["#", "Kunde", "Tickets", "Ø Bewertung", "Ø Nachr./Ticket"].map((h) => (
                <Box as="th" key={h} px={3} py={2} textAlign="left" fontWeight="semibold" color="gray.600">
                  {h}
                </Box>
              ))}
            </Box>
          </Box>
          <Box as="tbody">
            {top_kunden.map((k, i) => (
              <Box as="tr" key={k.kunde_id} borderTopWidth={1} borderColor="gray.100">
                <Box as="td" px={3} py={2} fontWeight="bold" color="gray.400">{i + 1}</Box>
                <Box as="td" px={3} py={2} fontWeight="medium">{k.name}</Box>
                <Box as="td" px={3} py={2} fontWeight="bold">{k.tickets}</Box>
                <Box as="td" px={3} py={2}>{k.avg_bewertung ?? "–"}</Box>
                <Box as="td" px={3} py={2}>{k.avg_nachrichten_pro_ticket}</Box>
              </Box>
            ))}
            {top_kunden.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "24px 12px", textAlign: "center", color: "#A0AEC0" }}>
                  Keine Daten vorhanden
                </td>
              </tr>
            )}
          </Box>
        </Box>
      </Box>

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
    </Box>
  )
}
