import { useState } from "react"
import { Box, Button, Heading, Input, Text, VStack } from "@chakra-ui/react"

interface Props {
  onLogin: (kuerzel: string) => Promise<void>
}

export default function SupporterLogin({ onLogin }: Props) {
  const [kuerzel, setKuerzel] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kuerzel.trim()) return
    setLoading(true)
    setError("")
    try {
      await onLogin(kuerzel.trim())
    } catch {
      setError("Login fehlgeschlagen")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="gray.50"
    >
      <Box bg="white" p={8} borderRadius="xl" shadow="lg" w="full" maxW="400px">
        <VStack gap={6}>
          <Heading size="lg" color="blue.500">
            ams.SupportDesk
          </Heading>
          <Text color="gray.500" textAlign="center">
            Bitte Kürzel eingeben
          </Text>
          <form onSubmit={handleSubmit} style={{ width: "100%" }}>
            <VStack gap={4}>
              <Input
                placeholder="Kürzel (z.B. AND)"
                value={kuerzel}
                onChange={(e) => setKuerzel(e.target.value)}
                size="lg"
                textAlign="center"
                textTransform="uppercase"
                maxLength={10}
                autoFocus
              />
              {error && <Text color="red.500" fontSize="sm">{error}</Text>}
              <Button
                type="submit"
                colorPalette="blue"
                size="lg"
                w="full"
                loading={loading}
              >
                Anmelden
              </Button>
            </VStack>
          </form>
        </VStack>
      </Box>
    </Box>
  )
}
