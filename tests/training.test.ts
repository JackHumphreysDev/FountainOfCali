import assert from 'node:assert/strict'
import { test } from 'node:test'
import { exerciseById } from '../data/exercises'
import { defaultSports, phaseFor, planFor, programme, sportBlocks } from '../data/programme'
import { effectiveLog, itemKey, phaseIdFor, progress, streaks, validateBackup, validateImport, weeklySummary, type DayLog } from '../lib/training'

test('every scheduled movement has guidance and all seven days have a plan', () => {
  assert.equal(programme.days.length, 7)
  for (const day of programme.days) for (const section of day.sections) for (const item of section.items) assert.ok(exerciseById[item.exerciseId]?.media.length, item.exerciseId)
  for (const sport of Object.values(sportBlocks)) for (const item of [...sport.primer, ...sport.cooldown]) assert.ok(exerciseById[item.exerciseId]?.media.length, item.exerciseId)
})

test('football defaults, sport volume, and completion remain stable when overlays change', () => {
  const monday = '2026-10-05'
  assert.deepEqual(defaultSports(monday), ['football'])
  const thursday = '2026-10-08'
  const base = planFor(thursday, [])
  const golf = planFor(thursday, ['golf'])
  const baseStrength = base.sections.find(section => section.kind === 'strength')!
  const golfStrength = golf.sections.find(section => section.kind === 'strength')!
  assert.ok(golfStrength.items[0].sets! < baseStrength.items[0].sets!)
  const key = itemKey(baseStrength.name, 0, baseStrength.items[0].exerciseId)
  assert.equal(key, itemKey(golfStrength.name, 0, golfStrength.items[0].exerciseId))
  const log: DayLog = { sportFlags: [], completed: [] }
  const keys = base.sections.flatMap(section => section.items.map((item, index) => itemKey(section.name, index, item.exerciseId)))
  assert.equal(progress(thursday, log).status, 'missed')
  assert.equal(progress(thursday, { ...log, completed: [keys[0]] }).status, 'partial')
  assert.equal(progress(thursday, { ...log, completed: keys }).status, 'complete')
  assert.deepEqual(effectiveLog({}, monday).sportFlags, ['football'])
})

test('import rejects invalid data before replacing a backup', () => {
  assert.throws(() => validateImport({ '2026-10-05': { sportFlags: ['other'], completed: [] } }))
  assert.deepEqual(validateImport({ '2026-10-05': { sportFlags: ['football'], completed: [] } })['2026-10-05'].sportFlags, ['football'])
})


test('phases advance by start date and logged days keep their chosen phase', () => {
  assert.equal(phaseFor('2026-10-05', '2026-11-01').id, 'foundation')
  assert.equal(phaseFor('2026-10-05', '2026-11-02').id, 'build')
  assert.equal(phaseFor('2026-10-05', '2026-11-30').id, 'progress')
  const day = '2026-12-03'
  const foundation = planFor(day, [], 'foundation')
  const advanced = planFor(day, [], 'progress')
  assert.equal(advanced.sections.find(section => section.kind === 'strength')!.items[0].exerciseId, 'pushup')
  assert.ok(advanced.sections.find(section => section.kind === 'strength')!.items[0].sets! > foundation.sections.find(section => section.kind === 'strength')!.items[0].sets!)
  assert.equal(phaseIdFor({ [day]: { sportFlags: [], completed: [], phaseId: 'build' } }, day, '2026-10-05'), 'build')
  assert.equal(phaseIdFor({ [day]: { sportFlags: [], completed: [] } }, day, '2026-10-05'), 'foundation')
})

test('streak and weekly summary count completed sessions and logged mobility time', () => {
  const monday = '2026-10-05'
  const plan = planFor(monday, ['football'])
  const keys = plan.sections.flatMap(section => section.optional ? [] : section.items.map((item, index) => itemKey(section.name, index, item.exerciseId)))
  const mobility = plan.sections.find(section => section.kind === 'mobility')!
  const mobilityKey = itemKey(mobility.name, 0, mobility.items[0].exerciseId)
  const logs = { [monday]: { sportFlags: ['football' as const], completed: keys, actuals: { [mobilityKey]: { seconds: 120 } } } }
  assert.deepEqual(streaks(logs, monday, '2026-10-06'), { current: 1, longest: 1 })
  const summary = weeklySummary(logs, monday, '2026-10-06')
  assert.equal(summary.sessionsDone, 1)
  assert.equal(summary.scheduled, 2)
  assert.equal(summary.completionPercent, 50)
  assert.ok(summary.stretchMinutes >= 2)
})

test('backup validates results and migrates the original export', () => {
  const old = { '2026-10-05': { sportFlags: ['football'], completed: [] } }
  assert.equal(validateBackup(old, '2026-10-06').startDate, '2026-10-05')
  assert.equal(validateBackup({ version: 2, startDate: '2026-10-05', logs: old }, '2026-10-06').startDate, '2026-10-05')
  assert.throws(() => validateBackup({ version: 2, startDate: '2026-02-30', logs: old }, '2026-10-06'))
  assert.throws(() => validateImport({ '2026-10-05': { sportFlags: [], completed: [], actuals: { x: { reps: -1 } } } }))
})
