import { useState, useEffect } from "react"
import { Box, Button, Heading, HStack, Text, VStack, Input } from "@chakra-ui/react"
import api from "@/lib/api"

interface Setting {
  key: string
  value: string
}

// Keys die in eigenen Tabs verwaltet werden
const HIDDEN_KEYS = new Set(["ki_system_prompt"])

export default function SettingsManager() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [editState, setEditState] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [addSaving, setAddSaving] = useState(false)

  const loadSettings = async () => {
    try {
      setLoading(true)
      const { data } = await api.get("/admin/settings")
      setSettings(data)
      const state: Record<string, string> = {}
      for (const s of data) {
        state[s.key] = s.value
      }
      setEditState(state)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSave = async (key: string) => {
    setSavingKey(key)
    try {
      await api.put(`/admin/settings/${encodeURIComponent(key)}`, {
        value: editState[key],
      })
      await loadSettings()
    } catch {
      // ignore
    } finally {
      setSavingKey(null)
    }
  }

  const handleAdd = async () => {
    if (!newKey.trim()) return
    setAddSaving(true)
    try {
      await api.put(`/admin/settings/${encodeURIComponent(newKey)}`, {
        value: newValue,
      })
      setNewKey("")
      setNewValue("")
      setShowAdd(false)
      await loadSettings()
    } catch {
      // ignore
    } finally {
      setAddSaving(false)
    }
  }

  const hasChanged = (key: string) => {
    const original = settings.find((s) => s.key === key)
    return original ? editState[key] !== original.value : false
  }

  const visibleSettings = settings.filter((s) => !HIDDEN_KEYS.has(s.key))

  if (loading) {
    return <Text color="gray.400">Einstellungen werden geladen...</Text>
  }

  return (
    <Box maxW="800px" mx="auto">
      <HStack justify="space-between" mb={4}>
        <Heading size="md">Einstellungen</Heading>
        <Button
          size="sm"
          colorPalette="blue"
          onClick={() => setShowAdd(!showAdd)}
        >
          + Neue Einstellung
        </Button>
      </HStack>

      {showAdd && (
        <Box bg="white" p={4} borderRadius="md" borderWidth={1} borderColor="gray.200" mb={4}>
          <Heading size="sm" mb={3}>Neue Einstellung</Heading>
          <HStack gap={3} align="end">
            <Box flex={1}>
              <Text fontSize="sm" fontWeight="medium" mb={1}>Schlüssel</Text>
              <Input
                value={newKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewKey(e.target.value)}
                placeholder="einstellung.name"
                size="sm"
              />
            </Box>
            <Box flex={2}>
              <Text fontSize="sm" fontWeight="medium" mb={1}>Wert</Text>
              <Input
                value={newValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewValue(e.target.value)}
                placeholder="Wert"
                size="sm"
              />
            </Box>
            <Button
              size="sm"
              colorPalette="blue"
              onClick={handleAdd}
              loading={addSaving}
              disabled={!newKey.trim()}
            >
              Hinzufügen
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
              Abbrechen
            </Button>
          </HStack>
        </Box>
      )}

      {visibleSettings.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Text color="gray.400" mb={2}>Keine Einstellungen vorhanden.</Text>
          <Text fontSize="sm" color="gray.400">
            Füge eine neue Einstellung über den Button oben hinzu.
          </Text>
        </Box>
      ) : (
        <VStack gap={2} align="stretch">
          {visibleSettings.map((s) => (
            <Box
              key={s.key}
              bg="white"
              p={3}
              borderRadius="md"
              borderWidth={1}
              borderColor="gray.200"
            >
              <HStack gap={3}>
                <Box minW="200px" flexShrink={0}>
                  <Text fontSize="sm" fontWeight="bold" fontFamily="mono">
                    {s.key}
                  </Text>
                </Box>
                <Input
                  flex={1}
                  value={editState[s.key] ?? ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditState((prev) => ({ ...prev, [s.key]: e.target.value }))
                  }
                  size="sm"
                />
                {hasChanged(s.key) && (
                  <Button
                    size="xs"
                    colorPalette="blue"
                    onClick={() => handleSave(s.key)}
                    loading={savingKey === s.key}
                    flexShrink={0}
                  >
                    Speichern
                  </Button>
                )}
              </HStack>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  )
}
