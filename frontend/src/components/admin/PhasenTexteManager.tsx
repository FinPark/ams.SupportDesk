import { useState, useEffect } from "react"
import { Box, Button, Heading, HStack, Text, VStack, Input, Badge } from "@chakra-ui/react"
import api from "@/lib/api"

interface PhasenText {
  id: string
  phase: string
  titel: string
  inhalt: string
  timeout_seconds: number | null
  aktiv: boolean
  created_at: string
  updated_at: string
}

const PHASE_COLORS: Record<string, string> = {
  eingang: "yellow",
  in_bearbeitung: "blue",
  wartet: "orange",
  geloest: "green",
  bewertung: "purple",
  geschlossen: "gray",
}

const PHASE_LABELS: Record<string, string> = {
  eingang: "Eingang",
  in_bearbeitung: "In Bearbeitung",
  wartet: "Wartet auf Kunde",
  geloest: "Gelöst",
  bewertung: "Bewertung",
  geschlossen: "Geschlossen",
}

const INPUT_BG = "#EDF2F7"

export default function PhasenTexteManager() {
  const [phasenTexte, setPhasenTexte] = useState<PhasenText[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [editState, setEditState] = useState<Record<string, { titel: string; inhalt: string; timeout_seconds: string; aktiv: boolean }>>({})

  const loadPhasenTexte = async () => {
    try {
      setLoading(true)
      const { data } = await api.get("/admin/phasen-texte")
      setPhasenTexte(data)
      const state: Record<string, { titel: string; inhalt: string; timeout_seconds: string; aktiv: boolean }> = {}
      for (const pt of data) {
        state[pt.id] = {
          titel: pt.titel,
          inhalt: pt.inhalt,
          timeout_seconds: pt.timeout_seconds !== null ? String(pt.timeout_seconds) : "",
          aktiv: pt.aktiv,
        }
      }
      setEditState(state)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPhasenTexte()
  }, [])

  const handleSeed = async () => {
    setSeeding(true)
    try {
      await api.post("/admin/phasen-texte/seed")
      await loadPhasenTexte()
    } catch {
      // ignore
    } finally {
      setSeeding(false)
    }
  }

  const handleSave = async (pt: PhasenText) => {
    const state = editState[pt.id]
    if (!state) return
    setSavingId(pt.id)
    try {
      await api.put(`/admin/phasen-texte/${pt.id}`, {
        titel: state.titel,
        inhalt: state.inhalt,
        timeout_seconds: state.timeout_seconds ? parseInt(state.timeout_seconds, 10) : null,
        aktiv: state.aktiv,
      })
      await loadPhasenTexte()
    } catch {
      // ignore
    } finally {
      setSavingId(null)
    }
  }

  const updateField = (id: string, field: string, value: string | boolean) => {
    setEditState((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const hasChanges = (pt: PhasenText) => {
    const state = editState[pt.id]
    if (!state) return false
    return (
      state.titel !== pt.titel ||
      state.inhalt !== pt.inhalt ||
      state.aktiv !== pt.aktiv ||
      (state.timeout_seconds || "") !== (pt.timeout_seconds !== null ? String(pt.timeout_seconds) : "")
    )
  }

  if (loading) {
    return <Text color="gray.400">Phasen-Texte werden geladen...</Text>
  }

  return (
    <Box maxW="900px" mx="auto">
      <HStack justify="space-between" mb={4}>
        <Heading size="md">Phasen-Texte</Heading>
        <Button
          size="sm"
          colorPalette="blue"
          variant="outline"
          onClick={handleSeed}
          loading={seeding}
        >
          Standardtexte laden
        </Button>
      </HStack>

      {phasenTexte.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Text color="gray.400" mb={2}>Noch keine Phasen-Texte vorhanden.</Text>
          <Text fontSize="sm" color="gray.400">
            Klicke auf "Standardtexte laden" um die Vorlagen zu initialisieren.
          </Text>
        </Box>
      ) : (
        <VStack gap={2} align="stretch">
          {phasenTexte.map((pt) => {
            const state = editState[pt.id]
            if (!state) return null
            const isOpen = openIds.has(pt.id)

            return (
              <Box
                key={pt.id}
                bg="white"
                borderRadius="md"
                borderWidth={1}
                borderColor={isOpen ? "blue.200" : "gray.200"}
                opacity={state.aktiv ? 1 : 0.6}
                transition="all 0.15s"
              >
                {/* Collapsed header — immer sichtbar */}
                <HStack
                  justify="space-between"
                  px={4}
                  py={3}
                  cursor="pointer"
                  onClick={() => toggleOpen(pt.id)}
                  _hover={{ bg: "gray.50" }}
                  borderRadius="md"
                >
                  <HStack gap={3}>
                    <Text fontSize="sm" color="gray.400" w="16px">
                      {isOpen ? "▾" : "▸"}
                    </Text>
                    <Badge colorPalette={PHASE_COLORS[pt.phase] || "gray"} size="lg">
                      {PHASE_LABELS[pt.phase] || pt.phase}
                    </Badge>
                    <Text fontSize="sm" color="gray.600">{state.titel}</Text>
                    {!state.aktiv && (
                      <Badge colorPalette="gray" size="sm">Inaktiv</Badge>
                    )}
                  </HStack>
                  <HStack gap={2} onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => updateField(pt.id, "aktiv", !state.aktiv)}
                    >
                      {state.aktiv ? "Deaktivieren" : "Aktivieren"}
                    </Button>
                    {hasChanges(pt) && (
                      <Button
                        size="xs"
                        colorPalette="blue"
                        onClick={() => handleSave(pt)}
                        loading={savingId === pt.id}
                      >
                        Speichern
                      </Button>
                    )}
                  </HStack>
                </HStack>

                {/* Expanded content */}
                {isOpen && (
                  <Box px={4} pb={4} pt={1}>
                    <VStack gap={3} align="stretch">
                      <Box>
                        <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={1}>
                          Titel
                        </Text>
                        <Input
                          value={state.titel}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateField(pt.id, "titel", e.target.value)
                          }
                          size="sm"
                          bg={INPUT_BG}
                          borderColor="gray.200"
                        />
                      </Box>
                      <Box>
                        <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={1}>
                          Inhalt
                        </Text>
                        <textarea
                          value={state.inhalt}
                          onChange={(e) => updateField(pt.id, "inhalt", e.target.value)}
                          rows={4}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid #E2E8F0",
                            borderRadius: "6px",
                            fontSize: "14px",
                            resize: "vertical",
                            backgroundColor: INPUT_BG,
                          }}
                        />
                      </Box>
                      <Box>
                        <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={1}>
                          Timeout (Sekunden)
                        </Text>
                        <Input
                          value={state.timeout_seconds}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateField(pt.id, "timeout_seconds", e.target.value)
                          }
                          placeholder="Kein Timeout"
                          size="sm"
                          type="number"
                          maxW="200px"
                          bg={INPUT_BG}
                          borderColor="gray.200"
                        />
                      </Box>
                    </VStack>
                  </Box>
                )}
              </Box>
            )
          })}
        </VStack>
      )}
    </Box>
  )
}
