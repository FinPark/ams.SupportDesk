export interface Supporter {
  id: string
  kuerzel: string
  name: string
  email: string
  created_at: string
}

export interface Kunde {
  id: string
  name: string
  kundennummer: string
  email: string
  telefon: string
  bewertung_avg: number
  created_at: string
}

export interface TicketTag {
  id: string
  tag: string
  created_at: string
}

export interface Ticket {
  id: string
  nummer: number
  kunde_id: string
  supporter_id: string | null
  titel: string
  status: string
  prioritaet: string
  ki_bewertung: number | null
  created_at: string
  updated_at: string
  closed_at: string | null
  tags: TicketTag[]
  kunde_name: string | null
  supporter_kuerzel: string | null
}

export interface ChatSession {
  id: string
  ticket_id: string
  supporter_id: string | null
  kanal: string
  started_at: string
  ended_at: string | null
  kunde_bewertung: number | null
  kunde_kommentar: string | null
  supporter_bewertung: number | null
  supporter_notiz: string | null
}

export interface Nachricht {
  id: string
  session_id: string
  rolle: string
  inhalt_markdown: string
  kanal: string
  audio_ref: string | null
  markiert: boolean
  created_at: string
}

export interface EingangskorbItem {
  ticket_id: string
  nummer: number
  kunde_name: string
  titel: string
  prioritaet: string
  tags: string[]
  vorschau: string
  created_at: string
}
