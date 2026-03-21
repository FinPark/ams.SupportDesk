interface Props {
  label: string
  value: string | number
  suffix?: string
}

export default function KpiCard({ label, value, suffix }: Props) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 min-w-[180px] flex-1">
      <p className="text-sm text-gray-500 mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-primary">
        {value}
        {suffix && (
          <span className="text-sm font-normal text-gray-500 ml-1">
            {suffix}
          </span>
        )}
      </p>
    </div>
  )
}
