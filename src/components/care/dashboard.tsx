'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  HeartPulse,
  LayoutDashboard,
  Stethoscope,
  Pill,
  FileText,
  ClipboardList,
  LogOut,
  Loader2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { authFetch } from '@/lib/client-auth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Markdown } from '@/components/care/markdown'
import { Triage } from '@/components/care/triage'
import { Medications } from '@/components/care/medications'
import { Labs } from '@/components/care/labs'
import { VisitPrep } from '@/components/care/visit-prep'
import { A11yButton } from '@/components/care/a11y'
import type { A11yState } from '@/components/care/a11y'
import {
  fmtDate,
  greeting,
  stripUrgency,
  URGENCY_META,
  type AuthUser,
  type LabReport,
  type MedsResponse,
  type TriageSession,
  type Urgency,
} from '@/lib/types'

export type Tab = 'overview' | 'triage' | 'medications' | 'labs' | 'visit-prep'

const NAV: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'triage', label: 'Symptom Check', icon: Stethoscope },
  { id: 'medications', label: 'Medications', icon: Pill },
  { id: 'labs', label: 'Lab Reports', icon: FileText },
  { id: 'visit-prep', label: 'Visit Prep', icon: ClipboardList },
]

export function Dashboard({
  user,
  onLogout,
  a11y,
  setA11y,
}: {
  user: AuthUser
  onLogout: () => void
  a11y: A11yState
  setA11y: (s: A11yState) => void
}) {
  const [tab, setTab] = useState<Tab>('overview')

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar lg:flex" aria-label="Main navigation">
        <div className="flex h-16 items-center gap-2.5 border-b px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <HeartPulse className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-lg font-bold tracking-tight">CarePilot</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Sections">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                tab === item.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <item.icon className="h-4.5 w-4.5" aria-hidden />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t p-3">
          {user.isDemo && (
            <p className="mb-2 flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Judge demo account
            </p>
          )}
          <div className="flex items-center gap-2.5 rounded-xl p-2">
            <Avatar className="h-9 w-9" aria-hidden>
              <AvatarFallback className="bg-primary/15 font-bold text-primary">
                {(user.name || user.email)[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name || 'Friend'}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={onLogout}
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HeartPulse className="h-4.5 w-4.5" aria-hidden />
            </span>
            <span className="font-bold tracking-tight">CarePilot</span>
          </div>
          <div className="flex items-center gap-1.5">
            {user.isDemo && (
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10" variant="secondary">
                Demo
              </Badge>
            )}
            <A11yButton a11y={a11y} setA11y={setA11y} />
            <Button
              size="icon"
              variant="ghost"
              onClick={onLogout}
              className="h-10 w-10 text-muted-foreground hover:text-destructive"
              aria-label="Sign out"
            >
              <LogOut className="h-4.5 w-4.5" aria-hidden />
            </Button>
          </div>
        </header>

        {/* Desktop a11y button */}
        <div className="hidden justify-end px-6 pt-5 lg:flex">
          <A11yButton a11y={a11y} setA11y={setA11y} />
        </div>

        <main id="main-content" className="flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-0">
          <div className="mx-auto max-w-5xl">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {tab === 'overview' && <Overview user={user} go={setTab} />}
              {tab === 'triage' && <Triage />}
              {tab === 'medications' && <Medications />}
              {tab === 'labs' && <Labs />}
              {tab === 'visit-prep' && <VisitPrep />}
            </motion.div>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? 'page' : undefined}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[0.65rem] font-medium ${
              tab === item.id ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <item.icon className="h-5 w-5" aria-hidden />
            {item.label.split(' ')[0]}
          </button>
        ))}
      </nav>
    </div>
  )
}

function Overview({ user, go }: { user: AuthUser; go: (t: Tab) => void }) {
  const [meds, setMeds] = useState<MedsResponse | null>(null)
  const [sessions, setSessions] = useState<TriageSession[]>([])
  const [reports, setReports] = useState<LabReport[]>([])
  const [viewing, setViewing] = useState<TriageSession | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [m, s, r] = await Promise.all([
        authFetch('/api/medications').then((x) => (x.ok ? x.json() : null)),
        authFetch('/api/triage/history').then((x) => (x.ok ? x.json() : null)),
        authFetch('/api/labs').then((x) => (x.ok ? x.json() : null)),
      ])
      if (m) setMeds(m)
      if (s) setSessions(s.sessions ?? [])
      if (r) setReports(r.reports ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const todayTotal = meds?.meds.filter((m) => m.frequency !== 'as_needed').reduce((n, m) => n + JSON.parse(m.times).length, 0) ?? 0
  const todayLogs = meds?.todayLogs ?? []
  const todayTaken = todayLogs.filter((l) => l.status === 'taken').length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {greeting()}, {user.name?.split(' ')[0] || 'friend'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <QuickAction
          onClick={() => go('triage')}
          icon={<Stethoscope className="h-5 w-5" aria-hidden />}
          title="Check a symptom"
          desc="Not feeling right? Get a care level in minutes."
        />
        <QuickAction
          onClick={() => go('labs')}
          icon={<FileText className="h-5 w-5" aria-hidden />}
          title="Explain lab results"
          desc="Paste numbers, get plain English."
        />
        <QuickAction
          onClick={() => go('visit-prep')}
          icon={<ClipboardList className="h-5 w-5" aria-hidden />}
          title="Prep a doctor visit"
          desc="Walk in with a one-page summary."
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's doses" value={`${todayTaken}/${todayTotal}`} sub={todayTotal > 0 ? `${todayTaken} taken so far` : 'Nothing scheduled'}>
          <Progress value={todayTotal ? (todayTaken / todayTotal) * 100 : 0} className="mt-2" aria-label="Today's dose progress" />
        </StatCard>
        <StatCard label="7-day adherence" value={meds?.adherence != null ? `${meds.adherence}%` : '—'} sub="Doses taken on schedule" />
        <StatCard label="Symptom checks" value={String(sessions.length)} sub={sessions.length > 0 ? 'Latest in the list below' : 'Try your first check'} />
        <StatCard label="Lab reports" value={String(reports.length)} sub={reports.length > 0 ? 'Translated to plain English' : 'Paste one to try'} />
      </div>

      {/* Today's medications */}
      <Card className="shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Today&rsquo;s medications</h2>
            <Button variant="outline" size="sm" onClick={() => go('medications')} className="h-10 gap-1.5">
              Manage <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
            </div>
          ) : todayTotal === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No medications yet. Add one to start tracking doses and adherence.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {(meds?.meds ?? [])
                .filter((m) => m.frequency !== 'as_needed')
                .flatMap((m) => {
                  const times: string[] = JSON.parse(m.times)
                  return times.map((t) => {
                    const log = todayLogs.find(
                      (l) => l.medicationId === m.id && l.status !== 'pending' &&
                        new Date(l.scheduledFor).toDateString() === new Date().toDateString() &&
                        `${String(new Date(l.scheduledFor).getHours()).padStart(2, '0')}:${String(new Date(l.scheduledFor).getMinutes()).padStart(2, '0')}` === t
                    )
                    return { med: m, time: t, log }
                  })
                })
                .sort((a, b) => a.time.localeCompare(b.time))
                .map(({ med, time, log }) => (
                  <li key={`${med.id}-${time}`} className="flex items-center gap-3 rounded-xl border p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Pill className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {med.name} <span className="font-normal text-muted-foreground">{med.dosage}</span>
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" aria-hidden /> {time}
                      </p>
                    </div>
                    {log ? (
                      log.status === 'taken' ? (
                        <Badge className="gap-1 border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400" variant="outline">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Taken
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 opacity-70">
                          <XCircle className="h-3.5 w-3.5" aria-hidden /> Skipped
                        </Badge>
                      )
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Recent symptom checks */}
      <Card className="shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent symptom checks</h2>
            <Button variant="outline" size="sm" onClick={() => go('triage')} className="h-10 gap-1.5">
              New check <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
            </div>
          ) : sessions.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No checks yet. Describe a symptom and CarePilot will give you a clear care level.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sessions.slice(0, 4).map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setViewing(s)}
                    className="flex w-full min-h-11 items-center gap-3 rounded-xl border bg-background p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/50"
                    aria-label={`View symptom check: ${s.symptoms.slice(0, 60)}`}
                  >
                    <span aria-hidden className="text-xl">{URGENCY_META[s.urgency as Urgency]?.icon ?? '🩺'}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{s.symptoms}</span>
                      <span className="text-xs text-muted-foreground">{fmtDate(s.createdAt)}</span>
                    </span>
                    <Badge variant="outline" className={URGENCY_META[s.urgency as Urgency]?.color}>
                      {URGENCY_META[s.urgency as Urgency]?.short ?? s.urgency}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Symptom check · {viewing && fmtDate(viewing.createdAt)}</DialogTitle>
          </DialogHeader>
          <div className="rounded-xl border bg-muted/50 p-3 text-sm">
            <p className="font-semibold text-muted-foreground">You described:</p>
            <p className="mt-1">{viewing?.symptoms}</p>
          </div>
          {viewing && (
            <div className={`mb-4 flex items-center gap-2 rounded-xl border-2 p-3 ${URGENCY_META[viewing.urgency as Urgency]?.bg} ${URGENCY_META[viewing.urgency as Urgency]?.border}`}>
              <span aria-hidden>{URGENCY_META[viewing.urgency as Urgency]?.icon}</span>
              <p className={`text-sm font-bold ${URGENCY_META[viewing.urgency as Urgency]?.color}`}>
                {URGENCY_META[viewing.urgency as Urgency]?.label}
              </p>
            </div>
          )}
          {viewing && <Markdown content={stripUrgency(viewing.response)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function QuickAction({ onClick, icon, title, desc }: { onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className="group flex min-h-11 items-center gap-4 rounded-2xl border-2 bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-bold">{title}</span>
        <span className="block text-xs leading-relaxed text-muted-foreground">{desc}</span>
      </span>
      <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </button>
  )
}

function StatCard({ label, value, sub, children }: { label: string; value: string; sub?: string; children?: React.ReactNode }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex flex-col gap-1 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-3xl font-extrabold tabular-nums">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        {children}
      </CardContent>
    </Card>
  )
}
