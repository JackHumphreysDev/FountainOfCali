# Fountain of Cali

A personal strength and mobility planner for one person. The Phase 1 app includes a seven-day programme, sport primers and cooldowns, exercise guidance, a daily checklist, a history calendar, and JSON backup.

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
- The current phase is a beginner foundation block. Later phases and automatic progression are planned after the MVP.

## Your data

Completion history is saved in this browser's `localStorage`. It does not sync across devices. Use **Settings → Export JSON** for a backup and **Import JSON** to restore it. Import replaces the existing browser log after a confirmation.

## Deployment

The app is a standard Next.js project and can be imported into Vercel from the GitHub repository. No environment variables or backend are needed for Phase 1. See [SPEC.md](SPEC.md) for the complete project plan and later milestones.
