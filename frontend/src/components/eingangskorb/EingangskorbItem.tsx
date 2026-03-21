import { EingangskorbItem as EKItem } from "@/lib/types"

interface Props {
  item: EKItem
  onUebernehmen: (ticketId: string) => void
}

export default function EingangskorbItemCard({ item, onUebernehmen }: Props) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md hover:border-blue-200 transition-all duration-200">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm text-gray-700">
            <span className="text-primary">#{item.nummer}</span>{" "}
            {item.kunde_name}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(item.created_at).toLocaleString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <p className="text-sm font-medium">
          {item.titel}
        </p>

        <p className="text-xs text-gray-500 line-clamp-2">
          {item.vorschau}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 flex-wrap">
            {item.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                #{tag}
              </span>
            ))}
            {item.prioritaet !== "normal" && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  item.prioritaet === "hoch"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {item.prioritaet}
              </span>
            )}
          </div>
          <button
            className="bg-primary text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90"
            onClick={() => onUebernehmen(item.ticket_id)}
          >
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  )
}
