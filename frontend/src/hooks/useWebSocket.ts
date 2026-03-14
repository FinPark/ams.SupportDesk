import { useEffect, useRef, useCallback, useState } from "react"

export function useWebSocket(path: string, onMessage: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const url = `${protocol}//${window.location.host}${path}`
    const ws = new WebSocket(url)

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      // Reconnect nach 3 Sekunden
      setTimeout(connect, 3000)
    }
    ws.onmessage = (event) => {
      if (event.data === "pong") return
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch {
        // ignore
      }
    }

    wsRef.current = ws
  }, [path, onMessage])

  useEffect(() => {
    connect()
    // Ping alle 30s
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send("ping")
      }
    }, 30000)

    return () => {
      clearInterval(interval)
      wsRef.current?.close()
    }
  }, [connect])

  return { connected }
}
