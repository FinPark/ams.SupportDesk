import { useState, useEffect, useRef, useCallback } from "react"
import { Box, HStack, Text, VStack } from "@chakra-ui/react"
import api from "@/lib/api"

interface Template {
  id: string
  name: string
  beschreibung: string | null
  inhalt: string
  kategorie: string
  is_aktiv: boolean
}

interface Props {
  visible: boolean
  filter: string
  filtered: Template[]
  selectedIndex: number
  onSelect: (inhalt: string) => void
}

export default function TemplatePicker({ visible, filter, filtered, selectedIndex, onSelect }: Props) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!listRef.current) return
    const items = listRef.current.querySelectorAll("[data-template-item]")
    items[selectedIndex]?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  if (!visible || filtered.length === 0) return null

  return (
    <Box
      position="absolute"
      bottom="100%"
      left={0}
      right={0}
      mb={1}
      bg="white"
      borderWidth={1}
      borderColor="gray.200"
      borderRadius="lg"
      shadow="lg"
      maxH="250px"
      overflowY="auto"
      zIndex={10}
      ref={listRef}
    >
      <Box px={3} py={1.5} borderBottomWidth={1} borderColor="gray.100">
        <Text fontSize="xs" color="gray.400" fontWeight="medium">
          Vorlagen {filter && `— "${filter}"`}
        </Text>
      </Box>
      <VStack gap={0} align="stretch">
        {filtered.map((t, idx) => (
          <Box
            key={t.id}
            data-template-item
            px={3}
            py={2}
            cursor="pointer"
            bg={idx === selectedIndex ? "blue.50" : "transparent"}
            _hover={{ bg: "blue.50" }}
            onClick={() => onSelect(t.inhalt)}
            borderBottomWidth={idx < filtered.length - 1 ? 1 : 0}
            borderColor="gray.50"
          >
            <HStack justify="space-between">
              <Text fontSize="sm" fontWeight="medium" color="gray.700">
                {t.name}
              </Text>
              <Text fontSize="xs" color="gray.400">
                {t.kategorie}
              </Text>
            </HStack>
            {t.beschreibung && (
              <Text fontSize="xs" color="gray.500" lineClamp={1}>
                {t.beschreibung}
              </Text>
            )}
          </Box>
        ))}
      </VStack>
    </Box>
  )
}

export function useTemplatePicker() {
  const [input, setInput] = useState("")
  const [pickerVisible, setPickerVisible] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    api.get("/admin/templates").then(({ data }) => {
      setTemplates(data.filter((t: Template) => t.is_aktiv))
    }).catch(() => {})
  }, [])

  const templateFilter = pickerVisible && input.startsWith("/")
    ? input.slice(1)
    : ""

  const searchTerm = templateFilter.toLowerCase()
  const filtered = templates.filter((t) =>
    !searchTerm ||
    t.name.toLowerCase().includes(searchTerm) ||
    t.kategorie.toLowerCase().includes(searchTerm) ||
    (t.beschreibung || "").toLowerCase().includes(searchTerm)
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [templateFilter])

  const showPicker = pickerVisible && filtered.length > 0

  const handleInputChange = (value: string) => {
    setInput(value)
    setPickerVisible(value.startsWith("/"))
  }

  const handleTemplateSelect = useCallback((inhalt: string) => {
    setInput(inhalt)
    setPickerVisible(false)
  }, [])

  const handlePickerClose = () => {
    setPickerVisible(false)
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showPicker) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        handleTemplateSelect(filtered[selectedIndex].inhalt)
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      handlePickerClose()
    }
  }, [showPicker, filtered, selectedIndex, handleTemplateSelect])

  return {
    input,
    setInput,
    pickerVisible: showPicker,
    templateFilter,
    filtered,
    selectedIndex,
    handleInputChange,
    handleTemplateSelect,
    handlePickerClose,
    handleKeyDown,
  }
}
