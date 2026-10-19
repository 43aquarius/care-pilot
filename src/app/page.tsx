'use client'

import { useEffect, useState } from 'react'
import { HeartPulse } from 'lucide-react'
import { Landing } from '@/components/care/landing'
import { AuthDialog } from '@/components/care/auth-dialog'
import { Dashboard } from '@/components/care/dashboard'
import { useA11y } from '@/components/care/a11y'
import type { AuthUser } from '@/lib/types'

export default function Page() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checking, setChecking] = useState(true)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const { a11y, setA11y } = useA11y()

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUser(d.user)
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
  }

  if (checking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" role="status" aria-label="Loading CarePilot">
        <span className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg">
          <HeartPulse className="h-8 w-8 animate-pulse" aria-hidden />
        </span>
        <p className="text-sm font-medium text-muted-foreground">Loading CarePilot…</p>
      </div>
    )
  }

  if (user) {
    return <Dashboard user={user} onLogout={logout} a11y={a11y} setA11y={setA11y} />
  }

  return (
    <>
      <Landing
        a11y={a11y}
        setA11y={setA11y}
        onDemo={async () => {
          try {
            const res = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ demo: true }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setUser(data.user)
          } catch {
            setAuthMode('signin')
            setAuthOpen(true)
          }
        }}
        onSignIn={() => {
          setAuthMode('signin')
          setAuthOpen(true)
        }}
        onSignUp={() => {
          setAuthMode('signup')
          setAuthOpen(true)
        }}
      />
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        initialMode={authMode}
        onAuthed={(u) => setUser(u)}
      />
    </>
  )
}
