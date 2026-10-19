# CarePilot — Your AI Health Copilot 🩺✈️

**Healthcare between visits.** CarePilot is an AI-powered health companion that helps people navigate the 99% of healthcare that happens *outside* the clinic: understanding symptoms, staying on top of medications, decoding lab reports, and walking into doctor visits prepared.

> 🏆 Built for **HEALTHHACK 48** (tech × healthcare hackathon).

---

## Why CarePilot

Most health tools solve one narrow problem. CarePilot connects the whole journey of an everyday health worry:

1. **Symptom Navigator** — describe what you feel in plain words; the AI asks focused follow-up questions, checks for red flags, and returns a structured assessment with an explicit **care level** (`SELF_CARE` / `SEE_DOCTOR` / `URGENT_CARE` / `EMERGENCY`) — never a diagnosis.
2. **Medications** — a schedule with doses, times, and adherence tracking; log doses as taken/skipped and watch your 7-day adherence score.
3. **Lab Reports, translated** — paste raw lab results and get a marker-by-marker plain-language table, what the numbers mean, lifestyle steps that move them, and questions to ask your doctor.
4. **Visit Prep** — one click pulls your symptom-check history and current medications into a one-page, first-person summary so your 15 minutes with the doctor actually count.

Everything is **safety-first**: emergency red-flag detection runs on every triage turn, and every output carries an "educational tool, not a diagnosis" reminder.

## Accessibility is a feature, not an afterthought

- **WCAG-minded semantics** — landmark roles, skip-to-content, labeled controls, visible focus rings, keyboard-operable flows.
- **Built-in accessibility panel** — high-contrast mode, larger text, and reduced-motion toggles, persisted per device (the same controls judges can try in one click).
- **Responsive by default** — works from a 360 px phone to a desktop dashboard.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, strict) |
| UI | Tailwind CSS 4 + shadcn/ui (New York), Lucide icons |
| Database | Prisma ORM + SQLite (server-side) |
| Auth | Custom session auth (Argon2-grade hashing, HTTP-only cookies) |
| AI | Provider-portable completion layer (see below) |

### Portable AI layer

`src/lib/ai.ts` abstracts every AI call. The app runs in two modes, detected automatically at runtime:

- **Self-hosted / sandbox mode** — uses the bundled `z-ai-web-dev-sdk` (no extra config).
- **Portable mode** — any OpenAI-compatible endpoint (GLM, OpenAI, DeepSeek, Groq, Ollama…) via three environment variables:

```bash
AI_BASE_URL=https://open.bigmodel.cn/api/paas/v4   # any /chat/completions endpoint
AI_API_KEY=your-key
AI_MODEL=glm-4.6
```

Streaming (triage chat) and non-streaming (labs, visit prep) are both covered, with SSE re-framing handled in one place.

## Run it locally

```bash
# 1. Install
bun install        # or npm install

# 2. Database (SQLite, file-based — zero setup)
bun run db:push

# 3. Optional: portable AI mode (otherwise the sandbox SDK is used)
cp .env.example .env   # then edit AI_* values

# 4. Dev server
bun run dev        # http://localhost:3000
```

The landing page has a **one-click demo account** (`judge@carepilot.app`) seeded with realistic medications, symptom-check history, and a sample lab report — no signup required to explore.

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # register / login / logout / me (session cookies)
│   │   ├── triage/        # streaming AI symptom navigator + history
│   │   ├── medications/   # CRUD + dose logging + adherence
│   │   ├── labs/          # AI lab-report explainer
│   │   └── visit-prep/    # AI doctor-visit summary
│   ├── layout.tsx
│   └── page.tsx           # landing ⇄ dashboard shell
├── components/
│   ├── care/              # landing, dashboard, triage chat, meds, labs,
│   │                      # visit prep, auth dialog, a11y panel
│   └── ui/                # shadcn/ui primitives
├── lib/                   # ai (portable layer), auth, db, types, utils
└── prisma/schema.prisma   # User, Session, Medication, MedLog,
                           # TriageSession, LabReport
```

## Safety & scope

CarePilot is an **educational tool**, not a medical device. It does not diagnose, prescribe, or replace professional care. Emergency red flags (chest pain, stroke signs, severe bleeding, suicidal ideation, anaphylaxis…) trigger an immediate "call emergency services" response regardless of the conversation state.

## License

MIT
