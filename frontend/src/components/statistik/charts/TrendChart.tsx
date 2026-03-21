import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts"

interface Series {
  dataKey: string
  color: string
  name: string
}

interface Props {
  title: string
  data: Record<string, any>[]
  xKey: string
  series: Series[]
  height?: number
}

export default function TrendChart({ title, data, xKey, series, height = 300 }: Props) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <p className="font-bold mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          {series.length > 1 && <Legend />}
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              stroke={s.color}
              name={s.name}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
