export interface AuthUser {
  id: string
  email: string
  name: string | null
  isDemo: boolean
}

export interface Medication {
  id: string
  name: string
  dosage: string
  frequency: 'once_daily' | 'twice_daily' | 'three_times_daily' | 'as_needed'
  times: string // JSON array
  notes: string | null
  active: boolean
  createdAt: string
}

export interface MedLog {
  id: string
  medicationId: string
  scheduledFor: string
  takenAt: string | null
  status: 'pending' | 'taken' | 'skipped'
}

export interface MedsResponse {
  meds: Medication[]
  todayLogs: MedLog[]
  adherence: number | null
}

export type Urgency = 'SELF_CAGE' extends never ? never : 'SELF_CARE' | 'SEE_DOCTOR' | 'URGENT_CARE' | 'EMERGENCY'

export interface TriageSession {
  id: string
  symptoms: string
  response: string
  urgency: Urgency
  createdAt: string
}

export interface LabReport {
  id: string
  title: string
  rawInput: string
  explanation: string
  createdAt: string
}

export const URGENCY_META: Record<
  Urgency,
  { label: string; short: string; color: string; bg: string; border: string; icon: string; blurb: string }
> = {
  SELF_CARE: {
    label: 'Self-care appropriate',
    short: 'Self-care',
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    border: 'border-emerald-200 dark:border-emerald-900',
    icon: '🌿',
    blurb: 'Safe to manage at home with rest and self-care.',
  },
  SEE_DOCTOR: {
    label: 'See a doctor soon',
    short: 'See doctor',
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    border: 'border-amber-200 dark:border-amber-900',
    icon: '📅',
    blurb: 'Book an appointment within the next few days.',
  },
  URGENT_CARE: {
    label: 'Get seen within 24 hours',
    short: 'Urgent care',
    color: 'text-orange-700 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/50',
    border: 'border-orange-200 dark:border-orange-900',
    icon: '⚠️',
    blurb: 'Visit urgent care or a same-day clinic today.',
  },
  EMERGENCY: {
    label: 'Emergency — act now',
    short: 'Emergency',
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/50',
    border: 'border-red-200 dark:border-red-900',
    icon: '🚨',
    blurb: 'Call your local emergency number immediately.',
  },
}

export function parseUrgency(text: string): Urgency | null {
  const m = text.match(/\[URGENCY_LEVEL:\s*(SELF_CARE|SEE_DOCTOR|URGENT_CARE|EMERGENCY)\s*\]/)
  return m ? (m[1] as Urgency) : null
}

export function stripUrgency(text: string): string {
  return text.replace(/\[URGENCY_LEVEL:[^\]]*\]/g, '').trimEnd()
}

export function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Up late'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
