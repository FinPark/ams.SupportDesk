import { useState, useEffect } from "react"
import { Badge, Box, HStack, Input } from "@chakra-ui/react"
import api from "@/lib/api"
import { TicketTag } from "@/lib/types"

interface Props {
  ticketId: string
  tags: TicketTag[]
  onTagsChange: (tags: TicketTag[]) => void
}

export default function TagEditor({ ticketId, tags, onTagsChange }: Props) {
  const [input, setInput] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    const loadPopular = async () => {
      try {
        const { data } = await api.get("/tags/popular")
        setSuggestions(data.map((t: any) => t.tag))
      } catch {
        // ignore
      }
    }
    loadPopular()
  }, [])

  const addTag = async (tagName: string) => {
    const tag = tagName.replace(/^#/, "").trim().toLowerCase()
    if (!tag) return
    if (tags.some((t) => t.tag === tag)) return

    try {
      const { data } = await api.post(`/tags/${ticketId}`, { tag })
      if (data.id) {
        onTagsChange([...tags, { id: data.id, tag: data.tag, created_at: data.created_at }])
      }
    } catch {
      // ignore
    }
    setInput("")
  }

  const removeTag = async (tagId: string) => {
    try {
      await api.delete(`/tags/${ticketId}/${tagId}`)
      onTagsChange(tags.filter((t) => t.id !== tagId))
    } catch {
      // ignore
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      addTag(input)
    }
  }

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.includes(input.toLowerCase()) &&
      !tags.some((t) => t.tag === s)
  )

  return (
    <Box>
      <HStack gap={1} flexWrap="wrap" mb={2}>
        {tags.map((tag) => (
          <Badge
            key={tag.id}
            colorPalette="blue"
            variant="subtle"
            cursor="pointer"
            onClick={() => removeTag(tag.id)}
            _hover={{ opacity: 0.7 }}
          >
            #{tag.tag} ×
          </Badge>
        ))}
      </HStack>
      <Input
        placeholder="Tag hinzufügen..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        size="sm"
      />
      {input && filteredSuggestions.length > 0 && (
        <HStack gap={1} mt={1} flexWrap="wrap">
          {filteredSuggestions.slice(0, 5).map((s) => (
            <Badge
              key={s}
              variant="outline"
              cursor="pointer"
              onClick={() => addTag(s)}
              _hover={{ bg: "blue.50" }}
            >
              #{s}
            </Badge>
          ))}
        </HStack>
      )}
    </Box>
  )
}
