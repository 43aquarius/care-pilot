'use client'

import { motion } from 'framer-motion'
import {
  HeartPulse,
  Stethoscope,
  Pill,
  FileText,
  ClipboardList,
  Accessibility,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Keyboard,
  Eye,
  Type,
  Contrast,
  Lock,
  CheckCircle2,
  Github,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type { A11yState } from '@/components/care/a11y'

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.55, ease: 'easeOut' as const },
}

const FEATURES = [
  {
    icon: Stethoscope,
    title: 'AI Symptom Navigator',
    desc: 'Describe how you feel in plain words. CarePilot asks smart follow-up questions, spots red flags, and tells you whether to rest, book a doctor, or act now.',
  },
  {
    icon: Pill,
    title: 'Medication Manager',
    desc: 'Track every medication with a daily schedule, one-tap dose logging, and a 7-day adherence streak that keeps you honest and on track.',
  },
  {
    icon: FileText,
    title: 'Lab Report Translator',
    desc: 'Paste confusing lab numbers and get a plain-English explanation — marker by marker, with lifestyle steps and questions worth asking your doctor.',
  },
  {
    icon: ClipboardList,
    title: 'Doctor Visit Prep',
    desc: 'Turn scattered notes and symptom history into a crisp one-page summary, so you walk into every appointment ready and leave with answers.',
  },
]

const A11Y_POINTS = [
  {
    icon: Type,
    title: 'Large-text mode',
    desc: 'One tap scales the entire interface for comfortable reading — no pinching and squinting.',
  },
  {
    icon: Contrast,
    title: 'High-contrast theme',
    desc: 'Strong color separation and thicker borders for low-vision users, verified against WCAG AA.',
  },
  {
    icon: Keyboard,
    title: 'Keyboard-first design',
    desc: 'Every action is reachable by keyboard with a visible focus ring and a skip-to-content link.',
  },
  {
    icon: Eye,
    title: 'Screen-reader friendly',
    desc: 'Semantic landmarks, descriptive labels, and live regions announce AI responses as they stream.',
  },
]

export function Landing({
  onDemo,
  onSignIn,
  onSignUp,
  a11y,
  setA11y,
}: {
  onDemo: () => void
  onSignIn: () => void
  onSignUp: () => void
  a11y: A11yState
  setA11y: (s: A11yState) => void
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[30rem] w-[30rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-[26rem] w-[26rem] rounded-full bg-chart-3/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-2.5" aria-label="CarePilot home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <HeartPulse className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg font-bold tracking-tight">CarePilot</span>
          </a>
          <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#accessibility" className="transition-colors hover:text-foreground">Accessibility</a>
            <a href="#how-it-works" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#safety" className="transition-colors hover:text-foreground">Safety</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onSignIn} className="h-11 px-4">
              Sign in
            </Button>
            <Button onClick={onDemo} className="h-11 px-4 font-semibold shadow-sm">
              Try the demo
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section id="top" className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Badge variant="secondary" className="mb-5 gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Built for HealthHack 48 · Technology × Healthcare
              </Badge>
              <h1 className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
                Your AI copilot for{' '}
                <span className="relative whitespace-nowrap text-primary">
                  everyday health
                  <svg aria-hidden className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" preserveAspectRatio="none">
                    <path d="M2 9C60 3 150 2 298 8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-primary/30" />
                  </svg>
                </span>{' '}
                decisions
              </h1>
              <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
                CarePilot turns &ldquo;should I be worried about this?&rdquo; into a clear next step — with AI symptom
                triage, medication tracking, plain-language lab explanations, and visit prep that gets
                you heard. Designed accessibility-first, because health tools should work for everyone.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={onDemo} className="h-14 px-7 text-base font-semibold shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02]">
                  Explore the live demo
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
                </Button>
                <Button size="lg" variant="outline" onClick={onSignUp} className="h-14 px-7 text-base font-semibold">
                  Create free account
                </Button>
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4 shrink-0" aria-hidden />
                Private by design — your health notes stay in your account.
              </p>
            </motion.div>

            {/* Hero visual: mock triage card */}
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative mx-auto w-full max-w-md lg:max-w-none"
              role="img"
              aria-label="Preview of the CarePilot symptom checker showing an AI assessment with a green self-care result"
            >
              <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-chart-3/20 blur-xl" aria-hidden />
              <Card className="relative border-2 border-border/80 shadow-2xl">
                <CardContent className="p-5 sm:p-6">
                  <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Stethoscope className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-bold">Symptom Navigator</p>
                      <p className="text-xs text-muted-foreground">AI triage · streaming</p>
                    </div>
                    <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                      <span className="relative flex h-2 w-2" aria-hidden>
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      Online
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
                      I&rsquo;ve had a scratchy throat and low energy since yesterday. No fever. Should I worry?
                    </div>
                    <div className="max-w-[92%] rounded-2xl rounded-bl-md border bg-card px-4 py-3 text-sm shadow-sm">
                      <p className="mb-1.5 font-semibold">Assessment</p>
                      <p className="text-muted-foreground">
                        Your symptoms fit a common viral upper-respiratory pattern. Nothing you&rsquo;ve described
                        is alarming — rest and fluids should carry you through…
                      </p>
                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-400">
                        🌿 Self-care appropriate — manage at home
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 pl-1 text-xs text-muted-foreground" aria-hidden>
                      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-labelledby="features-heading">
          <motion.div {...fadeUp} className="mx-auto mb-12 max-w-2xl text-center">
            <h2 id="features-heading" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Four tools, one calm dashboard
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Health anxiety comes from not knowing what to do next. CarePilot always gives you a next step.
            </p>
          </motion.div>
          <div className="grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }}>
                <Card className="group h-full border-border/80 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                  <CardContent className="flex h-full flex-col gap-4 p-6">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <f.icon className="h-6 w-6" aria-hidden />
                    </span>
                    <h3 className="text-xl font-bold">{f.title}</h3>
                    <p className="text-[0.95rem] leading-relaxed text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Accessibility */}
        <section id="accessibility" className="border-y border-border/70 bg-accent/40 py-16" aria-labelledby="a11y-heading">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <motion.div {...fadeUp} className="mx-auto mb-4 max-w-2xl text-center">
              <Badge className="mb-4 gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10">
                <Accessibility className="h-3.5 w-3.5" aria-hidden />
                Accessibility-first
              </Badge>
              <h2 id="a11y-heading" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Health tools should work for <span className="text-primary">every body</span>
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                One in four adults lives with a disability. Most health apps ignore them. CarePilot ships
                accessibility as a feature — try it live right now:
              </p>
            </motion.div>

            {/* Live a11y demo toggles */}
            <motion.div {...fadeUp} className="mx-auto mb-12 mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-background p-5">
              <div className="flex items-center gap-3 px-2">
                <Switch
                  id="demo-large-text"
                  checked={a11y.largeText}
                  onCheckedChange={(v) => setA11y({ ...a11y, largeText: v })}
                  aria-label="Toggle large text mode"
                />
                <Label htmlFor="demo-large-text" className="cursor-pointer font-medium">Large text</Label>
              </div>
              <div className="flex items-center gap-3 px-2">
                <Switch
                  id="demo-contrast"
                  checked={a11y.highContrast}
                  onCheckedChange={(v) => setA11y({ ...a11y, highContrast: v })}
                  aria-label="Toggle high contrast mode"
                />
                <Label htmlFor="demo-contrast" className="cursor-pointer font-medium">High contrast</Label>
              </div>
              <div className="flex items-center gap-3 px-2">
                <Switch
                  id="demo-motion"
                  checked={a11y.reduceMotion}
                  onCheckedChange={(v) => setA11y({ ...a11y, reduceMotion: v })}
                  aria-label="Toggle reduce motion"
                />
                <Label htmlFor="demo-motion" className="cursor-pointer font-medium">Reduce motion</Label>
              </div>
            </motion.div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {A11Y_POINTS.map((p, i) => (
                <motion.div key={p.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.07 }}>
                  <Card className="h-full border-border/80 bg-background/80 shadow-sm">
                    <CardContent className="flex h-full flex-col gap-3 p-5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <p.icon className="h-5 w-5" aria-hidden />
                      </span>
                      <h3 className="font-bold">{p.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-labelledby="how-heading">
          <motion.div {...fadeUp} className="mx-auto mb-12 max-w-2xl text-center">
            <h2 id="how-heading" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              From &ldquo;I don&rsquo;t feel great&rdquo; to a plan, in minutes
            </h2>
          </motion.div>
          <ol className="grid gap-8 md:grid-cols-3">
            {[
              {
                n: '01',
                title: 'Tell CarePilot what you feel',
                desc: 'Plain words, no forms. The AI asks a couple of focused follow-up questions — like a thoughtful nurse — then assesses.',
              },
              {
                n: '02',
                title: 'Get a clear care level',
                desc: 'Every check ends with a color-coded urgency — self-care, see a doctor, urgent care, or emergency — plus red flags to watch.',
              },
              {
                n: '03',
                title: 'Act with confidence',
                desc: 'Follow self-care steps, log your medications, translate lab results, and walk into your appointment with a prep sheet.',
              },
            ].map((s, i) => (
              <motion.li key={s.n} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.1 }} className="relative">
                <span aria-hidden className="text-5xl font-extrabold text-primary/15">{s.n}</span>
                <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{s.desc}</p>
              </motion.li>
            ))}
          </ol>
        </section>

        {/* Safety */}
        <section id="safety" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6" aria-labelledby="safety-heading">
          <motion.div {...fadeUp}>
            <Card className="border-amber-200/70 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/30">
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:p-8">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                  <ShieldCheck className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <h2 id="safety-heading" className="text-xl font-bold">Safety is the design brief</h2>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    CarePilot is an educational tool, not a doctor. It never diagnoses or prescribes. It
                    surfaces red-flag symptoms and pushes you toward professional care whenever the
                    situation warrants it — and tells you to call emergency services immediately when
                    it must. Every AI response carries this reminder, and your data stays in your account.
                  </p>
                  <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    {[
                      'Emergency escalation built into every triage',
                      'No diagnosis, no prescriptions — guidance only',
                      'Red-flag watchlists in every assessment',
                      'Private accounts with secure sessions',
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6" aria-labelledby="cta-heading">
          <motion.div
            {...fadeUp}
            className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground shadow-xl sm:px-12"
          >
            <div aria-hidden className="absolute -top-24 left-1/4 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div aria-hidden className="absolute -bottom-24 right-1/4 h-64 w-64 rounded-full bg-black/10 blur-2xl" />
            <h2 id="cta-heading" className="relative text-3xl font-extrabold tracking-tight sm:text-4xl">
              Stop guessing. Start knowing.
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-lg opacity-90">
              Judges and curious minds: jump straight into the fully-seeded demo account — medications,
              symptom history, lab reports and all.
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" variant="secondary" onClick={onDemo} className="h-14 px-8 text-base font-bold">
                Enter demo dashboard
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
              </Button>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/70 bg-background" role="contentinfo">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HeartPulse className="h-4 w-4" aria-hidden />
            </span>
            <span className="font-semibold text-foreground">CarePilot</span>
            <span>· HealthHack 48 submission</span>
          </div>
          <p className="max-w-md">
            CarePilot provides educational health guidance only and is not a substitute for professional
            medical advice, diagnosis, or treatment.
          </p>
          <span className="flex items-center gap-1.5">
            <Github className="h-4 w-4" aria-hidden /> Open source during the hackathon
          </span>
        </div>
      </footer>
    </div>
  )
}
