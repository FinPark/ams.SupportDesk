import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#E6EDF5" },
          100: { value: "#B3C9DE" },
          200: { value: "#80A5C7" },
          300: { value: "#4D81B0" },
          400: { value: "#1A5D99" },
          500: { value: "#003459" },
          600: { value: "#002D4D" },
          700: { value: "#002640" },
          800: { value: "#001F34" },
          900: { value: "#001827" },
        },
        blue: {
          50: { value: "#E6EDF5" },
          100: { value: "#B3C9DE" },
          200: { value: "#80A5C7" },
          300: { value: "#4D81B0" },
          400: { value: "#1A5D99" },
          500: { value: "#003459" },
          600: { value: "#002D4D" },
          700: { value: "#002640" },
          800: { value: "#001F34" },
          900: { value: "#001827" },
        },
      },
    },
    semanticTokens: {
      colors: {
        "bg.surface": {
          value: { _light: "white", _dark: "{colors.gray.900}" },
        },
        "bg.sidebar": {
          value: { _light: "{colors.gray.50}", _dark: "{colors.gray.950}" },
        },
        "bg.chat": {
          value: { _light: "white", _dark: "{colors.gray.900}" },
        },
        "bg.input": {
          value: { _light: "white", _dark: "{colors.gray.800}" },
        },
        "msg.kunde": {
          value: { _light: "{colors.gray.100}", _dark: "{colors.gray.700}" },
        },
        "msg.supporter": {
          value: { _light: "#E6EDF5", _dark: "{colors.blue.900}" },
        },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
