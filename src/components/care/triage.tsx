'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Loader2, RotateCcw, Stethoscope, ShieldAlert, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Markdown } from '@/components/care/markdown'
import { parseUrgency, stripUrgency, URGENCY_META, type Urgency } from '@/lib/types'

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

const EXAMPLES = [
  "I've had a throbbing headache for two days and bright light bothers me.",
  'My throat is scratchy and I feel tired — no fever though. Should I worry?',
  'I get chest tightness when I climb two flights of stairs.',
  'My 6-year-old has a 101°F fever and a barking cough since last night.',
]

export function Triage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [urgency, setUrgency] = useState<Urgency | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || streaming) return
    setInput('')
    const history = [...messages, { role: 'user' as const, content }]
    setMessages(history)
    setStreaming(true)
    setUrgency(null)

    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history }),
      })
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'The assistant is unavailable. Please try again.')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      setMessages((m) => [...m, { role: 'assistant', content: '' }])

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        const display = stripUrgency(acc)
        setMessages((m) => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'assistant', content: display }
          return copy
        })
      }
      const u = parseUrgency(acc)
      // Only show the banner on a final assessment, never on follow-up questions
      if (u && acc.includes('## Assessment')) setUrgency(u)
    } catch (e) {
      setMessages((m) => {
        const copy = [...m]
        if (copy.length > 0 && copy[copy.length - 1].role === 'assistant' && copy[copy.length - 1].content === '') {
          copy.pop()
        }
        return copy
      })
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content:
            e instanceof Error
              ? `⚠️ ${e.message}`
              : '⚠️ Something went wrong. Please try again.',
        },
      ])
    } finally {
      setStreaming(false)
    }
  }

  function reset() {
    if (streaming) return
    setMessages([])
    setUrgency(null)
    setInput('')
    inputRef.current?.focus()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Symptom Navigator</h1>
          <p className="text-sm text-muted-foreground">
            Describe what you feel — the AI asks follow-ups, checks red flags, and gives a care level.
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" onClick={reset} className="gap-2" aria-label="Start a new symptom check">
            <RotateCcw className="h-4 w-4" aria-hidden />
            New check
          </Button>
        )}
      </div>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="mb-4 min-h-[22rem] flex-1 overflow-y-auto rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
        role="log"
        aria-live="polite"
        aria-label="Conversation with the CarePilot symptom navigator"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 py-10 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
              <Stethoscope className="h-8 w-8" aria-hidden />
            </span>
            <div>
              <p className="text-lg font-bold">How are you feeling today?</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Use your own words. Mention how long it&rsquo;s been going on and how bad it feels (1–10).
              </p>
            </div>
            <div className="flex max-w-xl flex-col gap-2" role="list" aria-label="Example symptom descriptions">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => send(ex)}
                  disabled={streaming}
                  className="min-h-11 rounded-xl border bg-background px-4 py-2.5 text-left text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/60 hover:text-foreground disabled:opacity-50"
                  role="listitem"
                >
                  &ldquo;{ex}&rdquo;
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end gap-2.5">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground shadow-sm sm:text-[0.95rem]">
                    {m.content}
                  </div>
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted" aria-hidden>
                    <User className="h-4 w-4 text-muted-foreground" />
                  </span>
                </div>
              ) : (
                <div key={i} className="flex justify-start gap-2.5">
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden>
                    <Stethoscope className="h-4 w-4" />
                  </span>
                  <div className="max-w-[92%] min-w-0 flex-1 rounded-2xl rounded-bl-md border bg-background px-4 py-3 shadow-sm sm:max-w-[85%]">
                    {m.content === '' ? (
                      <span className="flex items-center gap-1.5 py-1" aria-label="The assistant is typing">
                        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" aria-hidden />
                        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" aria-hidden />
                        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" aria-hidden />
                      </span>
                    ) : (
                      <Markdown content={m.content} />
                    )}
                  </div>
                </div>
              )
            )}

            {/* Urgency banner after completion */}
            {urgency && !streaming && (
              <div
                className={`ml-11 flex items-start gap-3 rounded-2xl border-2 p-4 ${URGENCY_META[urgency].bg} ${URGENCY_META[urgency].border}`}
                role="status"
              >
                <ShieldAlert className={`mt-0.5 h-6 w-6 shrink-0 ${URGENCY_META[urgency].color}`} aria-hidden />
                <div>
                  <p className={`font-extrabold ${URGENCY_META[urgency].color}`}>
                    {URGENCY_META[urgency].icon} {URGENCY_META[urgency].label}
                  </p>
                  <p className="mt-0.5 text-sm text-foreground/80">{URGENCY_META[urgency].blurb}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="rounded-2xl border bg-card p-3 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
          className="flex items-end gap-2"
        >
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Describe your symptoms… (Enter to send, Shift+Enter for a new line)"
            aria-label="Describe your symptoms"
            rows={2}
            disabled={streaming}
            className="max-h-40 min-h-11 flex-1 resize-none border-0 bg-transparent p-2 text-[0.95rem] focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            type="submit"
            size="icon"
            disabled={streaming || input.trim().length === 0}
            aria-label="Send message"
            className="h-11 w-11 shrink-0 rounded-xl"
          >
            {streaming ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Send className="h-5 w-5" aria-hidden />
            )}
          </Button>
        </form>
        <p className="mt-1.5 px-2 text-xs text-muted-foreground">
          Educational guidance only — not a diagnosis. In an emergency, call your local emergency number.
        </p>
      </div>
    </div>
  )
}
