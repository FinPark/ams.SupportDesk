import { useState, useEffect } from "react"
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
    <div>
      <div className="flex items-center gap-1 flex-wrap mb-2">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 cursor-pointer hover:opacity-70"
            onClick={() => removeTag(tag.id)}
          >
            #{tag.tag} ×
          </span>
        ))}
      </div>
      <input
        className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        placeholder="Tag hinzufügen..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {input && filteredSuggestions.length > 0 && (
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {filteredSuggestions.slice(0, 5).map((s) => (
            <span
              key={s}
              className="inline-flex items-center px-2 py-0.5 rounded border border-blue-200 text-xs text-blue-700 cursor-pointer hover:bg-blue-50"
              onClick={() => addTag(s)}
            >
              #{s}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
