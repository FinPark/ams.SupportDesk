import { useState, useRef, useEffect } from "react"
import { Box, Button, HStack, Input, Text, Spinner, Badge } from "@chakra-ui/react"
import MarkdownRenderer from "@/components/shared/MarkdownRenderer"
import TemplatePicker, { useTemplatePicker } from "@/components/shared/TemplatePicker"

interface KINachricht {
  id: string
  verlauf_id?: string
  rolle: string
  inhalt_markdown: string
  created_at: string
  uebernommen_in_chat?: boolean
}

interface RAGCollection {
  id?: string
  name: string
  description?: string
  document_count?: number
}

interface Props {
  nachrichten: KINachricht[]
  onSend: (text: string) => Promise<void>
  onUebernehmen: (nachricht: KINachricht) => void
  kontextInfo?: string
  loading?: boolean
  ragCollections: RAGCollection[]
  selectedCollections: Set<string>
  onToggleCollection: (collId: string) => void
  onDeleteNachricht: (nachricht: KINachricht) => void
  isActive?: boolean
  onFocus?: () => void
}

export default function KIChat({
  nachrichten, onSend, onUebernehmen, kontextInfo, loading,
  ragCollections, selectedCollections, onToggleCollection, onDeleteNachricht,
  isActive, onFocus,
}: Props) {
  const {
    input, setInput, pickerVisible, templateFilter, filtered, selectedIndex,
    handleInputChange, handleTemplateSelect, handlePickerClose, handleKeyDown,
  } = useTemplatePicker()
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Nach created_at sortieren, damit Kontext immer über KI-Antwort steht
  const sorted = [...nachrichten].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [nachrichten, loading])

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

  const isLoading = loading || sending

  return (
    <Box display="flex" flexDirection="column" h="100%">
      {/* Header */}
      <Box
        px={4}
        py={2}
        borderBottomWidth={1}
        borderColor={isActive ? "orange.400" : "gray.200"}
        bg={isActive ? "orange.50" : "white"}
        transition="all 0.2s"
      >
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="sm" color={isActive ? "orange.600" : "gray.700"}>
            KI-Recherche
            <Text as="span" fontSize="xs" color={isActive ? "orange.400" : "gray.400"} ml={2} fontWeight="normal">
              (nur intern sichtbar)
            </Text>
          </Text>
        </HStack>
        {kontextInfo && (
          <Text fontSize="xs" color="gray.400" mt={1}>
            Kontext: "{kontextInfo}"
          </Text>
        )}
        {/* RAG-Collection-Auswahl */}
        {ragCollections.length > 0 && (
          <HStack gap={1} mt={2} flexWrap="wrap">
            <Text fontSize="xs" color="gray.500" mr={1} flexShrink={0}>
              Wissensbasis:
            </Text>
            {ragCollections.map((coll) => {
              const collId = coll.id || coll.name
              const isActive = selectedCollections.has(collId)
              return (
                <Badge
                  key={collId}
                  size="sm"
                  variant={isActive ? "solid" : "outline"}
                  colorPalette={isActive ? "blue" : "gray"}
                  cursor="pointer"
                  onClick={() => onToggleCollection(collId)}
                  _hover={{ opacity: 0.8 }}
                  userSelect="none"
                >
                  {coll.name}
                  {coll.document_count != null && (
                    <Text as="span" ml={1} opacity={0.7}>({coll.document_count})</Text>
                  )}
                </Badge>
              )
            })}
          </HStack>
        )}
      </Box>

      {/* Nachrichten */}
      <Box flex={1} overflowY="auto" px={4} py={3} bg="gray.50">
        {nachrichten.length === 0 && !isLoading && (
          <Box textAlign="center" py={10}>
            <Text color="gray.400" fontSize="sm" mb={2}>
              KI-Recherche-Chat
            </Text>
            <Text color="gray.300" fontSize="xs">
              Markiere Kundennachrichten links und sende sie hierher,
              oder stelle direkt eine Frage.
            </Text>
          </Box>
        )}
        {sorted.map((msg) => {
          const isKI = msg.rolle === "ki"
          const isKontext = !isKI && msg.inhalt_markdown.startsWith("Kontext aus dem Kundengespräch:")

          // Kontext-Block: zentriert, eigenes Styling
          if (isKontext) {
            return (
              <Box key={msg.id} mb={3}>
                <Box
                  bg="blue.50"
                  borderWidth={1}
                  borderColor="blue.200"
                  borderRadius="lg"
                  px={4}
                  py={3}
                >
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="xs" fontWeight="bold" color="blue.500">
                      Kontext aus dem Kundengespräch
                    </Text>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => onDeleteNachricht(msg)}
                      title="Löschen"
                      px={1}
                      minW="auto"
                    >
                      🗑
                    </Button>
                  </HStack>
                  <Box fontSize="sm" color="gray.700">
                    <MarkdownRenderer content={msg.inhalt_markdown.replace(/^Kontext aus dem Kundengespräch:\n\n/, "")} />
                  </Box>
                  <Text fontSize="xs" mt={1} opacity={0.5} textAlign="right">
                    {new Date(msg.created_at).toLocaleTimeString("de-DE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </Box>
              </Box>
            )
          }

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
                  <HStack gap={1}>
                    {isKI && (
                      <Button
                        size="xs"
                        variant={msg.uebernommen_in_chat ? "solid" : "outline"}
                        colorPalette={msg.uebernommen_in_chat ? "green" : "blue"}
                        onClick={() => !msg.uebernommen_in_chat && onUebernehmen(msg)}
                        disabled={msg.uebernommen_in_chat}
                      >
                        {msg.uebernommen_in_chat ? "Übernommen" : "→ Übernehmen"}
                      </Button>
                    )}
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => onDeleteNachricht(msg)}
                      title="Löschen"
                      px={1}
                      minW="auto"
                    >
                      🗑
                    </Button>
                  </HStack>
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
        {isLoading && (
          <Box display="flex" justifyContent="flex-start" mb={3}>
            <Box
              bg="white"
              px={4}
              py={3}
              borderRadius="xl"
              borderBottomLeftRadius="sm"
              shadow="sm"
            >
              <HStack gap={2}>
                <Spinner size="sm" color="blue.400" />
                <Text fontSize="sm" color="gray.500">KI denkt nach...</Text>
              </HStack>
            </Box>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Eingabe */}
      <Box bg="white" borderTopWidth={1} borderColor="gray.200" px={4} py={3} position="relative">
        <TemplatePicker
          visible={pickerVisible}
          filter={templateFilter}
          filtered={filtered}
          selectedIndex={selectedIndex}
          onSelect={handleTemplateSelect}
        />
        <form onSubmit={handleSend}>
          <HStack>
            <Input
              placeholder="Rückfrage an KI... (/ für Vorlagen)"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={onFocus}
              flex={1}
              disabled={isLoading}
            />
            <Button
              type="submit"
              colorPalette="blue"
              variant="outline"
              loading={isLoading}
              disabled={!input.trim() || isLoading}
            >
              Senden
            </Button>
          </HStack>
        </form>
      </Box>
    </Box>
  )
}
