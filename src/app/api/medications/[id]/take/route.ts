import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

function scheduledDateFor(time: string, dayOffset = 0) {
  const [h, m] = time.split(':').map(Number)
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const med = await db.medication.findFirst({ where: { id, userId: user.id } })
  if (!med) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const { time, action } = await req.json()
    if (typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: 'Invalid time.' }, { status: 400 })
    }
    if (!['take', 'skip', 'undo'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
    }

    const scheduledFor = scheduledDateFor(time)
    let log = await db.medLog.findUnique({
      where: { medicationId_scheduledFor: { medicationId: med.id, scheduledFor } },
    })

    if (action === 'undo') {
      if (log) {
        await db.medLog.update({
          where: { id: log.id },
          data: { status: 'pending', takenAt: null },
        })
      }
      return NextResponse.json({ status: 'pending' })
    }

    const status = action === 'take' ? 'taken' : 'skipped'
    if (log) {
      log = await db.medLog.update({
        where: { id: log.id },
        data: { status, takenAt: action === 'take' ? new Date() : null },
      })
    } else {
      log = await db.medLog.create({
        data: {
          medicationId: med.id,
          scheduledFor,
          status,
          takenAt: action === 'take' ? new Date() : null,
        },
      })
    }
    return NextResponse.json({ status: log.status })
  } catch (e) {
    console.error('[take POST]', e)
    return NextResponse.json({ error: 'Could not update.' }, { status: 500 })
  }
}
