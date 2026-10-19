'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Pill,
  Plus,
  Loader2,
  Check,
  X,
  Undo2,
  Trash2,
  CalendarClock,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { MedsResponse, Medication } from '@/lib/types'

const FREQ_LABEL: Record<string, string> = {
  once_daily: 'Once daily',
  twice_daily: 'Twice daily',
  three_times_daily: '3× daily',
  as_needed: 'As needed',
}

const FREQ_TIMES: Record<string, string[]> = {
  once_daily: ['08:00'],
  twice_daily: ['08:00', '20:00'],
  three_times_daily: ['08:00', '14:00', '20:00'],
  as_needed: [],
}

function prettyTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m || 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function toTimeStr(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function Medications() {
  const [data, setData] = useState<MedsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Medication | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/medications')
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function mark(medId: string, time: string, action: 'take' | 'skip' | 'undo') {
    setData((d) => {
      if (!d) return d
      const key = `${medId}|${new Date().toDateString()}|${time}`
      const status = action === 'take' ? 'taken' : action === 'skip' ? 'skipped' : 'pending'
      const exists = d.todayLogs.some((l) => `${l.medicationId}|${new Date(l.scheduledFor).toDateString()}|${toTimeStr(l.scheduledFor)}` === key)
      const todayLogs = exists
        ? d.todayLogs.map((l) =>
            `${l.medicationId}|${new Date(l.scheduledFor).toDateString()}|${toTimeStr(l.scheduledFor)}` === key
              ? { ...l, status: status as 'taken' | 'skipped' | 'pending' }
              : l
          )
        : [
            ...d.todayLogs,
            {
              id: `tmp-${key}`,
              medicationId: medId,
              scheduledFor: new Date().toISOString(),
              takenAt: status === 'taken' ? new Date().toISOString() : null,
              status: status as 'taken' | 'skipped' | 'pending',
            },
          ]
      return { ...d, todayLogs }
    })
    try {
      const res = await fetch(`/api/medications/${medId}/take`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time, action }),
      })
      if (!res.ok) throw new Error()
      load() // re-sync for adherence numbers
    } catch {
      toast.error('Could not save. Please try again.')
      load()
    }
  }

  const schedule = useMemo(() => {
    if (!data) return []
    type Row = { time: string; med: Medication; status: 'pending' | 'taken' | 'skipped' }
    const rows: Row[] = []
    for (const med of data.meds) {
      if (med.frequency === 'as_needed') continue
      const times: string[] = JSON.parse(med.times)
      for (const t of times) {
        const log = data.todayLogs.find(
          (l) =>
            l.medicationId === med.id &&
            new Date(l.scheduledFor).toDateString() === new Date().toDateString() &&
            toTimeStr(l.scheduledFor) === t
        )
        rows.push({ time: t, med, status: (log?.status ?? 'pending') as Row['status'] })
      }
    }
    rows.sort((a, b) => a.time.localeCompare(b.time))
    return rows
  }, [data])

  const todayTaken = schedule.filter((r) => r.status === 'taken').length
  const todayTotal = schedule.length

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status" aria-label="Loading medications">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Medications</h1>
          <p className="text-sm text-muted-foreground">Your daily schedule and adherence, at a glance.</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2 font-semibold" aria-label="Add a new medication">
          <Plus className="h-4 w-4" aria-hidden />
          Add medication
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="flex flex-col gap-2 p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarClock className="h-4 w-4" aria-hidden /> Today&rsquo;s doses
            </p>
            <p className="text-3xl font-extrabold">
              {todayTaken}
              <span className="text-lg font-semibold text-muted-foreground"> / {todayTotal}</span>
            </p>
            <Progress value={todayTotal ? (todayTaken / todayTotal) * 100 : 0} aria-label={`${todayTaken} of ${todayTotal} doses taken today`} />
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex flex-col gap-2 p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" aria-hidden /> 7-day adherence
            </p>
            <p className="text-3xl font-extrabold">
              {data?.adherence != null ? `${data.adherence}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {data?.adherence == null
                ? 'Log doses to start your streak'
                : data.adherence >= 80
                  ? 'Great consistency — keep it up!'
                  : 'Aim for 80%+. Missed doses happen — just keep logging.'}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex flex-col gap-2 p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Pill className="h-4 w-4" aria-hidden /> Active medications
            </p>
            <p className="text-3xl font-extrabold">{data?.meds.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {(data?.meds ?? []).filter((m) => m.frequency === 'as_needed').length} as-needed ·{' '}
              {(data?.meds ?? []).filter((m) => m.frequency !== 'as_needed').length} scheduled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's schedule */}
      <Card className="shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <h2 className="mb-1 text-lg font-bold">Today&rsquo;s schedule</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          {schedule.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No scheduled doses today. Add a medication to build your routine.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {schedule.map((row) => (
                <li
                  key={`${row.med.id}-${row.time}`}
                  className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 sm:p-3.5 ${
                    row.status === 'taken'
                      ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/40'
                      : row.status === 'skipped'
                        ? 'border-muted bg-muted/40 opacity-75'
                        : 'bg-background'
                  }`}
                >
                  <span className="w-20 shrink-0 text-sm font-bold tabular-nums">{prettyTime(row.time)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {row.med.name} <span className="font-normal text-muted-foreground">{row.med.dosage}</span>
                    </p>
                    {row.med.notes && <p className="truncate text-xs text-muted-foreground">{row.med.notes}</p>}
                  </div>
                  {row.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => mark(row.med.id, row.time, 'take')}
                        className="h-10 gap-1.5 px-3.5 font-semibold"
                        aria-label={`Mark ${row.med.name} ${row.time} as taken`}
                      >
                        <Check className="h-4 w-4" aria-hidden /> Taken
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => mark(row.med.id, row.time, 'skip')}
                        className="h-10 gap-1.5 px-3"
                        aria-label={`Mark ${row.med.name} ${row.time} as skipped`}
                      >
                        <X className="h-4 w-4" aria-hidden /> Skip
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          row.status === 'taken'
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                            : ''
                        }
                      >
                        {row.status === 'taken' ? '✓ Taken' : 'Skipped'}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => mark(row.med.id, row.time, 'undo')}
                        className="h-10 w-10"
                        aria-label={`Undo ${row.med.name} ${row.time} status`}
                      >
                        <Undo2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* All medications */}
      <Card className="shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-bold">All medications</h2>
          {data?.meds.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nothing here yet. Add your first medication to get reminders and adherence tracking.
            </p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {data?.meds.map((med) => {
                const times: string[] = JSON.parse(med.times)
                return (
                  <li key={med.id} className="flex flex-col gap-2 rounded-xl border bg-background p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Pill className="h-4 w-4" aria-hidden />
                        </span>
                        <div>
                          <p className="font-bold leading-tight">
                            {med.name} <span className="font-normal text-muted-foreground">{med.dosage}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{FREQ_LABEL[med.frequency]}</p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteTarget(med)}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${med.name}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                    {times.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-12">
                        {times.map((t) => (
                          <Badge key={t} variant="secondary" className="tabular-nums">
                            {prettyTime(t)}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {med.notes && <p className="pl-12 text-xs leading-relaxed text-muted-foreground">{med.notes}</p>}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <AddMedDialog open={addOpen} onOpenChange={setAddOpen} onAdded={load} />
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the medication and its dose history from your account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTarget) return
                try {
                  const res = await fetch(`/api/medications/${deleteTarget.id}`, { method: 'DELETE' })
                  if (!res.ok) throw new Error()
                  toast.success(`${deleteTarget.name} removed`)
                  load()
                } catch {
                  toast.error('Could not delete. Please try again.')
                } finally {
                  setDeleteTarget(null)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AddMedDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onAdded: () => void
}) {
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState<string>('once_daily')
  const [times, setTimes] = useState<string[]>(['08:00'])
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setFreq(f: string) {
    setFrequency(f)
    setTimes(FREQ_TIMES[f] ? [...FREQ_TIMES[f]] : [])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, dosage, frequency, times, notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save.')
      toast.success(`${name} added to your medications`)
      setName(''); setDosage(''); setFreq('once_daily'); setNotes('')
      onOpenChange(false)
      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setError(null) }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a medication</DialogTitle>
          <DialogDescription>Track doses, times, and notes for one medication.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="med-name">Name *</Label>
              <Input
                id="med-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lisinopril"
                required
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="med-dose">Dose</Label>
              <Input
                id="med-dose"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g. 10 mg"
                className="h-11"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="med-freq">Frequency</Label>
            <Select value={frequency} onValueChange={setFreq}>
              <SelectTrigger id="med-freq" className="h-11" aria-label="How often do you take it">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FREQ_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v} className="h-11">
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {frequency !== 'as_needed' && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Scheduled times</legend>
              <div className="flex flex-wrap gap-2">
                {times.map((t, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Input
                      type="time"
                      value={t}
                      onChange={(e) => {
                        const next = [...times]
                        next[i] = e.target.value
                        setTimes(next)
                      }}
                      aria-label={`Dose time ${i + 1}`}
                      className="h-11 w-32 tabular-nums"
                    />
                    {times.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-11 w-10"
                        onClick={() => setTimes(times.filter((_, j) => j !== i))}
                        aria-label={`Remove time ${t}`}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 gap-1.5"
                  onClick={() => setTimes([...times, '12:00'])}
                  aria-label="Add another scheduled time"
                >
                  <Plus className="h-4 w-4" aria-hidden /> Add time
                </Button>
              </div>
            </fieldset>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="med-notes">Notes (optional)</Label>
            <Textarea
              id="med-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Take with food, avoid grapefruit…"
              rows={2}
            />
          </div>
          {error && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11">
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="h-11 font-semibold">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Save medication
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
