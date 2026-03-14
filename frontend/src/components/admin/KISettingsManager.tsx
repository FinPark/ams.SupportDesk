import { useState, useEffect } from "react"
import { Box, Button, Heading, HStack, Text, Textarea } from "@chakra-ui/react"
import api from "@/lib/api"

interface Setting {
  key: string
  value: string
}

const PROMPT_KEY = "ki_system_prompt"

const PROMPT_PLACEHOLDERS = [
  { placeholder: "{ticket_titel}", description: "Titel des Tickets" },
  { placeholder: "{kunde_name}", description: "Name des Kunden" },
  { placeholder: "{tags}", description: "Tags des Tickets" },
]

export default function KISettingsManager() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [editValue, setEditValue] = useState("")
  const [saving, setSaving] = useState(false)
  const [defaultPrompt, setDefaultPrompt] = useState("")

  const loadSettings = async () => {
    try {
      setLoading(true)
      const { data } = await api.get("/admin/settings")
      setSettings(data)
      const promptSetting = data.find((s: Setting) => s.key === PROMPT_KEY)
      if (promptSetting) {
        setEditValue(promptSetting.value)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
    api.get("/admin/ki-system-prompt/default").then(({ data }) => {
      setDefaultPrompt(data.prompt)
    }).catch(() => {})
  }, [])

  const promptSetting = settings.find((s) => s.key === PROMPT_KEY)
  const displayValue = editValue || defaultPrompt
  const hasChanged = promptSetting ? editValue !== promptSetting.value : !!editValue

  const handleReset = () => {
    if (window.confirm("Systemprompt wirklich auf den Standard zurücksetzen? Deine Änderungen gehen verloren.")) {
      setEditValue(defaultPrompt)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/admin/settings/${encodeURIComponent(PROMPT_KEY)}`, {
        value: editValue || defaultPrompt,
      })
      await loadSettings()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Text color="gray.400">KI-Einstellungen werden geladen...</Text>
  }

  return (
    <Box maxW="900px" mx="auto">
      <Heading size="md" mb={3}>KI-Antwort Systemprompt</Heading>
      <Text fontSize="sm" color="gray.500" mb={3}>
        Dieser Prompt wird bei jeder KI-Anfrage als System-Prompt gesendet.
        {!promptSetting && " (Aktuell wird der Standard-Prompt verwendet.)"}
      </Text>

      {/* Platzhalter-Info */}
      <HStack gap={3} mb={3} flexWrap="wrap">
        {PROMPT_PLACEHOLDERS.map((p) => (
          <Box
            key={p.placeholder}
            px={2}
            py={1}
            bg="blue.50"
            borderRadius="md"
            fontSize="xs"
          >
            <Text as="span" fontFamily="mono" fontWeight="bold" color="blue.600">
              {p.placeholder}
            </Text>
            <Text as="span" color="gray.500" ml={1}>
              {p.description}
            </Text>
          </Box>
        ))}
      </HStack>

      <Textarea
        value={displayValue}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditValue(e.target.value)}
        rows={18}
        fontFamily="mono"
        fontSize="sm"
        bg="white"
        borderWidth={1}
        borderColor={hasChanged ? "blue.300" : "gray.200"}
        borderRadius="md"
        p={4}
      />

      <HStack justify="flex-end" mt={3} gap={2}>
        {defaultPrompt && (
          <Button size="sm" variant="outline" onClick={handleReset}>
            Auf Standard zurücksetzen
          </Button>
        )}
        {(hasChanged || !promptSetting) && (
          <Button
            size="sm"
            colorPalette="blue"
            onClick={handleSave}
            loading={saving}
          >
            Speichern
          </Button>
        )}
      </HStack>
    </Box>
  )
}
