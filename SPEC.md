# FountainOfCali — Project Spec

**Owner:** Jack Humphreys
**Repo:** https://github.com/JackHumphreysDev/FountainOfCali
**Status:** v1.4 — flexible training window and golf timing added

---

## 1. Overview

FountainOfCali is a personal web app that tells me exactly what to do each day for **calisthenics** and **stretching / yoga**, shows me how to do each movement, lets me tick it off, and lets me look back over previous days to see how consistent I've been.

### Goals
- Build a better physique through structured, progressive calisthenics.
- Improve mobility and flexibility through daily stretching / yoga.
- Remove decision-making: open the app, see today's plan, do it, tick it off.
- Build a habit by making progress visible.

### Non-goals (v1)
- No social features, sharing, or multi-user accounts.
- No payments, no public marketing site.
- No wearable / health-app integration.
- No AI-generated plans (can be a later phase).

---

## 2. User Profile (the only user)

| Attribute | Value |
|---|---|
| Age | 31 |
| Height | 6 ft 3 in (~190 cm) |
| Starting weight | 83 kg |
| Experience | Beginner at stretching/yoga; some strength & conditioning history (~age 25), currently detrained |
| Equipment | **Pull-up bar + yoga mat only** |
| Injuries | None |
| Usage | Daily, mostly phone, some desktop |
| Training time | **Flexible: morning, up to lunchtime** (≈ 45–60 min window; finish before midday) |
| Time per day | ~30–45 min calisthenics + 10–15 min stretch (approved) |

### Goals
1. **Lose weight** and fat around the midsection (lose the beer belly).
2. **Toned stomach** and a lean, athletic physique with added muscle (lean + muscle / body recomposition).
3. **Flexibility and mobility** to support **goalkeeping (football, Mon + Tue 7–8pm)** and **golf (sporadic: usually Wed or Thu, plus one weekend day)**.
4. **Get back into indoor bouldering** — build climbing-specific strength (pulling, grip/forearms, shoulder health, core) so I can return safely.

### Sport-specific mobility focus
- **Goalkeeping:** hip mobility (adductors, hip flexors, 90/90), hamstrings, shoulder and thoracic mobility for diving/reaching, groin and ankle prep, explosive leg and core strength.
- **Golf:** thoracic spine rotation, hip internal rotation, glute activation, lat/shoulder mobility, anti-rotation core, lower-back-friendly hamstring and hip work.
- **Bouldering:** pulling strength (pull-ups, rows), scapular control, dead-hang grip endurance, forearm/wrist conditioning, core tension (hollow body, leg raises), hip mobility (high steps, drop knees), antagonist work (push-ups, reverse wrist curls, shoulder external rotation) to protect elbows and shoulders.
- Sport days get a shorter session (see §3.5) with a sport-specific pre-game mobility primer and post-game stretch.

**Design implication of height:** long levers make push/pull progressions harder and some yoga poses need modification. Exercise entries include **tall-person tips** where relevant (blocks/books under hands, wall-assisted variations, strap or towel for hamstrings).

**Beginner implication:** the app starts easy (regressions first) and progresses by phase, since the stretching habit and tendon/muscle conditioning are new.

---|---|
| Height | 6 ft 3 in (~190 cm) |
| Starting weight | 83 kg |
| Goals | Better physique, better mobility |
| Equipment | *To confirm — assume minimal at start (floor, wall, sturdy chair/bench; pull-up bar is an optional add-on)* |
| Usage | Daily, on phone mostly, plus desktop |

**Design implication of height:** at 6'3" levers are long, so pulling / pushing progressions will feel harder than for shorter people and some yoga poses need modification. Exercise entries should include **tall-person tips** where relevant (e.g. wider stance, wall-assisted variations, using blocks/books under hands).

---

## 3. Core Features (MVP)

### 3.1 Daily Plan ("Today" screen)
- Shows today's date and the scheduled session(s), split into sections:
  1. **Warm-up** (5 min)
  2. **Calisthenics block** (strength / skill work)
  3. **Stretch / Yoga block** (mobility)
- Each item displays: name, target (sets × reps or hold time), rest time, and a thumbnail.
- Progress indicator at the top (e.g. 7 / 14 done, progress bar).
- A clear "Rest / active recovery day" state on rest days (light stretching only).

### 3.1b Flexible Session Timing
- A day's plan is **not tied to a clock time**. The checklist is the same whether done at 7am or 12pm.
- Optional per-day field: **session time** (Morning / Late morning / Lunchtime), purely informational for history.
- Optional per-day **golf start** (Afternoon / Weekend midday) so the app can remind me to finish the main session beforehand. No scheduling or notifications required in v1.
- Split-session support: the stretch/yoga block can be ticked off separately from the calisthenics block (e.g. strength in the morning, cooldown after golf).

### 3.2 Exercise Guidance (media)
- Tapping an item opens a **detail view** containing:
  - Video (preferred) **or** looping GIF / image sequence showing the movement.
  - 2–5 short form cues ("ribs down, squeeze glutes").
  - Common mistakes.
  - Easier / harder variations (regression / progression).
  - Tall-person notes where relevant.
  - Muscles worked / mobility area targeted.
- **Media source options** (decide at build time):
  - Embed YouTube videos by ID (lowest effort, no hosting, no copyright issues as it's embedded not copied).
  - Self-host short clips I film or have licence to use.
  - Use openly licensed image sets for static guidance.
- Do **not** copy/rip other people's copyrighted videos or images into the repo; link or embed instead.

### 3.3 Checklist
- Each exercise / stretch has a checkbox (large tap target for mobile).
- Optional: log actual reps/time achieved vs target (stretch goal in v1, important in v2).
- Ticking all items marks the day as **Complete**; partially ticked = **Partial**; none = **Missed**.
- Items can be unticked (mistakes happen).

### 3.4 History / Progress
- **Calendar view**: each day coloured by status (Complete / Partial / Missed / Rest).
- Tap any past day to see exactly what was scheduled and what was ticked.
- **Streak counter** (current and longest).
- **Weekly summary**: completion %, sessions done, total stretch minutes.
- Simple charts: completion over time; (v2) weight and reps progression.

### 3.5 Schedule / Programme
- Fixed commitments: **football Mon + Tue 7–8pm**. **Golf** is flexible (usually Wed or Thu, plus one weekend day). **Bouldering** will be sporadic, on random evenings, as a slow return. It is treated as an optional extra and must **not** alter the programme. Training happens **any time from morning up to lunchtime** (not fixed), so it is always well clear of evening football (7pm) and afternoon golf (weekdays from ~3pm, weekends from ~12–1pm).
- Default weekly template:

| Day | Focus |
|---|---|
| Mon | **Football night.** Short (20–25 min) morning/lunchtime session: core + hip/shoulder mobility primer; post-match stretch after. No heavy leg work. |
| Tue | **Football night.** Same pattern: mobility + light core; post-match stretch. |
| Wed | **Pull + bouldering strength** (pull-ups/negatives, rows, dead hangs, scapular pulls, hollow body) + t-spine/hip mobility. If golf: add pre-round primer and post-round stretch. |
| Thu | **Push + legs + core** (push-ups, dips, squats, lunges, planks) + golf rotation mobility. If golf: swap to primer/post-round stretch + lighter session. |
| Fri | **Full-body calisthenics** (push, pull, legs, core) + yoga flow. |
| Sat | **Pull / climbing support** + core + hips. If golf or bouldering: use the sport overlay below and keep strength light. |
| Sun | **Rest / gentle yoga** (15–20 min). If golf: primer + post-round stretch. |

- **Recovery rules for the programme data:**
  - Leave ~48h between hard pulling or grip sessions (Wed and Sat/Sun are the main pull days; Fri pulling is lighter volume).
  - Keep hard pulling off the day before bouldering.
  - Progress finger/grip loading very gradually (dead hang time first). No hangboard assumed; I only have a pull-up bar.
- **Bouldering is ad hoc:** no fixed bouldering days and no programme changes for it. Logging a bouldering session is optional (a flag on the day). The Wed/Sat pull work already builds the base. The recovery rule still applies: if bouldering the evening before a hard pull day, the app may suggest a lighter pull (optional nicety, not required for v1).
- **Sport overlay (feature):** any day can be flagged **Golf**, **Football**, **Bouldering** or **None**. Flagging a day injects that sport's pre-activity primer and post-activity stretch block into the day and optionally reduces strength volume. Default flags: football on Mon/Tue; golf and bouldering are toggled per day because they're not fixed. Because training is in the morning or up to lunchtime, the overlay's "primer" is part of that session and the "cooldown" is a short optional post-activity stretch (shown as a separate checklist block). Weekend golf starts around 12–1pm, so on weekend golf days the main session should be done in the morning.
- **Weight loss support:** daily step target and a weekly weigh-in (Phase 3 logging). The app gives training guidance only; nutrition (calorie deficit, protein) is the main driver of fat loss and is a reminder, not tracked in v1.
- The weekly template is editable in the programme data file, not hard-coded in the UI.

- **Phases** (e.g. 4-week blocks): each phase bumps volume or swaps in harder variations. The app should auto-select the right phase from a start date.

---

## 4. Suggested Starter Exercise Library

Not exhaustive; stored as data (see §6).

**Calisthenics**
- Push: incline push-ups → push-ups → diamond push-ups → pike push-ups → decline push-ups, dips (chair/bars)
- Pull: dead hangs, scapular pulls → negative pull-ups → pull-ups → chin-ups, hanging knee raises, dead hangs (pull-up bar available)
- Legs: bodyweight squats, reverse lunges, Bulgarian split squats, glute bridges, calf raises, single-leg RDL
- Core (belly/gut focus: tone the abs, with fat loss from diet and activity): plank, side plank, dead bug, hollow hold, leg raises, bird-dog

**Bouldering support**
- Dead hangs (two-arm, then offset/one-arm assisted), scapular pull-ups, active hangs
- Pull-ups, chin-ups, archer progressions, inverted/Australian rows (low bar or table)
- Hollow body hold, leg raises / hanging knee raises, L-sit progressions, front lever tuck (later phase)
- Push-up variations, pike push-ups (antagonist/shoulder balance)
- Reverse wrist curls (with a light weight or bottle), wrist extensor and finger extensor stretches, forearm flexor stretches
- Shoulder external rotation (band or towel variations), wall slides
- Frog stretch, deep squat, hip openers (for high steps and drop knees)

**Golf / goalkeeping primers**
- Open-book t-spine rotation, thread-the-needle, 90/90 hip switches, world's greatest stretch
- Lateral lunges, adductor rocks, glute bridges, leg swings, shoulder circles

**Stretch / Yoga**
- Cat-cow, child's pose, downward dog, cobra / upward dog
- Low lunge / hip flexor stretch, pigeon pose, 90/90 hips
- Hamstring stretch (use a strap / towel — long legs), forward fold
- Thoracic rotation, thread-the-needle, doorway chest stretch
- Couch stretch, deep squat hold, wall angels

---

## 5. User Flows

1. **Open app → Today screen** → see plan → tap exercise for guidance → do it → tick it → repeat → day marked Complete.
2. **History** → calendar → tap a past date → read-only (or editable) view of that day's ticks.
3. **Programme** → view upcoming week / current phase; (v2) edit the plan.

---

## 6. Data Model

Programme content is **data, not code**, so I can tweak it without touching the UI.

```ts
type Exercise = {
  id: string;                  // "pushup-standard"
  name: string;
  category: "calisthenics" | "stretch" | "yoga" | "warmup";
  muscles: string[];
  cues: string[];
  commonMistakes: string[];
  tallPersonNotes?: string;
  media: { type: "youtube" | "video" | "gif" | "image"; src: string; thumb?: string }[];
  easier?: string;             // exercise id
  harder?: string;             // exercise id
};

type PlanItem = {
  exerciseId: string;
  sets?: number;
  reps?: number | string;      // "8-12"
  holdSeconds?: number;
  restSeconds?: number;
};

type DayTemplate = {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  title: string;               // "Push + Hips"
  sections: { name: string; items: PlanItem[] }[];
};

type SportTag = "football" | "golf" | "bouldering";

type SportBlock = {
  sport: SportTag;
  primer: PlanItem[];          // pre-activity mobility
  cooldown: PlanItem[];        // post-activity stretch
  strengthVolumeMultiplier?: number;   // e.g. 0.6 to reduce load on sport days
};

type Phase = { id: string; name: string; weeks: number; days: DayTemplate[] };

// User-generated data
type DayLog = {
  date: string;                // "2026-10-06" (ISO, local date)
  sportFlags: SportTag[];      // sport overlay applied for this day
  sessionTime?: "morning" | "late-morning" | "lunchtime";  // optional, informational
  phaseId: string;
  completed: { exerciseId: string; done: boolean; actualReps?: number; actualSeconds?: number }[];
  notes?: string;
  status: "complete" | "partial" | "missed" | "rest";
};

type BodyLog = { date: string; weightKg: number };   // v2
```

---

## 7. Technical Approach

I'll confirm the stack when starting the build; this is the recommended default.

| Concern | Recommendation | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Matches my web-dev skills; easy Vercel deploys |
| Styling | **Tailwind CSS** | Fast, mobile-first |
| Content | JSON / TS files in `/data` | Plan and exercises are editable data |
| Storage v1 | **localStorage / IndexedDB** | Zero backend, fast to build; fine for one user |
| Storage v2 | **Supabase (or similar)** | Sync across phone + laptop, backup |
| Hosting | **Vercel** | Free tier, auto-deploy from GitHub |
| PWA | Web manifest + service worker | Install to phone home screen, works offline |

**Caveat on localStorage:** data lives in one browser on one device — clearing site data loses history. Include a simple **Export / Import JSON** button in v1 as a safety net.

**Date handling:** use the user's *local* date for "today" (avoid UTC off-by-one around midnight).

---

## 8. UX & Design Requirements

- **Mobile-first**, one-handed use, large tap targets.
- Dark mode by default (gym / morning use), light mode optional.
- "Today" loads in under 2 seconds; works offline after first load.
- Minimal friction: a day should be completable with taps only — no typing required.
- Clear visual difference between calisthenics and stretch blocks.
- Accessible: sufficient contrast, labelled checkboxes, keyboard operable.

---

## 9. Milestones

**Phase 1 — MVP (build first)**
- [ ] Project scaffold, deploy to Vercel
- [ ] Exercise + programme data files (1 phase, 7-day template)
- [ ] Today screen with sections and checklist
- [ ] Exercise detail view with media + cues
- [ ] Persist ticks (localStorage), day status logic
- [ ] History: calendar + past-day view
- [ ] Export / Import JSON

**Phase 1 addition:** sport overlay flags (football/golf/bouldering) per day, including football defaults on Mon + Tue.

**Phase 2 — Make it stick**
- [ ] PWA install + offline
- [ ] Streaks and weekly summary
- [ ] Log actual reps / hold times
- [ ] Rest timer and hold timer
- [ ] Multi-phase progression

**Phase 3 — Nice to have**
- [ ] Cloud sync (Supabase) across devices
- [ ] Weight / measurements tracking and charts
- [ ] Progress photos
- [ ] Reminder notifications
- [ ] Editable programme in-app
- [ ] Optional AI-suggested adjustments

---

## 10. Success Criteria

- I open it every day and complete the plan ≥ 5 days/week for 8 weeks.
- I can see at a glance how many days I completed this month.
- Pull-ups / push-ups / hold times measurably improve; hamstring and hip mobility feels noticeably better.
- Weight and physique trend toward my goal (tracked in Phase 3).

---

## 11. Decisions, Risks & Remaining Questions

### Resolved
| # | Question | Answer |
|---|---|---|
| 1 | Equipment | Pull-up bar + yoga mat only |
| 2 | Physique goal | Lean + muscle (lose fat, tone stomach, build muscle) |
| 3 | Time per day | 30–45 min calisthenics + 10–15 min stretch — approved |
| 4 | Media | YouTube embeds |
| 5 | Injuries | None; 31, new to stretching, some past S&C |
| 6 | Advice | Open to guidance |
| 7 | Risk mitigations | Approved |
| 8 | Football days | Monday and Tuesday, 7–8pm |
| 9 | Golf days | Sporadic: usually Wed or Thu, plus one weekend day |
| 10 | Bouldering | Sporadic evenings, slow return; shouldn't affect training |
| 11 | Training time | Flexible: morning, up to lunchtime |
| 12 | Golf timing | Weekdays from ~3pm; weekends from ~12–1pm |

### Remaining
None blocking. Ready to build.

### Risks
- **Single-device storage:** mitigated by export/import, then cloud sync.
- **Overdoing it as a beginner:** the programme starts with regressions and a gradual ramp; stretch to mild tension only.
- **Fat loss depends mostly on diet and activity**, not ab exercises alone — the app will include a gentle reminder and a weekly weigh-in later.

> **Safety note:** this is a self-guided plan, not medical advice. Never stretch into sharp pain; check with a doctor or physio if anything flares up.

---|---|---|
| 1 | What equipment do I have? | Pull-up bar changes the pull programme a lot |
| 2 | Physique goal: lean, muscle gain, or recomposition? | Affects volume and whether nutrition notes are added |
| 3 | Time per day? | Suggest 30–45 min calisthenics + 10–15 min stretch; confirm |
| 4 | Where does media come from? | YouTube embeds vs filming my own |
| 5 | Any injuries or limitations? | Plan should be adjusted accordingly |
| 6 | Single-device storage risk | Mitigated by export/import, then cloud sync |
| 7 | Overtraining / skipping rest | Rest days are built into the schedule; stretching shouldn't be painful |

> **Safety note:** this is a self-guided plan, not medical advice. Stretch to mild tension, never sharp pain, and check with a doctor or physio if you have any injuries or health concerns.

---

## 12. Repo Structure (proposed)

```
FountainOfCali/
├── README.md
├── SPEC.md
├── data/
│   ├── exercises.ts
│   └── programme.ts
├── src/ (or app/)
│   ├── today/
│   ├── history/
│   ├── exercise/[id]/
│   ├── components/
│   └── lib/ (storage, dates, status logic)
├── public/
│   └── media/ (self-hosted clips/images)
└── package.json
```
