import { useState } from "react"
import { Routes, Route, useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import SupporterLogin from "@/components/shared/SupporterLogin"
import AdminPage from "@/components/admin/AdminPage"
import PortalLogin from "@/components/portal/PortalLogin"
import PortalChat from "@/components/portal/PortalChat"
import Eingangskorb from "@/components/eingangskorb/Eingangskorb"
import TicketList from "@/components/tickets/TicketList"
import TicketCreate from "@/components/tickets/TicketCreate"
import TicketWorkspace from "@/components/workspace/TicketWorkspace"
import StatistikPage from "@/components/statistik/StatistikPage"
import HilfePage from "@/components/hilfe/HilfePage"

function PortalPage() {
  const [kundeId, setKundeId] = useState("")
  const [kundeName, setKundeName] = useState("")
  const [ticketId, setTicketId] = useState<string | undefined>()
  const [ticketNummer, setTicketNummer] = useState<number | undefined>()

  if (!kundeId) {
    return (
      <PortalLogin
        onIdentified={(id, name, tid, tnr) => {
          setKundeId(id)
          setKundeName(name)
          setTicketId(tid)
          setTicketNummer(tnr)
        }}
      />
    )
  }

  return (
    <PortalChat
      kundeId={kundeId}
      kundeName={kundeName}
      ticketId={ticketId}
      ticketNummer={ticketNummer}
      onBack={() => {
        setKundeId("")
        setKundeName("")
        setTicketId(undefined)
        setTicketNummer(undefined)
      }}
    />
  )
}

function TicketOverview() {
  const { supporter, loading, login, logout } = useAuth()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [view, setView] = useState<"list" | "eingangskorb">("list")

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

  const openTicket = (ticketId: string) => {
    navigate(`/workspace/${ticketId}`)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <div className="bg-primary text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2
            className="text-lg font-bold cursor-pointer"
            onClick={() => setShowCreate(false)}
          >
            ams.SupportDesk
          </h2>
          <button
            className={
              view === "list"
                ? "bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
                : "text-white opacity-80 hover:opacity-100 transition-opacity text-sm font-medium px-4 py-2"
            }
            onClick={() => { setView("list"); setShowCreate(false) }}
          >
            Tickets
          </button>
          <button
            className={
              view === "eingangskorb"
                ? "bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
                : "text-white opacity-80 hover:opacity-100 transition-opacity text-sm font-medium px-4 py-2"
            }
            onClick={() => { setView("eingangskorb"); setShowCreate(false) }}
          >
            Eingangskorb
          </button>
          <div className="w-px h-5 bg-white/40" />
          <button
            className="text-white opacity-80 hover:opacity-100 transition-opacity text-sm font-medium px-4 py-2"
            onClick={() => window.open("/portal", "_blank")}
          >
            Kunden-Portal
          </button>
          <button
            className="text-white opacity-80 hover:opacity-100 transition-opacity text-sm font-medium px-4 py-2"
            onClick={() => navigate("/statistik")}
          >
            Statistik
          </button>
          <button
            className="text-white opacity-80 hover:opacity-100 transition-opacity text-sm font-medium px-4 py-2"
            onClick={() => navigate("/admin")}
          >
            Admin
          </button>
          <button
            className="text-white opacity-80 hover:opacity-100 transition-opacity text-sm font-medium px-4 py-2"
            onClick={() => navigate("/hilfe")}
          >
            Hilfe
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="text-sm text-white border border-white/40 px-4 py-2 rounded-md hover:bg-white/10 transition-colors"
            onClick={() => setShowCreate(true)}
          >
            + Neues Ticket
          </button>
          <span className="text-sm">{supporter.kuerzel}</span>
          <button
            className="text-white opacity-80 hover:opacity-100 transition-opacity text-sm font-medium px-4 py-2"
            onClick={logout}
          >
            Abmelden
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {view === "eingangskorb" && !showCreate && (
          <div className="flex-1 p-4 overflow-y-auto">
            <Eingangskorb onTicketOpen={openTicket} />
          </div>
        )}

        {view === "list" && !showCreate && (
          <div className="w-full flex">
            <div className="flex-1 bg-white">
              <TicketList
                supporter={supporter}
                onTicketSelect={openTicket}
              />
            </div>
          </div>
        )}

        {showCreate && (
          <div className="flex-1 p-6 flex justify-center">
            <div className="w-full max-w-[600px]">
              <TicketCreate
                onCreated={openTicket}
                onCancel={() => setShowCreate(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function WorkspacePage() {
  const { supporter, loading, login, logout } = useAuth()

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

  return <TicketWorkspace supporter={supporter} onLogout={logout} />
}

function AdminPageWrapper() {
  const { supporter, loading, login } = useAuth()

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

  return <AdminPage />
}

function StatistikPageWrapper() {
  const { supporter, loading, login } = useAuth()

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

  return <StatistikPage />
}

function HilfePageWrapper() {
  const { supporter, loading, login } = useAuth()

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

  return <HilfePage />
}

export default function App() {
  return (
    <Routes>
      <Route path="/portal/*" element={<PortalPage />} />
      <Route path="/workspace/:ticketId" element={<WorkspacePage />} />
      <Route path="/admin/*" element={<AdminPageWrapper />} />
      <Route path="/statistik" element={<StatistikPageWrapper />} />
      <Route path="/hilfe" element={<HilfePageWrapper />} />
      <Route path="/*" element={<TicketOverview />} />
    </Routes>
  )
}
