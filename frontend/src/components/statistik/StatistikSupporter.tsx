import { useState, useEffect } from "react"
import { Box, Text } from "@chakra-ui/react"
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
    return <Text color="gray.400">Laden...</Text>
  }

  const { rangliste } = data

  return (
    <Box display="flex" flexDirection="column" gap={4}>
      {/* Rangliste Tabelle */}
      <Box bg="white" borderRadius="lg" borderWidth={1} borderColor="gray.200" overflow="auto">
        <Box as="table" w="100%" fontSize="sm">
          <Box as="thead" bg="gray.50">
            <Box as="tr">
              {["#", "Kürzel", "Name", "Tickets", "Aktiv", "Ø Dauer (h)", "Ø Bewertung", "Lösungsrate", "KI-Sessions"].map((h) => (
                <Box as="th" key={h} px={3} py={2} textAlign="left" fontWeight="semibold" color="gray.600">
                  {h}
                </Box>
              ))}
            </Box>
          </Box>
          <Box as="tbody">
            {rangliste.map((s, i) => (
              <Box as="tr" key={s.supporter_id} borderTopWidth={1} borderColor="gray.100">
                <Box as="td" px={3} py={2} fontWeight="bold" color="gray.400">{i + 1}</Box>
                <Box as="td" px={3} py={2} fontWeight="bold" color="blue.500">{s.kuerzel}</Box>
                <Box as="td" px={3} py={2}>{s.name}</Box>
                <Box as="td" px={3} py={2} fontWeight="bold">{s.tickets_gesamt}</Box>
                <Box as="td" px={3} py={2}>{s.aktive_tickets}</Box>
                <Box as="td" px={3} py={2}>{s.avg_bearbeitungsdauer_h ?? "–"}</Box>
                <Box as="td" px={3} py={2}>{s.avg_bewertung ?? "–"}</Box>
                <Box as="td" px={3} py={2}>{s.loesungsrate}%</Box>
                <Box as="td" px={3} py={2}>{s.ki_sessions}</Box>
              </Box>
            ))}
            {rangliste.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: "24px 12px", textAlign: "center", color: "#A0AEC0" }}>
                  Keine Daten vorhanden
                </td>
              </tr>
            )}
          </Box>
        </Box>
      </Box>

      {/* Bar Chart */}
      <DistributionChart
        title="Tickets pro Supporter"
        data={rangliste.map((s) => ({ kuerzel: s.kuerzel, tickets: s.tickets_gesamt }))}
        nameKey="kuerzel"
        valueKey="tickets"
        type="bar"
        height={300}
      />
    </Box>
  )
}
