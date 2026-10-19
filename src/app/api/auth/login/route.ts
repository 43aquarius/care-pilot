import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession, ensureDemoUser, DEMO_EMAIL, DEMO_PASSWORD } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password, demo } = await req.json()

    // One-click judge demo login
    if (demo) {
      const demoUser = await ensureDemoUser()
      const token = await createSession(demoUser.id)
      return NextResponse.json({
        token,
        user: { id: demoUser.id, email: demoUser.email, name: demoUser.name, isDemo: true },
      })
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { email: String(email).toLowerCase() } })
    if (!user) {
      return NextResponse.json({ error: 'No account found with this email.' }, { status: 401 })
    }
    if (user.email === DEMO_EMAIL) {
      // allow direct password login to demo account too
      if (password !== DEMO_PASSWORD) {
        return NextResponse.json({ error: 'Invalid demo credentials.' }, { status: 401 })
      }
    } else if (!verifyPassword(String(password), user.passwordHash)) {
      return NextResponse.json({ error: 'Incorrect password. Please try again.' }, { status: 401 })
    }

    const loginToken = await createSession(user.id)
    return NextResponse.json({
      token: loginToken,
      user: { id: user.id, email: user.email, name: user.name, isDemo: user.isDemo },
    })
  } catch (e) {
    console.error('[login]', e)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
