# Fountain of Cali

A personal strength and mobility planner with a daily checklist, history, editable weekly programme, body measurements, progress photos, optional cloud sync, reminders, and AI suggestions.

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. To check the app before deployment:

```bash
npm run lint
npm test
npm run build
```

## Programme content

- Edit [data/programme.ts](data/programme.ts) to change the weekly schedule, targets, and sport overlays.
- Edit [data/exercises.ts](data/exercises.ts) to change exercise guidance and embedded YouTube videos.
- Phases advance from the start date in Settings: Foundation (weeks 1–4), Build (weeks 5–8), and Progress (week 9 onward). Previously logged days keep their phase.

## Your data

Training logs, measurements, and programme edits stay in browser storage until you explicitly save them to the cloud. Photos stay in IndexedDB until you explicitly upload them. **Settings → Export JSON** backs up training data and measurements, but not photos. Cloud save and load are separate actions with confirmation before replacing existing data. Install from your browser’s Add to Home Screen menu for offline use after the first visit.

## Deployment

Create a Supabase project, run [supabase/schema.sql](supabase/schema.sql) once in its SQL editor, and set Auth → URL Configuration → Site URL to the deployed origin. Copy [.env.example](.env.example) to `.env.local` and fill in the public Supabase URL and publishable key. Set the same public variables in Vercel for production.

This deployment has one owner account. Supabase Auth signups are disabled, and the production app admits only the confirmed owner user ID in [app/ui.tsx](app/ui.tsx). If the Supabase project is replaced, update that ID after the new owner account is confirmed.

For closed-app reminders, generate a VAPID key pair and set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, the Supabase server-only secret key, and a random `CRON_SECRET` in Vercel. The scheduled function in [vercel.json](vercel.json) sends at 09:00 UTC. Vercel cron must be enabled on the project. For optional AI suggestions, set `OPENAI_API_KEY` and `OWNER_EMAIL` as server-only Vercel secrets, then set `NEXT_PUBLIC_AI_ENABLED=true` and redeploy. The advice route accepts requests only from that email, sends recent training totals and weight trend to OpenAI on button click, and caches one result per day.

See [SPEC.md](SPEC.md) for the project plan.
