'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileText, Loader2, Sparkles, History, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Markdown } from '@/components/care/markdown'
import { fmtDate, type LabReport } from '@/lib/types'
import { authFetch } from '@/lib/client-auth'

const SAMPLE = `Glucose 108 mg/dL (fasting)
HbA1c 6.1 %
Total Cholesterol 212 mg/dL
LDL 138 mg/dL
HDL 44 mg/dL
Triglycerides 150 mg/dL`

export function Labs() {
  const [title, setTitle] = useState('')
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reports, setReports] = useState<LabReport[] | null>(null)
  const [viewing, setViewing] = useState<LabReport | null>(null)
  const [result, setResult] = useState<LabReport | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await authFetch('/api/labs')
      if (res.ok) {
        const data = await res.json()
        setReports(data.reports)
      }
    } catch {}
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function analyze(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    setResult(null)
    try {
      const res = await authFetch('/api/labs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: raw, title: title || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed.')
      setResult(data.report)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Lab Report Translator</h1>
        <p className="text-sm text-muted-foreground">
          Paste your results, get plain English — marker by marker, with lifestyle steps and questions for your doctor.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form */}
        <Card className="shadow-sm lg:col-span-2">
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={analyze} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="lab-title">Report title (optional)</Label>
                <Input
                  id="lab-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Annual Metabolic Panel"
                  className="h-11"
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="lab-raw">Your lab results *</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setRaw(SAMPLE)
                      if (!title) setTitle('Annual Metabolic Panel')
                    }}
                    className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Try an example
                  </button>
                </div>
                <Textarea
                  id="lab-raw"
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder={'Paste values line by line, e.g.\nHemoglobin 13.5 g/dL\nFerritin 22 ng/mL'}
                  rows={10}
                  required
                  minLength={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Typical format: marker, value, unit. Reference ranges are optional.
                </p>
              </div>
              {error && (
                <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={busy || raw.trim().length < 10} className="h-12 gap-2 text-[0.95rem] font-bold">
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="h-5 w-5" aria-hidden />
                )}
                {busy ? 'Translating your results…' : 'Explain in plain English'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Result / empty */}
        <div className="lg:col-span-3">
          {busy && !result ? (
            <Card className="h-full shadow-sm">
              <CardContent className="flex h-full min-h-72 flex-col items-center justify-center gap-4 p-8 text-center">
                <span className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                  <FileText className="h-8 w-8" aria-hidden />
                </span>
                <div>
                  <p className="font-bold">Reading your results…</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Checking each marker against typical ranges and writing your explanation.
                  </p>
                </div>
                <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
              </CardContent>
            </Card>
          ) : result ? (
            <Card className="shadow-sm">
              <CardContent className="p-5 sm:p-7">
                <div className="mb-4 flex items-center justify-between gap-3 border-b pb-4">
                  <div>
                    <h2 className="font-extrabold">{result.title}</h2>
                    <p className="text-xs text-muted-foreground">Analyzed {fmtDate(result.createdAt)}</p>
                  </div>
                  <FileText className="h-6 w-6 text-primary" aria-hidden />
                </div>
                <Markdown content={result.explanation} />
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full shadow-sm">
              <CardContent className="flex h-full min-h-72 flex-col items-center justify-center gap-4 p-8 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                  <FileText className="h-8 w-8" aria-hidden />
                </span>
                <div>
                  <p className="font-bold">Your explanation will appear here</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                    Copy a section of your lab report — like &ldquo;Hemoglobin 13.5 g/dL&rdquo; — paste it on the left,
                    and CarePilot translates it into clear, calm language.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* History */}
      {reports && reports.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <History className="h-5 w-5 text-muted-foreground" aria-hidden />
              Past reports
            </h2>
            <ul className="flex flex-col gap-2">
              {reports.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setViewing(r)}
                    className="flex w-full min-h-11 items-center gap-3 rounded-xl border bg-background p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/50"
                    aria-label={`View report ${r.title} from ${fmtDate(r.createdAt)}`}
                  >
                    <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{r.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{r.rawInput.split('\n')[0]}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewing?.title}</DialogTitle>
            <DialogDescription>
              {viewing && <>Analyzed {fmtDate(viewing.createdAt)}</>}
            </DialogDescription>
          </DialogHeader>
          {viewing && <Markdown content={viewing.explanation} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
