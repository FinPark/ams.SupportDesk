import { Box, Text } from "@chakra-ui/react"
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts"

const COLORS = [
  "#003459", "#1A5D99", "#4D81B0", "#80A5C7", "#B3C9DE",
  "#E6960A", "#E65A0A", "#4CAF50", "#9C27B0", "#607D8B",
]

interface Props {
  title: string
  data: Record<string, any>[]
  nameKey: string
  valueKey: string
  type: "pie" | "bar"
  height?: number
}

export default function DistributionChart({ title, data, nameKey, valueKey, type, height = 300 }: Props) {
  return (
    <Box bg="white" borderRadius="lg" p={4} borderWidth={1} borderColor="gray.200" flex={1} minW={0}>
      <Text fontWeight="bold" mb={3}>{title}</Text>
      <ResponsiveContainer width="100%" height={height}>
        {type === "pie" ? (
          <PieChart>
            <Pie
              data={data}
              dataKey={valueKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={(props: any) =>
                `${props.name || ""} (${((props.percent ?? 0) * 100).toFixed(0)}%)`
              }
              labelLine={true}
              fontSize={12}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={nameKey} fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Bar dataKey={valueKey} fill="#003459" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </Box>
  )
}
