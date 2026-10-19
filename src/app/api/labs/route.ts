import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getZAI, LAB_SYSTEM_PROMPT } from '@/lib/ai'

export const maxDuration = 120

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const reports = await db.labReport.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return NextResponse.json({ reports })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { rawInput, title } = await req.json()
    if (!rawInput || typeof rawInput !== 'string' || rawInput.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please paste your lab results (at least 10 characters).' },
        { status: 400 }
      )
    }
    if (rawInput.length > 6000) {
      return NextResponse.json({ error: 'Lab results are too long (max 6000 characters).' }, { status: 400 })
    }

    const zai = await getZAI()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: LAB_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Please explain these lab results in plain language:\n\n${rawInput}`,
        },
      ],
      thinking: { type: 'disabled' },
    })
    const explanation = completion.choices[0]?.message?.content
    if (!explanation) {
      return NextResponse.json({ error: 'The explainer returned an empty response. Please try again.' }, { status: 502 })
    }

    const report = await db.labReport.create({
      data: {
        userId: user.id,
        title: title && typeof title === 'string' ? title.slice(0, 80) : 'Lab Results',
        rawInput: rawInput.slice(0, 6000),
        explanation: explanation.slice(0, 30000),
      },
    })
    return NextResponse.json({ report })
  } catch (e) {
    console.error('[labs POST]', e)
    return NextResponse.json({ error: 'Could not analyze the lab report. Please try again.' }, { status: 500 })
  }
}
