import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Box, Button, Heading, HStack, Input, Text } from "@chakra-ui/react"
import { useAuth } from "@/hooks/useAuth"
import SupporterLogin from "@/components/shared/SupporterLogin"
import api from "@/lib/api"
import StatistikUebersicht from "./StatistikUebersicht"
import StatistikSupporter from "./StatistikSupporter"
import StatistikKunden from "./StatistikKunden"
import StatistikZeiten from "./StatistikZeiten"
import StatistikQualitaet from "./StatistikQualitaet"
import StatistikKI from "./StatistikKI"

const TABS = [
  { key: "uebersicht", label: "Übersicht" },
  { key: "supporter", label: "Supporter" },
  { key: "kunden", label: "Kunden" },
  { key: "zeiten", label: "Zeiten & SLA" },
  { key: "qualitaet", label: "Qualität" },
  { key: "ki", label: "KI-Nutzung" },
] as const

type TabKey = (typeof TABS)[number]["key"]

const PRESETS: { label: string; days: number | null }[] = [
  { label: "Heute", days: 0 },
  { label: "7 Tage", days: 7 },
  { label: "30 Tage", days: 30 },
  { label: "90 Tage", days: 90 },
  { label: "Jahr", days: 365 },
  { label: "Gesamt", days: null },
]

interface SupporterOption {
  id: string
  kuerzel: string
}

export default function StatistikPage() {
  const { supporter, loading, login, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>("uebersicht")

  // Filters
  const [presetIdx, setPresetIdx] = useState(2) // 30 Tage default
  const [customVon, setCustomVon] = useState("")
  const [customBis, setCustomBis] = useState("")
  const [supporterFilter, setSupporterFilter] = useState("")
  const [kundeFilter, setKundeFilter] = useState("")

  // Supporter list for filter dropdown
  const [supporters, setSupporters] = useState<SupporterOption[]>([])
  useEffect(() => {
    api.get("/statistik/supporter")
      .then((r) => {
        const list = (r.data.rangliste || []).map((s: any) => ({
          id: s.supporter_id,
          kuerzel: s.kuerzel,
        }))
        setSupporters(list)
      })
      .catch(() => {})
  }, [])

  // Build query params
  const params = useMemo(() => {
    const p = new URLSearchParams()
    const preset = PRESETS[presetIdx]

    if (customVon) {
      p.set("von", customVon)
    } else if (preset.days !== null) {
      const d = new Date()
      if (preset.days === 0) {
        d.setHours(0, 0, 0, 0)
      } else {
        d.setDate(d.getDate() - preset.days)
      }
      p.set("von", d.toISOString().split("T")[0])
    }

    if (customBis) {
      p.set("bis", customBis)
    }

    if (supporterFilter) {
      p.set("supporter_id", supporterFilter)
    }
    if (kundeFilter) {
      p.set("kunde_id", kundeFilter)
    }

    return p.toString()
  }, [presetIdx, customVon, customBis, supporterFilter, kundeFilter])

  if (loading) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <Text color="gray.400">Laden...</Text>
      </Box>
    )
  }

  if (!supporter) {
    return <SupporterLogin onLogin={login} />
  }

  const renderContent = () => {
    switch (activeTab) {
      case "uebersicht":
        return <StatistikUebersicht params={params} />
      case "supporter":
        return <StatistikSupporter params={params} />
      case "kunden":
        return <StatistikKunden params={params} />
      case "zeiten":
        return <StatistikZeiten params={params} />
      case "qualitaet":
        return <StatistikQualitaet params={params} />
      case "ki":
        return <StatistikKI params={params} />
    }
  }

  return (
    <Box h="100vh" display="flex" flexDirection="column">
      {/* Header */}
      <Box
        bg="blue.500"
        color="white"
        px={4}
        py={2}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
      >
        <HStack gap={4}>
          <Heading size="md" cursor="pointer" onClick={() => navigate("/")}>
            ams.SupportDesk
          </Heading>
          <Button
            variant="ghost"
            size="sm"
            color="white"
            onClick={() => navigate("/")}
          >
            ← Tickets
          </Button>
          <Box w="1px" h="20px" bg="whiteAlpha.400" />
          <Button
            variant="ghost"
            size="sm"
            color="white"
            opacity={0.8}
            onClick={() => window.open("/portal", "_blank")}
          >
            Kunden-Portal
          </Button>
          <Button
            variant="ghost"
            size="sm"
            color="white"
            opacity={0.8}
            onClick={() => navigate("/admin")}
          >
            Admin
          </Button>
          <Button
            variant="ghost"
            size="sm"
            color="white"
            opacity={0.8}
            onClick={() => navigate("/hilfe")}
          >
            Hilfe
          </Button>
        </HStack>
        <HStack gap={3}>
          <Text fontSize="sm">{supporter.kuerzel}</Text>
          <Button variant="ghost" size="sm" color="white" onClick={logout}>
            Abmelden
          </Button>
        </HStack>
      </Box>

      {/* Tab Bar */}
      <Box
        px={4}
        py={1}
        bg="white"
        borderBottomWidth={1}
        borderColor="gray.200"
        display="flex"
        gap={1}
      >
        {TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "solid" : "ghost"}
            colorPalette="blue"
            size="sm"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </Box>

      {/* Filter Bar */}
      <Box
        px={4}
        py={2}
        bg="white"
        borderBottomWidth={1}
        borderColor="gray.200"
        display="flex"
        alignItems="center"
        gap={3}
        flexWrap="wrap"
      >
        {/* Zeitraum Presets */}
        <HStack gap={1}>
          {PRESETS.map((p, i) => (
            <Button
              key={p.label}
              size="xs"
              variant={presetIdx === i && !customVon ? "solid" : "outline"}
              colorPalette="blue"
              onClick={() => {
                setPresetIdx(i)
                setCustomVon("")
                setCustomBis("")
              }}
            >
              {p.label}
            </Button>
          ))}
        </HStack>

        <Box w="1px" h="24px" bg="gray.200" />

        {/* Custom Date Range */}
        <HStack gap={1}>
          <Text fontSize="xs" color="gray.500">Von:</Text>
          <Input
            size="xs"
            type="date"
            w="130px"
            value={customVon}
            onChange={(e) => setCustomVon(e.target.value)}
          />
          <Text fontSize="xs" color="gray.500">Bis:</Text>
          <Input
            size="xs"
            type="date"
            w="130px"
            value={customBis}
            onChange={(e) => setCustomBis(e.target.value)}
          />
        </HStack>

        <Box w="1px" h="24px" bg="gray.200" />

        {/* Supporter Filter */}
        <HStack gap={1}>
          <Text fontSize="xs" color="gray.500">Supporter:</Text>
          <select
            style={{
              fontSize: "12px",
              padding: "2px 8px",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              background: "white",
            }}
            value={supporterFilter}
            onChange={(e) => setSupporterFilter(e.target.value)}
          >
            <option value="">Alle</option>
            {supporters.map((s) => (
              <option key={s.id} value={s.id}>{s.kuerzel}</option>
            ))}
          </select>
        </HStack>
      </Box>

      {/* Content */}
      <Box flex={1} overflow="auto" p={4} bg="gray.50">
        {renderContent()}
      </Box>
    </Box>
  )
}
