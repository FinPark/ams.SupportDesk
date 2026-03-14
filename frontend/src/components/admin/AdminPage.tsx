import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Box, Button, Heading, HStack, Text } from "@chakra-ui/react"
import { useAuth } from "@/hooks/useAuth"
import SupporterLogin from "@/components/shared/SupporterLogin"
import TemplateManager from "./TemplateManager"
import PhasenTexteManager from "./PhasenTexteManager"
import ModelleManager from "./ModelleManager"
import MCPServerManager from "./MCPServerManager"
import RAGCollectionManager from "./RAGCollectionManager"

const TABS = [
  { key: "templates", label: "Vorlagen" },
  { key: "phasen", label: "Phasen-Texte" },
  { key: "modelle", label: "Modelle" },
  { key: "mcp", label: "MCP-Server" },
  { key: "rag", label: "RAG-Collections" },
] as const

type TabKey = (typeof TABS)[number]["key"]

function AdminPageContent() {
  const { supporter, loading, login, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>("templates")

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

      {/* Content */}
      <Box flex={1} overflow="auto" p={4} bg="gray.50">
        {renderContent()}
      </Box>
    </Box>
  )
}

export default function AdminPage() {
  return <AdminPageContent />
}
