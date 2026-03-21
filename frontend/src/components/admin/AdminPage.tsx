import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import SupporterLogin from "@/components/shared/SupporterLogin"
import TemplateManager from "./TemplateManager"
import PhasenTexteManager from "./PhasenTexteManager"
import ModelleManager from "./ModelleManager"
import MCPServerManager from "./MCPServerManager"
import RAGCollectionManager from "./RAGCollectionManager"
import KISettingsManager from "./KISettingsManager"
import SettingsManager from "./SettingsManager"

const TABS = [
  { key: "templates", label: "Vorlagen" },
  { key: "phasen", label: "Phasen-Texte" },
  { key: "modelle", label: "Modelle" },
  { key: "mcp", label: "MCP-Server" },
  { key: "rag", label: "RAG-Collections" },
  { key: "ki-settings", label: "KI-Einstellungen" },
  { key: "settings", label: "Einstellungen" },
] as const

type TabKey = (typeof TABS)[number]["key"]

function AdminPageContent() {
  const { supporter, loading, login, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>("templates")

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-gray-400">Laden...</span>
      </div>
    )
  }

  if (!supporter) {
    return <SupporterLogin onLogin={login} />
  }

  const renderContent = () => {
    switch (activeTab) {
      case "templates":
        return <TemplateManager />
      case "phasen":
        return <PhasenTexteManager />
      case "modelle":
        return <ModelleManager />
      case "mcp":
        return <MCPServerManager />
      case "rag":
        return <RAGCollectionManager />
      case "ki-settings":
        return <KISettingsManager />
      case "settings":
        return <SettingsManager />
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
            className="px-4 py-2 rounded-md text-sm text-white hover:bg-white/10"
            onClick={() => navigate("/")}
          >
            &larr; Tickets
          </button>
          <div className="w-px h-5 bg-white/40" />
          <button
            className="px-4 py-2 rounded-md text-sm text-white opacity-80 hover:bg-white/10"
            onClick={() => window.open("/portal", "_blank")}
          >
            Kunden-Portal
          </button>
          <button
            className="px-4 py-2 rounded-md text-sm text-white opacity-80 hover:bg-white/10"
            onClick={() => navigate("/statistik")}
          >
            Statistik
          </button>
          <button
            className="px-4 py-2 rounded-md text-sm text-white opacity-80 hover:bg-white/10"
            onClick={() => navigate("/hilfe")}
          >
            Hilfe
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">{supporter.kuerzel}</span>
          <button
            className="px-4 py-2 rounded-md text-sm text-white hover:bg-white/10"
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
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-white"
                : "text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 bg-gray-50">
        {renderContent()}
      </div>
    </div>
  )
}

export default function AdminPage() {
  return <AdminPageContent />
}
