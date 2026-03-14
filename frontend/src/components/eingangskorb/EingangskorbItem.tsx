import { Box, Badge, Button, HStack, Text, VStack } from "@chakra-ui/react"
import { EingangskorbItem as EKItem } from "@/lib/types"

interface Props {
  item: EKItem
  onUebernehmen: (ticketId: string) => void
}

export default function EingangskorbItemCard({ item, onUebernehmen }: Props) {
  return (
    <Box
      bg="white"
      p={4}
      borderRadius="lg"
      borderWidth={1}
      borderColor="gray.200"
      _hover={{ shadow: "md", borderColor: "blue.200" }}
      transition="all 0.2s"
    >
      <VStack align="stretch" gap={2}>
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="sm" color="gray.700">
            <Text as="span" color="blue.500">#{item.nummer}</Text>{" "}
            {item.kunde_name}
          </Text>
          <Text fontSize="xs" color="gray.400">
            {new Date(item.created_at).toLocaleString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </HStack>

        <Text fontSize="sm" fontWeight="medium">
          {item.titel}
        </Text>

        <Text fontSize="xs" color="gray.500" lineClamp={2}>
          {item.vorschau}
        </Text>

        <HStack justify="space-between" align="center">
          <HStack gap={1} flexWrap="wrap">
            {item.tags.map((tag) => (
              <Badge key={tag} size="sm" colorPalette="blue" variant="subtle">
                #{tag}
              </Badge>
            ))}
            {item.prioritaet !== "normal" && (
              <Badge
                size="sm"
                colorPalette={item.prioritaet === "hoch" ? "red" : "yellow"}
              >
                {item.prioritaet}
              </Badge>
            )}
          </HStack>
          <Button
            size="sm"
            colorPalette="blue"
            onClick={() => onUebernehmen(item.ticket_id)}
          >
            Übernehmen
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}
