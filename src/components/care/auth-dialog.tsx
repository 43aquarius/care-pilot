'use client'

import { useState } from 'react'
import { HeartPulse, Loader2, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import type { AuthUser } from '@/lib/types'
import { authFetch, saveToken } from '@/lib/client-auth'

type Mode = 'signin' | 'signup'

export function AuthDialog({
  open,
  onOpenChange,
  initialMode = 'signin',
  onAuthed,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  initialMode?: Mode
  onAuthed: (u: AuthUser) => void
}) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState<'form' | 'demo' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    setBusy('form')
    try {
      const res = await authFetch(`/api/auth/${mode === 'signin' ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'signin' ? { email, password } : { email, password, name }
        ),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      if (data.token) saveToken(data.token)
      onAuthed(data.user)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  async function demoLogin() {
    setError(null)
    setBusy('demo')
    try {
      const res = await authFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demo: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Demo login failed.')
      if (data.token) saveToken(data.token)
      onAuthed(data.user)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setError(null) }}>
      <DialogContent className="max-w-md border-2 border-border/80 shadow-2xl">
        <DialogHeader className="text-center">
          <span className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <HeartPulse className="h-6 w-6" aria-hidden />
          </span>
          <DialogTitle className="text-xl font-extrabold">Welcome to CarePilot</DialogTitle>
          <DialogDescription>
            {mode === 'signin' ? 'Sign in to your health dashboard' : 'Create your free account'}
          </DialogDescription>
        </DialogHeader>

        {/* Judge demo access */}
        <Button
          onClick={demoLogin}
          disabled={busy !== null}
          className="h-12 w-full gap-2 text-[0.95rem] font-bold shadow-md"
          aria-label="Enter the pre-loaded demo account for judges"
        >
          {busy === 'demo' ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="h-5 w-5" aria-hidden />
          )}
          {busy === 'demo' ? 'Preparing demo…' : 'Enter judge demo — one click'}
        </Button>
        <p className="-mt-1 text-center text-xs text-muted-foreground">
          Fully seeded account: medications, symptom history &amp; lab reports.
        </p>

        <div className="flex items-center gap-3" aria-hidden>
          <Separator className="flex-1" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); setError(null) }}>
          <TabsList className="grid w-full grid-cols-2" aria-label="Choose sign in or sign up">
            <TabsTrigger value="signin" className="h-10">Sign in</TabsTrigger>
            <TabsTrigger value="signup" className="h-10">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              {error && (
                <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={busy !== null} className="h-11 font-semibold">
                {busy === 'form' && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Sign in
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="signup-name">Name (optional)</Label>
                <Input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  placeholder="How should we greet you?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="signup-password">Password (8+ characters)</Label>
                <Input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="h-11"
                />
              </div>
              {error && (
                <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={busy !== null} className="h-11 font-semibold">
                {busy === 'form' && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Create account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
