import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meds = await db.medication.findMany({
    where: { userId: user.id, active: true },
    orderBy: { createdAt: 'asc' },
  })

  const today = startOfDay(new Date())
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(today.getDate() - 6)

  const logs = await db.medLog.findMany({
    where: { medication: { userId: user.id }, scheduledFor: { gte: weekAgo } },
  })

  const todayLogs = logs.filter((l) => l.scheduledFor >= today && l.scheduledFor < tomorrow)
  const weekLogs = logs.filter((l) => l.scheduledFor < tomorrow && l.status !== 'pending')
  const takenCount = weekLogs.filter((l) => l.status === 'taken').length
  const adherence =
    weekLogs.length > 0 ? Math.round((takenCount / weekLogs.length) * 100) : null

  return NextResponse.json({ meds, todayLogs, adherence })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, dosage, frequency, times, notes } = await req.json()
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Medication name is required.' }, { status: 400 })
    }
    const freq = ['once_daily', 'twice_daily', 'three_times_daily', 'as_needed']
    if (!freq.includes(frequency)) {
      return NextResponse.json({ error: 'Invalid frequency.' }, { status: 400 })
    }
    let parsedTimes: string[] = []
    if (frequency !== 'as_needed') {
      if (!Array.isArray(times) || times.length === 0) {
        return NextResponse.json(
          { error: 'Please add at least one scheduled time.' },
          { status: 400 }
        )
      }
      parsedTimes = times
        .filter((t: unknown) => typeof t === 'string' && /^\d{2}:\d{2}$/.test(t))
        .sort()
      if (parsedTimes.length === 0) {
        return NextResponse.json({ error: 'Invalid time format.' }, { status: 400 })
      }
    }

    const med = await db.medication.create({
      data: {
        userId: user.id,
        name: name.trim().slice(0, 80),
        dosage: String(dosage || '').slice(0, 40),
        frequency,
        times: JSON.stringify(parsedTimes),
        notes: notes ? String(notes).slice(0, 300) : null,
      },
    })
    return NextResponse.json({ med })
  } catch (e) {
    console.error('[medications POST]', e)
    return NextResponse.json({ error: 'Could not save medication.' }, { status: 500 })
  }
}
