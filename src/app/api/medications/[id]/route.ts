import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const med = await db.medication.findFirst({ where: { id, userId: user.id } })
  if (!med) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const body = await req.json()
    const data: Record<string, string | null> = {}
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim().slice(0, 80)
    if (typeof body.dosage === 'string') data.dosage = body.dosage.slice(0, 40)
    if (typeof body.notes === 'string') data.notes = body.notes.slice(0, 300)
    if (Array.isArray(body.times)) {
      const t = (body.times as unknown[])
        .filter((x) => typeof x === 'string' && /^\d{2}:\d{2}$/.test(x as string))
        .sort() as string[]
      data.times = JSON.stringify(t)
    }
    const updated = await db.medication.update({ where: { id }, data })
    return NextResponse.json({ med: updated })
  } catch (e) {
    console.error('[medications PATCH]', e)
    return NextResponse.json({ error: 'Could not update.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const med = await db.medication.findFirst({ where: { id, userId: user.id } })
  if (!med) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.medication.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
