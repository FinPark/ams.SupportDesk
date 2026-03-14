import { useState, useEffect } from "react"
import { Box, Button, Heading, HStack, Text, VStack, Input, Badge } from "@chakra-ui/react"
import api from "@/lib/api"

interface Template {
  id: string
  name: string
  beschreibung: string
  inhalt: string
  kategorie: string
  aktiv: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

const KATEGORIE_OPTIONS = [
  { value: "antwort", label: "Antwort-Vorlage" },
  { value: "ki_prompt", label: "KI-Prompt" },
  { value: "begruessung", label: "Begrüssung" },
]

const KATEGORIE_COLORS: Record<string, string> = {
  antwort: "blue",
  ki_prompt: "purple",
  begruessung: "green",
}

const KATEGORIE_LABELS: Record<string, string> = {
  antwort: "Antwort-Vorlage",
  ki_prompt: "KI-Prompt",
  begruessung: "Begrüssung",
}

export default function TemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [formName, setFormName] = useState("")
  const [formBeschreibung, setFormBeschreibung] = useState("")
  const [formInhalt, setFormInhalt] = useState("")
  const [formKategorie, setFormKategorie] = useState("antwort")
  const [saving, setSaving] = useState(false)

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const { data } = await api.get("/admin/templates")
      setTemplates(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const resetForm = () => {
    setFormName("")
    setFormBeschreibung("")
    setFormInhalt("")
    setFormKategorie("antwort")
  }

  const startEdit = (t: Template) => {
    setEditingId(t.id)
    setShowCreate(false)
    setFormName(t.name)
    setFormBeschreibung(t.beschreibung)
    setFormInhalt(t.inhalt)
    setFormKategorie(t.kategorie)
  }

  const startCreate = () => {
    setEditingId(null)
    setShowCreate(true)
    resetForm()
  }

  const cancelEdit = () => {
    setEditingId(null)
    setShowCreate(false)
    resetForm()
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        name: formName,
        beschreibung: formBeschreibung,
        inhalt: formInhalt,
        kategorie: formKategorie,
      }
      if (editingId) {
        await api.put(`/admin/templates/${editingId}`, payload)
      } else {
        await api.post("/admin/templates", payload)
      }
      cancelEdit()
      await loadTemplates()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handleToggleAktiv = async (t: Template) => {
    try {
      await api.put(`/admin/templates/${t.id}`, { aktiv: !t.aktiv })
      await loadTemplates()
    } catch {
      // ignore
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/templates/${id}`)
      setDeleteConfirmId(null)
      await loadTemplates()
    } catch {
      // ignore
    }
  }

  const grouped = templates.reduce<Record<string, Template[]>>((acc, t) => {
    const key = t.kategorie || "andere"
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  const renderForm = () => (
    <Box bg="white" p={4} borderRadius="md" borderWidth={1} borderColor="gray.200" mb={4}>
      <Heading size="sm" mb={3}>
        {editingId ? "Vorlage bearbeiten" : "Neue Vorlage erstellen"}
      </Heading>
      <VStack gap={3} align="stretch">
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1}>Name</Text>
          <Input
            value={formName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormName(e.target.value)}
            placeholder="Vorlagenname"
            size="sm"
          />
        </Box>
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1}>Beschreibung</Text>
          <Input
            value={formBeschreibung}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormBeschreibung(e.target.value)}
            placeholder="Kurze Beschreibung"
            size="sm"
          />
        </Box>
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1}>Kategorie</Text>
          <select
            value={formKategorie}
            onChange={(e) => setFormKategorie(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 12px",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              fontSize: "14px",
              backgroundColor: "white",
            }}
          >
            {KATEGORIE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Box>
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1}>Inhalt</Text>
          <textarea
            value={formInhalt}
            onChange={(e) => setFormInhalt(e.target.value)}
            placeholder="Vorlagentext (Markdown möglich)"
            rows={6}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              fontSize: "14px",
              resize: "vertical",
              backgroundColor: "white",
            }}
          />
        </Box>
        <HStack gap={2}>
          <Button
            size="sm"
            colorPalette="blue"
            onClick={handleSave}
            loading={saving}
            disabled={!formName.trim() || !formInhalt.trim()}
          >
            {editingId ? "Speichern" : "Erstellen"}
          </Button>
          <Button size="sm" variant="ghost" onClick={cancelEdit}>
            Abbrechen
          </Button>
        </HStack>
      </VStack>
    </Box>
  )

  if (loading) {
    return <Text color="gray.400">Vorlagen werden geladen...</Text>
  }

  return (
    <Box maxW="900px" mx="auto">
      <HStack justify="space-between" mb={4}>
        <Heading size="md">Vorlagen</Heading>
        <Button size="sm" colorPalette="blue" onClick={startCreate}>
          + Neue Vorlage
        </Button>
      </HStack>

      {showCreate && renderForm()}

      {Object.entries(grouped).map(([kategorie, items]) => (
        <Box key={kategorie} mb={6}>
          <HStack mb={2}>
            <Badge colorPalette={KATEGORIE_COLORS[kategorie] || "gray"} size="lg">
              {KATEGORIE_LABELS[kategorie] || kategorie}
            </Badge>
            <Text fontSize="sm" color="gray.500">
              ({items.length})
            </Text>
          </HStack>

          <VStack gap={2} align="stretch">
            {items.map((t) => (
              <Box key={t.id}>
                {editingId === t.id ? (
                  renderForm()
                ) : (
                  <Box
                    bg="white"
                    p={3}
                    borderRadius="md"
                    borderWidth={1}
                    borderColor="gray.200"
                    opacity={t.aktiv ? 1 : 0.6}
                  >
                    <HStack justify="space-between" align="start">
                      <Box flex={1} minW={0}>
                        <HStack gap={2} mb={1}>
                          <Text fontWeight="bold" fontSize="sm">
                            {t.name}
                          </Text>
                          {!t.aktiv && (
                            <Badge colorPalette="gray" size="sm">
                              Inaktiv
                            </Badge>
                          )}
                          <Text fontSize="xs" color="gray.400">
                            Verwendet: {t.usage_count}x
                          </Text>
                        </HStack>
                        {t.beschreibung && (
                          <Text fontSize="sm" color="gray.600" mb={1}>
                            {t.beschreibung}
                          </Text>
                        )}
                        <Text fontSize="xs" color="gray.400" lineClamp={2}>
                          {t.inhalt}
                        </Text>
                      </Box>
                      <HStack gap={1} flexShrink={0}>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => handleToggleAktiv(t)}
                        >
                          {t.aktiv ? "Deaktivieren" : "Aktivieren"}
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => startEdit(t)}
                        >
                          Bearbeiten
                        </Button>
                        {deleteConfirmId === t.id ? (
                          <HStack gap={1}>
                            <Button
                              size="xs"
                              colorPalette="red"
                              onClick={() => handleDelete(t.id)}
                            >
                              Ja, löschen
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              Nein
                            </Button>
                          </HStack>
                        ) : (
                          <Button
                            size="xs"
                            variant="ghost"
                            color="red.500"
                            onClick={() => setDeleteConfirmId(t.id)}
                          >
                            Löschen
                          </Button>
                        )}
                      </HStack>
                    </HStack>
                  </Box>
                )}
              </Box>
            ))}
          </VStack>
        </Box>
      ))}

      {templates.length === 0 && (
        <Box textAlign="center" py={8}>
          <Text color="gray.400">Noch keine Vorlagen vorhanden.</Text>
          <Text fontSize="sm" color="gray.400">
            Erstelle eine neue Vorlage über den Button oben.
          </Text>
        </Box>
      )}
    </Box>
  )
}
