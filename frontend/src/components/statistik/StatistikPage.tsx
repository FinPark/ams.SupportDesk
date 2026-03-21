import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Laden...</p>
      </div>
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
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-primary text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1
            className="text-lg font-bold cursor-pointer"
            onClick={() => navigate("/")}
          >
            ams.SupportDesk
          </h1>
          <button
            className="text-white text-sm hover:bg-white/10 px-2 py-1 rounded"
            onClick={() => navigate("/")}
          >
            ← Tickets
          </button>
          <div className="w-px h-5 bg-white/40" />
          <button
            className="text-white/80 text-sm hover:bg-white/10 px-2 py-1 rounded"
            onClick={() => window.open("/portal", "_blank")}
          >
            Kunden-Portal
          </button>
          <button
            className="text-white/80 text-sm hover:bg-white/10 px-2 py-1 rounded"
            onClick={() => navigate("/admin")}
          >
            Admin
          </button>
          <button
            className="text-white/80 text-sm hover:bg-white/10 px-2 py-1 rounded"
            onClick={() => navigate("/hilfe")}
          >
            Hilfe
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">{supporter.kuerzel}</span>
          <button
            className="text-white text-sm hover:bg-white/10 px-2 py-1 rounded"
            onClick={logout}
          >
            Abmelden
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="px-4 py-1 bg-white border-b border-gray-200 flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={
              activeTab === tab.key
                ? "bg-primary text-white px-3 py-1.5 rounded-md text-sm font-medium"
                : "text-sm px-3 py-1.5 rounded-md hover:bg-gray-100"
            }
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="px-4 py-2 bg-white border-b border-gray-200 flex items-center gap-3 flex-wrap">
        {/* Zeitraum Presets */}
        <div className="flex items-center gap-1">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              className={
                presetIdx === i && !customVon
                  ? "bg-primary text-white px-2 py-1 rounded-md text-xs font-medium"
                  : "border px-2 py-1 rounded-md text-xs"
              }
              onClick={() => {
                setPresetIdx(i)
                setCustomVon("")
                setCustomBis("")
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-gray-200" />

        {/* Custom Date Range */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Von:</span>
          <input
            type="date"
            className="border rounded-md px-2 py-1 text-xs w-[130px] focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={customVon}
            onChange={(e) => setCustomVon(e.target.value)}
          />
          <span className="text-xs text-gray-500">Bis:</span>
          <input
            type="date"
            className="border rounded-md px-2 py-1 text-xs w-[130px] focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={customBis}
            onChange={(e) => setCustomBis(e.target.value)}
          />
        </div>

        <div className="w-px h-6 bg-gray-200" />

        {/* Supporter Filter */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Supporter:</span>
          <select
            className="text-xs px-2 py-1 border border-gray-200 rounded-md bg-white"
            value={supporterFilter}
            onChange={(e) => setSupporterFilter(e.target.value)}
          >
            <option value="">Alle</option>
            {supporters.map((s) => (
              <option key={s.id} value={s.id}>{s.kuerzel}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 bg-gray-50">
        {renderContent()}
      </div>
    </div>
  )
}
