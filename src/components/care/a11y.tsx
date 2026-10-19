'use client'

import { Accessibility, Type, Contrast, Zap } from 'lucide-react'
import { useEffect, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

type A11yState = { largeText: boolean; highContrast: boolean; reduceMotion: boolean }

const STORAGE_KEY = 'carepilot-a11y'
const DEFAULTS: A11yState = { largeText: false, highContrast: false, reduceMotion: false }
const SERVER_SNAPSHOT: A11yState = { ...DEFAULTS }

const listeners = new Set<() => void>()
let cache: A11yState | null = null

function read(): A11yState {
  if (cache) return cache
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    cache = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    cache = { ...DEFAULTS }
  }
  return cache
}

function write(next: A11yState) {
  cache = { ...next }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {}
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function useA11y() {
  const a11y = useSyncExternalStore(subscribe, read, () => SERVER_SNAPSHOT)

  // Sync state to the DOM (external system)
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('a11y-large-text', a11y.largeText)
    root.classList.toggle('a11y-high-contrast', a11y.highContrast)
    root.classList.toggle('a11y-reduce-motion', a11y.reduceMotion)
  }, [a11y])

  return { a11y, setA11y: write }
}

export function A11yButton({ a11y, setA11y }: { a11y: A11yState; setA11y: (s: A11yState) => void }) {
  const toggles: { key: keyof A11yState; label: string; desc: string; icon: React.ReactNode }[] = [
    { key: 'largeText', label: 'Large text', desc: 'Scale up all text', icon: <Type className="h-4 w-4" aria-hidden /> },
    { key: 'highContrast', label: 'High contrast', desc: 'Stronger colors & borders', icon: <Contrast className="h-4 w-4" aria-hidden /> },
    { key: 'reduceMotion', label: 'Reduce motion', desc: 'Minimize animations', icon: <Zap className="h-4 w-4" aria-hidden /> },
  ]

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Accessibility options"
          className="h-11 w-11 rounded-full border-2 shadow-sm"
        >
          <Accessibility className="h-5 w-5" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-72 p-4" role="dialog" aria-label="Accessibility options">
        <p className="mb-3 text-sm font-semibold">Accessibility</p>
        <div className="flex flex-col gap-3">
          {toggles.map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-3 rounded-lg p-1.5 hover:bg-accent/60">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 text-muted-foreground" aria-hidden>{t.icon}</span>
                <div>
                  <Label htmlFor={`a11y-${t.key}`} className="cursor-pointer text-sm font-medium">
                    {t.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
              </div>
              <Switch
                id={`a11y-${t.key}`}
                checked={a11y[t.key]}
                onCheckedChange={(v) => setA11y({ ...a11y, [t.key]: v })}
                aria-label={t.label}
              />
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Settings are saved for your next visit.
        </p>
      </PopoverContent>
    </Popover>
  )
}
