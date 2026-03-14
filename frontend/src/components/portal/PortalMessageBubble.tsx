import { Box } from "@chakra-ui/react"
import MarkdownRenderer from "@/components/shared/MarkdownRenderer"
import { Nachricht } from "@/lib/types"

interface Props {
  nachricht: Nachricht
}

export default function PortalMessageBubble({ nachricht }: Props) {
  const isKunde = nachricht.rolle === "kunde"

  return (
    <Box
      display="flex"
      justifyContent={isKunde ? "flex-end" : "flex-start"}
      mb={3}
    >
      <Box
        maxW="75%"
        bg={isKunde ? "blue.500" : "gray.100"}
        color={isKunde ? "white" : "gray.800"}
        px={4}
        py={3}
        borderRadius="xl"
        borderBottomRightRadius={isKunde ? "sm" : "xl"}
        borderBottomLeftRadius={isKunde ? "xl" : "sm"}
      >
        <MarkdownRenderer content={nachricht.inhalt_markdown} />
        <Box
          fontSize="xs"
          mt={1}
          opacity={0.7}
          textAlign={isKunde ? "right" : "left"}
        >
          {new Date(nachricht.created_at).toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Box>
      </Box>
    </Box>
  )
}
