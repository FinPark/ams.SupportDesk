import { useState } from "react"

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-[400px]">
        <div className="flex flex-col gap-6 items-center">
          <h1 className="text-2xl font-bold text-primary">
            ams.SupportDesk
          </h1>
          <p className="text-gray-500 text-center text-sm">
            Bitte Kürzel eingeben
          </p>
          <form onSubmit={handleSubmit} className="w-full">
            <div className="flex flex-col gap-4">
              <input
                className="w-full border rounded-md px-3 py-3 text-lg text-center uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow"
                placeholder="Kürzel (z.B. AND)"
                value={kuerzel}
                onChange={(e) => setKuerzel(e.target.value)}
                maxLength={10}
                autoFocus
              />
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <button
                type="submit"
                className="w-full bg-primary text-white py-3 rounded-md text-base font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                disabled={loading || !kuerzel.trim()}
              >
                {loading ? "Anmelden..." : "Anmelden"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
