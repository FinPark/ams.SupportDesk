import { useState, useRef, useEffect } from "react"
import { Box, Button, HStack, Input, Text } from "@chakra-ui/react"
import MarkdownRenderer from "@/components/shared/MarkdownRenderer"
import TemplatePicker, { useTemplatePicker } from "@/components/shared/TemplatePicker"
import { Nachricht } from "@/lib/types"

interface Props {
  nachrichten: Nachricht[]
  onSend: (text: string) => Promise<void>
  onSendToKI: (markierte: Nachricht[]) => void
  onDeleteNachricht: (nachricht: Nachricht) => void
  disabled?: boolean
  isActive?: boolean
  onFocus?: () => void
}

export default function KundenChat({ nachrichten, onSend, onSendToKI, onDeleteNachricht, disabled, isActive, onFocus }: Props) {
  const {
    input, setInput, pickerVisible, templateFilter, filtered, selectedIndex,
    handleInputChange, handleTemplateSelect, handlePickerClose, handleKeyDown,
  } = useTemplatePicker()
  const [sending, setSending] = useState(false)
  const [markierte, setMarkierte] = useState<Set<string>>(new Set())
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

  const toggleMarkiert = (id: string) => {
    setMarkierte((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSendToKI = () => {
    const msgs = nachrichten.filter((n) => markierte.has(n.id))
    if (msgs.length > 0) {
      onSendToKI(msgs)
      setMarkierte(new Set())
    }
  }

  return (
    <Box display="flex" flexDirection="column" h="100%" borderRightWidth={1} borderColor="gray.200">
      {/* Header */}
      <Box
        px={4}
        py={2}
        borderBottomWidth={1}
        borderColor={isActive ? "blue.400" : "gray.200"}
        bg={isActive ? "blue.50" : "white"}
        transition="all 0.2s"
      >
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="sm" color={isActive ? "blue.600" : "gray.700"}>
            Kundengespräch
          </Text>
          {markierte.size > 0 && (
            <Button
              size="xs"
              colorPalette="blue"
              variant="outline"
              onClick={handleSendToKI}
            >
              {markierte.size} Nachricht{markierte.size > 1 ? "en" : ""} an KI senden →
            </Button>
          )}
        </HStack>
      </Box>

      {/* Nachrichten */}
      <Box flex={1} overflowY="auto" px={4} py={3} bg="gray.50">
        {nachrichten.length === 0 && (
          <Box textAlign="center" py={10}>
            <Text color="gray.400" fontSize="sm">Noch keine Nachrichten</Text>
          </Box>
        )}
        {nachrichten.map((msg) => {
          const isSupporter = msg.rolle === "supporter"
          const isMarked = markierte.has(msg.id)

          return (
            <Box
              key={msg.id}
              display="flex"
              justifyContent={isSupporter ? "flex-end" : "flex-start"}
              mb={3}
              position="relative"
            >
              {/* Markier-Indikator links */}
              {!isSupporter && (
                <Box
                  w="4px"
                  bg={isMarked ? "blue.400" : "transparent"}
                  borderRadius="full"
                  mr={2}
                  cursor="pointer"
                  _hover={{ bg: isMarked ? "blue.500" : "gray.300" }}
                  onClick={() => toggleMarkiert(msg.id)}
                  flexShrink={0}
                  alignSelf="stretch"
                  title={isMarked ? "Markierung entfernen" : "Für KI markieren"}
                />
              )}
              <Box
                maxW="80%"
                bg={isSupporter ? (isMarked ? "blue.600" : "blue.500") : isMarked ? "blue.50" : "white"}
                color={isSupporter ? "white" : "gray.800"}
                px={4}
                py={3}
                borderRadius="xl"
                borderBottomRightRadius={isSupporter ? "sm" : "xl"}
                borderBottomLeftRadius={isSupporter ? "xl" : "sm"}
                shadow="sm"
                cursor="pointer"
                onClick={() => toggleMarkiert(msg.id)}
                borderWidth={isMarked ? 1 : 0}
                borderColor={isSupporter ? "blue.200" : "blue.300"}
                transition="all 0.15s"
              >
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs" fontWeight="bold" opacity={0.6}>
                    {isSupporter ? "Support" : "Kunde"}
                    {isMarked && (
                      <Text as="span" color={isSupporter ? "blue.100" : "blue.500"} ml={2}>● markiert</Text>
                    )}
                  </Text>
                  {isSupporter && (
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm("Nachricht wirklich löschen?")) {
                          onDeleteNachricht(msg)
                        }
                      }}
                      title="Löschen"
                      px={1}
                      minW="auto"
                    >
                      🗑
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
              {/* Markier-Indikator rechts für Supporter */}
              {isSupporter && (
                <Box
                  w="4px"
                  bg={isMarked ? "blue.400" : "transparent"}
                  borderRadius="full"
                  ml={2}
                  cursor="pointer"
                  _hover={{ bg: isMarked ? "blue.500" : "gray.300" }}
                  onClick={() => toggleMarkiert(msg.id)}
                  flexShrink={0}
                  alignSelf="stretch"
                  title={isMarked ? "Markierung entfernen" : "Für KI markieren"}
                />
              )}
            </Box>
          )
        })}
        <div ref={messagesEndRef} />
      </Box>

      {/* Eingabe */}
      {!disabled && (
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
                placeholder="Antwort an Kunden... (/ für Vorlagen)"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={onFocus}
                flex={1}
              />
              <Button
                type="submit"
                colorPalette="blue"
                loading={sending}
                disabled={!input.trim()}
              >
                Senden
              </Button>
            </HStack>
          </form>
        </Box>
      )}
    </Box>
  )
}
