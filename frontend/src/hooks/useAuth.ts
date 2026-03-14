import { useState, useEffect, useCallback } from "react"
import api from "@/lib/api"
import { Supporter } from "@/lib/types"

export function useAuth() {
  const [supporter, setSupporter] = useState<Supporter | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me")
      setSupporter(data)
    } catch {
      setSupporter(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (kuerzel: string) => {
    const { data } = await api.post("/auth/login", { kuerzel })
    setSupporter(data)
    return data
  }

  const logout = async () => {
    await api.post("/auth/logout")
    setSupporter(null)
  }

  return { supporter, loading, login, logout }
}
