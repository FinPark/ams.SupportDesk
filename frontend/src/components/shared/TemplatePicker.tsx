import { useState, useEffect, useRef, useCallback } from "react"
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
    <div
      className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[250px] overflow-y-auto z-10"
      ref={listRef}
    >
      <div className="px-3 py-1.5 border-b border-gray-100">
        <p className="text-xs text-gray-400 font-medium">
          Vorlagen {filter && `— "${filter}"`}
        </p>
      </div>
      <div className="flex flex-col">
        {filtered.map((t, idx) => (
          <div
            key={t.id}
            data-template-item
            className={`px-3 py-2 cursor-pointer hover:bg-primary-light transition-colors ${
              idx === selectedIndex ? "bg-primary-light" : ""
            } ${idx < filtered.length - 1 ? "border-b border-gray-50" : ""}`}
            onClick={() => onSelect(t.inhalt)}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">{t.name}</p>
              <p className="text-xs text-gray-400">{t.kategorie}</p>
            </div>
            {t.beschreibung && (
              <p className="text-xs text-gray-500 truncate">{t.beschreibung}</p>
            )}
          </div>
        ))}
      </div>
    </div>
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
