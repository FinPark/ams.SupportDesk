import { useState, useRef, useEffect } from "react"
import { Box, Button, HStack, Input, Text } from "@chakra-ui/react"
import MarkdownRenderer from "@/components/shared/MarkdownRenderer"

interface KINachricht {
  id: string
  rolle: string
  inhalt_markdown: string
  created_at: string
  uebernommen?: boolean
}

interface Props {
  nachrichten: KINachricht[]
  onSend: (text: string) => Promise<void>
  onUebernehmen: (nachricht: KINachricht) => void
  kontextInfo?: string
}

export default function KIChat({ nachrichten, onSend, onUebernehmen, kontextInfo }: Props) {
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [nachrichten])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    setSending(true)
    try {
      await onSend(input.trim())
      setInput("")
    } finally {
      setSending(false)
    }
  }

  return (
    <Box display="flex" flexDirection="column" h="100%">
      {/* Header */}
      <Box px={4} py={2} borderBottomWidth={1} borderColor="gray.200" bg="white">
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="sm" color="gray.700">
            KI-Recherche
            <Text as="span" fontSize="xs" color="gray.400" ml={2} fontWeight="normal">
              (nur intern sichtbar)
            </Text>
          </Text>
        </HStack>
        {kontextInfo && (
          <Text fontSize="xs" color="gray.400" mt={1}>
            Kontext: "{kontextInfo}"
          </Text>
        )}
      </Box>

      {/* Nachrichten */}
      <Box flex={1} overflowY="auto" px={4} py={3} bg="gray.50">
        {nachrichten.length === 0 && (
          <Box textAlign="center" py={10}>
            <Text color="gray.400" fontSize="sm" mb={2}>
              KI-Recherche-Chat
            </Text>
            <Text color="gray.300" fontSize="xs">
              Markiere Kundennachrichten links und sende sie hierher,
              oder stelle direkt eine Frage.
            </Text>
            <Box mt={4} p={3} bg="orange.50" borderRadius="md" borderWidth={1} borderColor="orange.200">
              <Text color="orange.600" fontSize="xs">
                KI-Anbindung wird in Phase 2 aktiviert.
                Aktuell werden Nachrichten nur gespeichert.
              </Text>
            </Box>
          </Box>
        )}
        {nachrichten.map((msg) => {
          const isKI = msg.rolle === "ki"

          return (
            <Box
              key={msg.id}
              display="flex"
              justifyContent={isKI ? "flex-start" : "flex-end"}
              mb={3}
            >
              <Box
                maxW="85%"
                bg={isKI ? "white" : "blue.500"}
                color={isKI ? "gray.800" : "white"}
                px={4}
                py={3}
                borderRadius="xl"
                borderBottomLeftRadius={isKI ? "sm" : "xl"}
                borderBottomRightRadius={isKI ? "xl" : "sm"}
                shadow="sm"
              >
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs" fontWeight="bold" opacity={0.6}>
                    {isKI ? "KI" : "Supporter"}
                  </Text>
                  {isKI && (
                    <Button
                      size="xs"
                      variant={msg.uebernommen ? "solid" : "outline"}
                      colorPalette={msg.uebernommen ? "green" : "blue"}
                      onClick={() => !msg.uebernommen && onUebernehmen(msg)}
                      disabled={msg.uebernommen}
                    >
                      {msg.uebernommen ? "Übernommen" : "→ Übernehmen"}
                    </Button>
                  )}
                </HStack>
                <MarkdownRenderer content={msg.inhalt_markdown} />
                <Text fontSize="xs" mt={1} opacity={0.5} textAlign="right">
                  {new Date(msg.created_at).toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </Box>
            </Box>
          )
        })}
        <div ref={messagesEndRef} />
      </Box>

      {/* Eingabe */}
      <Box bg="white" borderTopWidth={1} borderColor="gray.200" px={4} py={3}>
        <form onSubmit={handleSend}>
          <HStack>
            <Input
              placeholder="Rückfrage an KI..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              flex={1}
            />
            <Button
              type="submit"
              colorPalette="blue"
              variant="outline"
              loading={sending}
              disabled={!input.trim()}
            >
              Senden
            </Button>
          </HStack>
        </form>
      </Box>
    </Box>
  )
}
