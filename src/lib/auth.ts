import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'
import { cookies, headers } from 'next/headers'
import { db } from '@/lib/db'

export const SESSION_COOKIE = 'cp_session'
const SESSION_DAYS = 30

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const hashBuf = Buffer.from(hash, 'hex')
  const testBuf = scryptSync(password, salt, 64)
  return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf)
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await db.session.create({ data: { token, userId, expiresAt } })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // 'none' (with Secure) keeps the session working when the app is viewed
    // inside an embedded webview/iframe; a Bearer-token fallback covers the
    // browsers that block cookies entirely.
    sameSite: 'none',
    secure: true,
    expires: expiresAt,
    path: '/',
  })
  return token
}

export async function destroySession() {
  // Delete by Bearer token (if present) and/or session cookie.
  let bearerToken: string | null = null
  try {
    const h = await headers()
    const auth = h.get('authorization')
    if (auth?.toLowerCase().startsWith('bearer ')) bearerToken = auth.slice(7).trim() || null
  } catch {
    /* headers() unavailable in this context */
  }
  const cookieStore = await cookies()
  const cookieToken = cookieStore.get(SESSION_COOKIE)?.value
  const tokens = [bearerToken, cookieToken].filter((t): t is string => !!t)
  for (const t of tokens) {
    await db.session.deleteMany({ where: { token: t } }).catch(() => {})
  }
  if (cookieToken) cookieStore.delete(SESSION_COOKIE)
}

async function sessionUser(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  return session.user
}

export async function getCurrentUser() {
  // 1) Bearer token — survives webviews/iframe contexts where cookies are blocked.
  try {
    const h = await headers()
    const auth = h.get('authorization')
    if (auth?.toLowerCase().startsWith('bearer ')) {
      const token = auth.slice(7).trim()
      if (token) {
        const user = await sessionUser(token)
        if (user) return user
      }
    }
  } catch {
    /* headers() unavailable in this context */
  }
  // 2) Session cookie fallback.
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return sessionUser(token)
}

export const DEMO_EMAIL = 'judge@carepilot.app'
export const DEMO_PASSWORD = 'CarePilotDemo2026!'

/** Ensure the demo account exists with rich pre-seeded data for judges. */
export async function ensureDemoUser() {
  let demo = await db.user.findUnique({ where: { email: DEMO_EMAIL } })
  if (!demo) {
    demo = await db.user.create({
      data: {
        email: DEMO_EMAIL,
        name: 'Jordan (Demo)',
        passwordHash: hashPassword(DEMO_PASSWORD),
        isDemo: true,
      },
    })
    await seedDemoData(demo.id)
  }
  return demo
}

async function seedDemoData(userId: string) {
  const meds = await db.medication.createMany({
    data: [
      {
        userId,
        name: 'Lisinopril',
        dosage: '10 mg',
        frequency: 'once_daily',
        times: JSON.stringify(['08:00']),
        notes: 'Take with or without food, at the same time each day. For blood pressure.',
      },
      {
        userId,
        name: 'Metformin',
        dosage: '500 mg',
        frequency: 'twice_daily',
        times: JSON.stringify(['08:00', '20:00']),
        notes: 'Take with meals to reduce stomach upset. For blood sugar.',
      },
      {
        userId,
        name: 'Atorvastatin',
        dosage: '20 mg',
        frequency: 'once_daily',
        times: JSON.stringify(['21:00']),
        notes: 'Evening dose. Avoid grapefruit juice.',
      },
    ],
  })
  console.log(`[demo] seeded ${meds.count} medications`)

  // Seed 7 days of medication logs with realistic adherence (~85%)
  const allMeds = await db.medication.findMany({ where: { userId } })
  const now = new Date()
  for (let d = 6; d >= 0; d--) {
    const day = new Date(now)
    day.setDate(now.getDate() - d)
    for (const med of allMeds) {
      const times: string[] = JSON.parse(med.times)
      for (const t of times) {
        const [h, m] = t.split(':').map(Number)
        const scheduled = new Date(day)
        scheduled.setHours(h, m, 0, 0)
        const isFuture = scheduled > now
        const taken = !isFuture && (d === 0 ? Math.random() > 0.5 : Math.random() > 0.15)
        await db.medLog
          .create({
            data: {
              medicationId: med.id,
              scheduledFor: scheduled,
              status: isFuture ? 'pending' : taken ? 'taken' : 'skipped',
              takenAt: taken ? scheduled : null,
            },
          })
          .catch(() => {}) // ignore unique conflicts
      }
    }
  }

  await db.triageSession.createMany({
    data: [
      {
        userId,
        symptoms:
          'I have had a throbbing headache behind my right eye for two days, worse when I bend over. Some mild sensitivity to light. No fever.',
        response:
          '## Assessment\nYour symptoms are consistent with a tension-type or mild migraine pattern. The unilateral location and photophobia suggest migraine is more likely than tension headache.\n\n## Urgency\nNot an emergency, but worth a doctor visit if it persists beyond a few days or worsens.\n\n## Red Flags\nNo red-flag symptoms reported. Watch for: sudden "worst headache of life", fever with neck stiffness, confusion, vision loss, weakness or numbness.\n\n## Self-Care Steps\n- Rest in a dim, quiet room\n- Stay hydrated (drink 2L of water daily)\n- Consider OTC pain relief such as ibuprofen 400mg with food (if no contraindications)\n- Keep a headache diary noting triggers\n\n## When to Seek Care\n- If headaches recur more than 2-3 times per week\n- If pain suddenly becomes severe ("worst ever")\n- If you develop fever, stiff neck, confusion, or vision changes — seek emergency care immediately\n\n[URGENCY_LEVEL: SEE_DOCTOR]',
        urgency: 'SEE_DOCTOR',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        userId,
        symptoms:
          'Mild sore throat and runny nose since yesterday. No fever, no cough. I feel okay otherwise.',
        response:
          '## Assessment\nYour symptoms are most consistent with a common viral upper respiratory infection (common cold).\n\n## Urgency\nSelf-care is appropriate. This typically resolves in 7-10 days.\n\n## Red Flags\nNone reported. Watch for: fever above 39°C/102°F, difficulty swallowing or breathing, severe throat pain on one side, or a rash.\n\n## Self-Care Steps\n- Rest and drink warm fluids\n- Salt-water gargles (1/2 tsp salt in a glass of warm water) 3x daily\n- Throat lozenges or honey for soothing\n- Acetaminophen if needed for discomfort\n\n## When to Seek Care\n- Symptoms lasting more than 10 days without improvement\n- High fever, difficulty breathing or swallowing\n- One-sided severe throat pain with voice change (possible peritonsillar abscess)\n\n[URGENCY_LEVEL: SELF_CARE]',
        urgency: 'SELF_CARE',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ],
  })

  await db.labReport.createMany({
    data: [
      {
        userId,
        title: 'Annual Metabolic Panel',
        rawInput:
          'Glucose 108 mg/dL (fasting)\nHbA1c 6.1 %\nTotal Cholesterol 212 mg/dL\nLDL 138 mg/dL\nHDL 44 mg/dL\nTriglycerides 150 mg/dL',
        explanation:
          '## Overall Picture\nThis panel shows early signs of **prediabetes** and **borderline-high cholesterol**. Nothing here is an emergency, but these are exactly the numbers that respond well to action now.\n\n## Marker-by-Marker\n| Marker | Your Value | Reference | Status |\n|---|---|---|---|\n| Fasting Glucose | 108 mg/dL | 70-99 | ⚠️ Slightly high |\n| HbA1c | 6.1% | <5.7% | ⚠️ Prediabetes range |\n| Total Cholesterol | 212 mg/dL | <200 | ⚠️ Borderline high |\n| LDL | 138 mg/dL | <100 | ⚠️ High |\n| HDL | 44 mg/dL | >40 (men) | ✓ Acceptable |\n| Triglycerides | 150 mg/dL | <150 | ✓ At the limit |\n\n## What This Means\n- **HbA1c of 6.1%** falls in the prediabetes range (5.7-6.4%). Your average blood sugar over the past 3 months is running higher than ideal, though not yet in the diabetes range.\n- **LDL of 138** is the main cholesterol driver to work on — it is the "bad" cholesterol that builds up in artery walls.\n\n## Lifestyle Steps That Move These Numbers\n- 150 minutes of brisk walking weekly can lower HbA1c by 0.3-0.6%\n- Reducing refined carbs and sugary drinks directly lowers glucose\n- Swapping saturated fat (butter, fatty red meat) for olive oil, nuts, and fish lowers LDL\n- Losing 5-7% of body weight if overweight can cut diabetes risk by more than half\n\n## Questions to Ask Your Doctor\n1. Should I check my HbA1c again in 3 months to confirm the trend?\n2. Given my LDL, is a coronary-risk calculation (like ASCVD score) warranted?\n3. Would a referral to a dietitian be helpful?\n\n> This explanation is for education only and is not a medical diagnosis. Please review results with your clinician.',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ],
  })
}
