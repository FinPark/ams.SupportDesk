import { Box, Text } from "@chakra-ui/react"

interface Props {
  label: string
  value: string | number
  suffix?: string
}

export default function KpiCard({ label, value, suffix }: Props) {
  return (
    <Box
      bg="white"
      borderRadius="lg"
      p={4}
      borderWidth={1}
      borderColor="gray.200"
      minW="180px"
      flex={1}
    >
      <Text fontSize="sm" color="gray.500" mb={1}>
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="bold" color="blue.500">
        {value}
        {suffix && (
          <Text as="span" fontSize="sm" fontWeight="normal" color="gray.500" ml={1}>
            {suffix}
          </Text>
        )}
      </Text>
    </Box>
  )
}
