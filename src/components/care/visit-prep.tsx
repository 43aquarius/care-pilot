'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Loader2, Copy, Printer, Pill, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Markdown } from '@/components/care/markdown'
import { toast } from 'sonner'
import { fmtDate, URGENCY_META, type TriageSession } from '@/lib/types'
import { authFetch } from '@/lib/client-auth'

export function VisitPrep() {
  const [concern, setConcern] = useState('')
  const [details, setDetails] = useState('')
  const [sessions, setSessions] = useState<TriageSession[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    authFetch('/api/triage/history')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.sessions) {
          setSessions(d.sessions)
          if (d.sessions.length > 0) setSelected([d.sessions[0].id])
        }
      })
      .catch(() => {})
  }, [])

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    setSummary(null)
    try {
      const res = await authFetch('/api/visit-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concern, details, triageSessionIds: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not generate summary.')
      setSummary(data.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate summary.')
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    if (!summary) return
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      toast.success('Summary copied — paste it into your notes or patient portal')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed — select the text manually instead.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Doctor Visit Prep</h1>
        <p className="text-sm text-muted-foreground">
          Walk in with a one-page summary: your concerns, timeline, medications, and the questions that matter.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="shadow-sm lg:col-span-2">
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={generate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="vp-concern">Reason for the visit *</Label>
                <Textarea
                  id="vp-concern"
                  value={concern}
                  onChange={(e) => setConcern(e.target.value)}
                  placeholder="e.g. My headaches are happening more often and my blood pressure readings at home have been high."
                  rows={3}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="vp-details">Extra details (optional)</Label>
                <Textarea
                  id="vp-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="How long it's been, what makes it better or worse, what you've already tried, other symptoms…"
                  rows={4}
                />
              </div>

              {sessions.length > 0 && (
                <fieldset className="flex flex-col gap-2.5">
                  <legend className="text-sm font-medium">Attach recent symptom checks</legend>
                  <div className="flex max-h-44 flex-col gap-2 overflow-y-auto rounded-xl border p-3">
                    {sessions.map((s) => (
                      <label
                        key={s.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg p-1.5 hover:bg-accent/50"
                      >
                        <Checkbox
                          checked={selected.includes(s.id)}
                          onCheckedChange={(v) =>
                            setSelected((cur) =>
                              v === true ? [...cur, s.id] : cur.filter((x) => x !== s.id)
                            )
                          }
                          aria-label={`Include symptom check: ${s.symptoms.slice(0, 60)}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{s.symptoms}</span>
                          <span className="mt-1 flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`h-5 px-1.5 text-[0.65rem] ${URGENCY_META[s.urgency]?.color ?? ''}`}
                            >
                              {URGENCY_META[s.urgency]?.short ?? s.urgency}
                            </Badge>
                            <span className="text-[0.7rem] text-muted-foreground">{fmtDate(s.createdAt)}</span>
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <p className="flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
                <Pill className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                Your current medication list from CarePilot is attached automatically.
              </p>

              {error && (
                <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={busy || concern.trim().length < 5} className="h-12 gap-2 text-[0.95rem] font-bold">
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <ClipboardList className="h-5 w-5" aria-hidden />
                )}
                {busy ? 'Preparing your summary…' : 'Generate visit summary'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          {summary ? (
            <Card className="shadow-sm">
              <CardContent className="p-5 sm:p-7">
                <div className="no-print mb-4 flex items-center justify-between gap-3 border-b pb-4">
                  <h2 className="font-extrabold">Your visit summary</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copy} className="h-10 gap-1.5" aria-label="Copy summary to clipboard">
                      {copied ? (
                        <Check className="h-4 w-4" aria-hidden />
                      ) : (
                        <Copy className="h-4 w-4" aria-hidden />
                      )}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="h-10 gap-1.5" aria-label="Print this summary">
                      <Printer className="h-4 w-4" aria-hidden />
                      Print
                    </Button>
                  </div>
                </div>
                <div className="print-area">
                  <Markdown content={summary} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full shadow-sm">
              <CardContent className="flex h-full min-h-72 flex-col items-center justify-center gap-4 p-8 text-center">
                <span className={`flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary ${busy ? 'animate-pulse' : ''}`}>
                  <ClipboardList className="h-8 w-8" aria-hidden />
                </span>
                <div>
                  <p className="font-bold">
                    {busy ? 'Writing your one-pager…' : 'A 60-second read for your doctor'}
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                    {busy
                      ? 'Pulling together your concerns, symptom history, and medications into a clean summary.'
                      : 'Studies show patients forget up to 80% of what doctors say. Walking in prepared flips that conversation.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
