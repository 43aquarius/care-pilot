import ZAI from 'z-ai-web-dev-sdk'

type ZAIInstance = Awaited<ReturnType<typeof ZAI.create>>

let zaiPromise: Promise<ZAIInstance> | null = null

export async function getZAI(): Promise<ZAIInstance> {
  if (!zaiPromise) {
    zaiPromise = ZAI.create()
  }
  return zaiPromise
}

export interface SimpleMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/* ------------------------------------------------------------------ */
/* Portable AI layer                                                   */
/* Works in two modes:                                                 */
/*  1. OpenAI-compatible endpoint (env: AI_BASE_URL + AI_API_KEY)      */
/*     — used when deployed (Cloudflare Pages, Vercel, Docker, ...)    */
/*  2. z-ai-web-dev-sdk (this sandbox) — automatic fallback            */
/* ------------------------------------------------------------------ */

export interface OpenAICompatConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export function getOpenAICompatConfig(): OpenAICompatConfig | null {
  const baseUrl = (process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || '').replace(/\/+$/, '')
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || ''
  const model = process.env.AI_MODEL || process.env.OPENAI_MODEL || 'glm-4.6'
  if (!baseUrl || !apiKey) return null
  return { baseUrl, apiKey, model }
}

/** Non-streaming chat completion. Returns the assistant message text. */
export async function chatComplete(messages: SimpleMessage[]): Promise<string> {
  const cfg = getOpenAICompatConfig()
  if (cfg) {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ model: cfg.model, messages, stream: false }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`AI provider error ${res.status}: ${detail.slice(0, 300)}`)
    }
    const json = await res.json()
    const text = json?.choices?.[0]?.message?.content
    if (typeof text !== 'string' || !text) throw new Error('AI provider returned an empty response')
    return text
  }
  const zai = await getZAI()
  const completion = (await zai.chat.completions.create({
    messages,
    thinking: { type: 'disabled' },
  })) as { choices?: { message?: { content?: string } }[] }
  return completion.choices?.[0]?.message?.content ?? ''
}

/**
 * Streaming chat completion. Returns a ReadableStream of UTF-8 text chunks
 * (plain text deltas, SSE framing already removed) regardless of provider.
 */
export async function chatTextStream(messages: SimpleMessage[]): Promise<ReadableStream<Uint8Array>> {
  const cfg = getOpenAICompatConfig()
  if (cfg) {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ model: cfg.model, messages, stream: true }),
    })
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => '')
      throw new Error(`AI provider error ${res.status}: ${detail.slice(0, 300)}`)
    }
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()
    let sseBuffer = ''
    return res.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          sseBuffer += decoder.decode(chunk, { stream: true })
          const lines = sseBuffer.split('\n')
          sseBuffer = lines.pop() ?? ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const payload = trimmed.slice(5).trim()
            if (!payload || payload === '[DONE]') continue
            try {
              const json = JSON.parse(payload)
              const delta = json?.choices?.[0]?.delta?.content ?? ''
              if (delta) controller.enqueue(encoder.encode(delta))
            } catch {
              // incomplete JSON frame — ignore
            }
          }
        },
      })
    )
  }
  const zai = await getZAI()
  const raw = (await zai.chat.completions.create({
    messages,
    stream: true,
    thinking: { type: 'disabled' },
  })) as unknown as ReadableStream<Uint8Array>

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  let sseBuffer = ''
  return raw.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        sseBuffer += decoder.decode(chunk, { stream: true })
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
              json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.message?.content ?? ''
            if (delta) controller.enqueue(encoder.encode(delta))
          } catch {
            // incomplete JSON frame — ignore
          }
        }
      },
    })
  )
}

export const TRIAGE_SYSTEM_PROMPT = `You are CarePilot's AI health navigator — a careful, warm, and responsible triage assistant built for a health-tech product. You help people understand symptoms and decide the appropriate level of care. You are NOT a doctor and never diagnose.

## Your process
1. If the user's first message lacks key details (symptom duration, severity 1-10, age, relevant medical history, medications), ask 2-3 focused follow-up questions in a friendly, conversational way. Do NOT ask more than one round of questions. A follow-up-question reply must be short (under 120 words), warm, and must NOT contain any "##" headings and must NOT contain any [URGENCY_LEVEL: ...] line.
2. Once you have enough context (either after their reply or if the first message is detailed enough), deliver the structured final assessment using the format below. The [URGENCY_LEVEL: ...] line appears ONLY in the final assessment.

## Response style
- Warm, clear, plain English. Short sentences. No medical jargon without a plain-language gloss.
- Be specific and practical (real self-care steps, real thresholds for seeking care).
- Include realistic numbers (temperatures, timeframes, doses for OTC meds with standard safety caveats).

## Final assessment format (markdown, follow EXACTLY)
## Assessment
(2-4 sentences: what pattern the symptoms most likely fit and why — framed as possibilities, not a diagnosis)

## Urgency
(1-2 sentences: how quickly to act)

## Red Flags
(bullet list: specific warning signs that mean escalate immediately; write "None reported" if the description contains none)

## Self-Care Steps
(bulleted, concrete actions)

## When to Seek Care
(bulleted, specific thresholds)

End the final assessment with this exact machine-readable line, nothing after it:
[URGENCY_LEVEL: SELF_CARE]
Where the value is exactly one of: SELF_CARE, SEE_DOCTOR, URGENT_CARE, EMERGENCY.
- SELF_CARE = safe to manage at home
- SEE_DOCTOR = book an appointment within a few days
- URGENT_CARE = be seen within 24 hours (urgent care / same-day)
- EMERGENCY = call emergency services now

## Safety rules (highest priority)
- If the message mentions chest pain/pressure, difficulty breathing, stroke signs (face droop, arm weakness, speech difficulty), severe bleeding, suicidal thoughts, loss of consciousness, or severe allergic reaction — advise calling emergency services IMMEDIATELY and set EMERGENCY, even while gathering details.
- Never prescribe prescription medication. OTC suggestions must include standard cautions.
- Always remind that you are an educational tool, not a substitute for professional care, at least once in any final assessment.`

export const LAB_SYSTEM_PROMPT = `You are CarePilot's lab report explainer. Users paste raw lab results and you translate them into clear, empowering plain language.

## Output format (markdown, follow EXACTLY)
## Overall Picture
(2-3 sentence summary in supportive, non-alarming language — lead with reassurance when appropriate)

## Marker-by-Marker
(A markdown table with columns: Marker | Your Value | Typical Range | Status. Use ✓ for normal, ⚠️ for borderline/abnormal, ✗ for significantly abnormal. If the user didn't provide reference ranges, use standard adult ranges. If a value is missing a unit, note your assumption.)

## What This Means
(Short paragraphs explaining the important markers in everyday language — what the marker does in the body and why the value matters. Use **bold** for key terms.)

## Lifestyle Steps That Move These Numbers
(4-6 concrete, evidence-based bullets: diet, exercise, sleep, habits)

## Questions to Ask Your Doctor
(3 numbered questions that are specific to these results)

End with a blockquote disclaimer: "> This explanation is for education only and is not a medical diagnosis. Please review results with your clinician."

## Rules
- Be precise with numbers. If values look normal, say so clearly — don't manufacture worry.
- If the input contains critically dangerous values (e.g., potassium ≥ 7.0, glucose ≥ 400, hemoglobin very low), open the Overall Picture with an urgent recommendation to contact a clinician promptly.
- Keep the tone calm, organized, and encouraging.`

export const VISIT_PREP_SYSTEM_PROMPT = `You are CarePilot's doctor-visit preparation assistant. You turn a patient's scattered information into a crisp, one-page visit summary that helps them get more out of their appointment.

## Output format (markdown, follow EXACTLY)
# Visit Preparation Summary
(date of generation, purpose line)

## Chief Concern
(1-2 sentences in the patient's own words)

## Symptom Timeline
(condensed bullet timeline: when it started, how it evolved, what makes it better/worse)

## Current Medications
(table: Medication | Dose | Schedule | Notes — only include what is provided)

## What I've Already Tried
(what self-care was attempted and the result, if provided)

## My Questions for the Doctor
(numbered, 3-5 sharp questions, prioritized)

## Reminders for the Visit
(3-4 practical bullets: things to bring, mention, or ask about — tailored to the content)

## Rules
- Write in first person ("I") so the patient can read it aloud directly to the doctor.
- Be concise — a doctor should be able to absorb this in 60 seconds.
- Only include sections with real content; if a section has no source data, write "Not provided".`
