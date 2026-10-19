import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getZAI, TRIAGE_SYSTEM_PROMPT } from '@/lib/ai'

export const maxDuration = 120

const URGENCY_RE = /\[URGENCY_LEVEL:\s*(SELF_CARE|SEE_DOCTOR|URGENT_CARE|EMERGENCY)\s*\]/

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { history } = await req.json()
    if (!Array.isArray(history) || history.length === 0) {
      return new Response(JSON.stringify({ error: 'History is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Sanitize conversation: keep last 12 turns, enforce roles/content
    const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
      { role: 'system', content: TRIAGE_SYSTEM_PROMPT },
    ]
    for (const m of history.slice(-12)) {
      const role = m?.role === 'user' ? 'user' : m?.role === 'assistant' ? 'assistant' : null
      const content = typeof m?.content === 'string' ? m.content.slice(0, 4000) : null
      if (role && content) messages.push({ role, content })
    }
    if (!messages.some((m) => m.role === 'user')) {
      return new Response(JSON.stringify({ error: 'No user message found.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const zai = await getZAI()
    const raw = (await zai.chat.completions.create({
      messages,
      stream: true,
      thinking: { type: 'disabled' },
    })) as unknown as ReadableStream<Uint8Array>

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    let fullText = ''
    let sseBuffer = ''

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = raw.getReader()
        try {
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            sseBuffer += decoder.decode(value, { stream: true })
            const lines = sseBuffer.split('\n')
            sseBuffer = lines.pop() ?? ''
            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed.startsWith('data:')) continue
              const payload = trimmed.slice(5).trim()
              if (!payload || payload === '[DONE]') continue
              try {
                const json = JSON.parse(payload)
                const delta =
                  json?.choices?.[0]?.delta?.content ??
                  json?.choices?.[0]?.message?.content ??
                  ''
                if (delta) {
                  fullText += delta
                  controller.enqueue(encoder.encode(delta))
                }
              } catch {
                // incomplete JSON frame — ignore
              }
            }
          }
        } finally {
          reader.releaseLock()
        }

        // Persist the triage session once complete
        try {
          const firstUser = history.find((m: { role: string }) => m.role === 'user')
          const match = fullText.match(URGENCY_RE)
          await db.triageSession.create({
            data: {
              userId: user.id,
              symptoms: String(firstUser?.content ?? '').slice(0, 2000),
              response: fullText.slice(0, 20000),
              urgency: match ? match[1] : 'SEE_DOCTOR',
            },
          })
        } catch (e) {
          console.error('[triage save]', e)
        }
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (e) {
    console.error('[triage POST]', e)
    return new Response(JSON.stringify({ error: 'The triage assistant is unavailable right now. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
