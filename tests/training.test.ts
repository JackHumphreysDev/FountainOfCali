import assert from 'node:assert/strict'
import { test } from 'node:test'
import { exerciseById } from '../data/exercises'
import { defaultSports, planFor, programme, sportBlocks } from '../data/programme'
import { effectiveLog, itemKey, progress, validateImport, type DayLog } from '../lib/training'

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
