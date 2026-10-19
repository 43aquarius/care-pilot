import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { chatComplete, VISIT_PREP_SYSTEM_PROMPT } from '@/lib/ai'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { concern, details, triageSessionIds } = await req.json()

    // Pull the user's selected triage history for context
    let triageContext = ''
    if (Array.isArray(triageSessionIds) && triageSessionIds.length > 0) {
      const sessions = await db.triageSession.findMany({
        where: { userId: user.id, id: { in: triageSafe(triageSessionIds) } },
        orderBy: { createdAt: 'desc' },
        take: 3,
      })
      triageContext = sessions
        .map(
          (s, i) =>
            `Session ${i + 1} (${s.createdAt.toISOString().slice(0, 10)}):\nSymptoms: ${s.symptoms}\nUrgency: ${s.urgency}`
        )
        .join('\n\n')
    }

    const meds = await db.medication.findMany({
      where: { userId: user.id, active: true },
    })
    const medList = meds
      .map((m) => {
        const times: string[] = JSON.parse(m.times)
        const freqLabel =
          m.frequency === 'as_needed'
            ? 'as needed'
            : `${times.join(' & ')} (${m.frequency.replace('_', ' ')})`
        return `- ${m.name} ${m.dosage} — ${freqLabel}${m.notes ? ` — ${m.notes}` : ''}`
      })
      .join('\n')

    if (!concern && !details && !triageContext && !medList) {
      return NextResponse.json(
        { error: 'Add a reason for your visit first.' },
        { status: 400 }
      )
    }

    const userContent = `Prepare my doctor visit summary from the following information.

## Reason for visit (my words)
${concern ? String(concern).slice(0, 1500) : 'Not provided'}

## Additional details (duration, severity, what makes it better/worse, what I've tried)
${details ? String(details).slice(0, 2500) : 'Not provided'}

## My CarePilot symptom check history
${triageContext || 'No symptom checks yet.'}

## My current medications
${medList || 'No medications recorded.'}

Today's date: ${new Date().toISOString().slice(0, 10)}`

    const summary = await chatComplete([
      { role: 'system', content: VISIT_PREP_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ])
    if (!summary) {
      return NextResponse.json({ error: 'The assistant returned an empty summary. Please try again.' }, { status: 502 })
    }
    return NextResponse.json({ summary })
  } catch (e) {
    console.error('[visit-prep POST]', e)
    return NextResponse.json({ error: 'Could not generate the visit summary. Please try again.' }, { status: 500 })
  }
}

function triageSafe(ids: unknown[]): string[] {
  return ids.filter((x): x is string => typeof x === 'string' && x.length < 40)
}
