import { useState } from "react"
import { Routes, Route, useNavigate } from "react-router-dom"
import { Box, Button, Heading, HStack, Text } from "@chakra-ui/react"
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
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <Text color="gray.400">Laden...</Text>
      </Box>
    )
  }

  if (!supporter) {
    return <SupporterLogin onLogin={login} />
  }

  const openTicket = (ticketId: string) => {
    navigate(`/workspace/${ticketId}`)
  }

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      {/* Top Bar */}
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
          <Heading size="md" cursor="pointer" onClick={() => setShowCreate(false)}>
            ams.SupportDesk
          </Heading>
          <Button
            variant={view === "list" ? "solid" : "ghost"}
            size="sm"
            color="white"
            onClick={() => { setView("list"); setShowCreate(false) }}
          >
            Tickets
          </Button>
          <Button
            variant={view === "eingangskorb" ? "solid" : "ghost"}
            size="sm"
            color="white"
            onClick={() => { setView("eingangskorb"); setShowCreate(false) }}
          >
            Eingangskorb
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
            onClick={() => navigate("/statistik")}
          >
            Statistik
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
        </HStack>
        <HStack gap={3}>
          <Button
            size="sm"
            variant="outline"
            color="white"
            borderColor="whiteAlpha.400"
            onClick={() => setShowCreate(true)}
          >
            + Neues Ticket
          </Button>
          <Text fontSize="sm">{supporter.kuerzel}</Text>
          <Button variant="ghost" size="sm" color="white" onClick={logout}>
            Abmelden
          </Button>
        </HStack>
      </Box>

      {/* Content */}
      <Box flex={1} display="flex" overflow="hidden">
        {view === "eingangskorb" && !showCreate && (
          <Box flex={1} p={4} overflowY="auto">
            <Eingangskorb onTicketOpen={openTicket} />
          </Box>
        )}

        {view === "list" && !showCreate && (
          <Box w="100%" display="flex">
            <Box flex={1} bg="white">
              <TicketList
                supporter={supporter}
                onTicketSelect={openTicket}
              />
            </Box>
          </Box>
        )}

        {showCreate && (
          <Box flex={1} p={6} display="flex" justifyContent="center">
            <Box w="full" maxW="600px">
              <TicketCreate
                onCreated={openTicket}
                onCancel={() => setShowCreate(false)}
              />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
}

function WorkspacePage() {
  const { supporter, loading, login, logout } = useAuth()

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

  return <TicketWorkspace supporter={supporter} onLogout={logout} />
}

function AdminPageWrapper() {
  const { supporter, loading, login } = useAuth()

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

  return <AdminPage />
}

function StatistikPageWrapper() {
  const { supporter, loading, login } = useAuth()

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

  return <StatistikPage />
}

export default function App() {
  return (
    <Routes>
      <Route path="/portal/*" element={<PortalPage />} />
      <Route path="/workspace/:ticketId" element={<WorkspacePage />} />
      <Route path="/admin/*" element={<AdminPageWrapper />} />
      <Route path="/statistik" element={<StatistikPageWrapper />} />
      <Route path="/*" element={<TicketOverview />} />
    </Routes>
  )
}
